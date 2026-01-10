package com.vib3.flutter

import android.content.Context
import android.graphics.SurfaceTexture
import android.opengl.*
import android.os.Handler
import android.os.Looper
import android.view.Surface
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.view.TextureRegistry
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.nio.ShortBuffer
import kotlin.math.cos
import kotlin.math.sin

/**
 * VIB3 Flutter Plugin for Android
 *
 * Provides 4D visualization rendering via OpenGL ES 3.0 with texture output to Flutter.
 */
class Vib3FlutterPlugin : FlutterPlugin, MethodCallHandler {
    private lateinit var channel: MethodChannel
    private var textureRegistry: TextureRegistry? = null
    private var textureEntry: TextureRegistry.SurfaceTextureEntry? = null
    private var renderer: Vib3Renderer? = null
    private var context: Context? = null

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel = MethodChannel(binding.binaryMessenger, "com.vib3.engine")
        channel.setMethodCallHandler(this)
        textureRegistry = binding.textureRegistry
        context = binding.applicationContext
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel.setMethodCallHandler(null)
        renderer?.dispose()
        textureEntry?.release()
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "initialize" -> handleInitialize(call, result)
            "dispose" -> handleDispose(result)
            "setSystem" -> handleSetSystem(call, result)
            "setGeometry" -> handleSetGeometry(call, result)
            "rotate" -> handleRotate(call, result)
            "setRotation" -> handleSetRotation(call, result)
            "resetRotation" -> handleResetRotation(result)
            "setVisualParams" -> handleSetVisualParams(call, result)
            "startRendering" -> handleStartRendering(result)
            "stopRendering" -> handleStopRendering(result)
            "captureFrame" -> handleCaptureFrame(result)
            else -> result.notImplemented()
        }
    }

    private fun handleInitialize(call: MethodCall, result: MethodChannel.Result) {
        val args = call.arguments as? Map<*, *> ?: run {
            result.error("INVALID_ARGS", "Invalid arguments", null)
            return
        }

        val system = args["system"] as? String ?: "quantum"
        val geometry = (args["geometry"] as? Number)?.toInt() ?: 0
        val gridDensity = (args["gridDensity"] as? Number)?.toInt() ?: 32

        // Create texture entry
        textureEntry = textureRegistry?.createSurfaceTexture()
        val surfaceTexture = textureEntry?.surfaceTexture()

        if (surfaceTexture == null) {
            result.error("INIT_FAILED", "Failed to create surface texture", null)
            return
        }

        // Create renderer
        renderer = Vib3Renderer(surfaceTexture, 1024, 1024)
        renderer?.setSystem(system)
        renderer?.setGeometry(geometry)
        renderer?.setGridDensity(gridDensity)

        // Set initial rotation if provided
        @Suppress("UNCHECKED_CAST")
        val rotation = args["rotation"] as? Map<String, Double>
        if (rotation != null) {
            renderer?.setRotation(
                xy = rotation["xy"]?.toFloat() ?: 0f,
                xz = rotation["xz"]?.toFloat() ?: 0f,
                yz = rotation["yz"]?.toFloat() ?: 0f,
                xw = rotation["xw"]?.toFloat() ?: 0f,
                yw = rotation["yw"]?.toFloat() ?: 0f,
                zw = rotation["zw"]?.toFloat() ?: 0f
            )
        }

        result.success(mapOf("textureId" to textureEntry?.id()))
    }

    private fun handleDispose(result: MethodChannel.Result) {
        renderer?.dispose()
        renderer = null
        textureEntry?.release()
        textureEntry = null
        result.success(null)
    }

    private fun handleSetSystem(call: MethodCall, result: MethodChannel.Result) {
        val system = call.argument<String>("system") ?: run {
            result.error("INVALID_ARGS", "Missing system", null)
            return
        }
        renderer?.setSystem(system)
        result.success(null)
    }

    private fun handleSetGeometry(call: MethodCall, result: MethodChannel.Result) {
        val index = call.argument<Int>("index") ?: run {
            result.error("INVALID_ARGS", "Missing geometry index", null)
            return
        }
        renderer?.setGeometry(index)
        result.success(null)
    }

    private fun handleRotate(call: MethodCall, result: MethodChannel.Result) {
        val plane = call.argument<String>("plane") ?: run {
            result.error("INVALID_ARGS", "Missing plane", null)
            return
        }
        val angle = call.argument<Double>("angle")?.toFloat() ?: run {
            result.error("INVALID_ARGS", "Missing angle", null)
            return
        }
        renderer?.rotate(plane, angle)
        result.success(null)
    }

    private fun handleSetRotation(call: MethodCall, result: MethodChannel.Result) {
        @Suppress("UNCHECKED_CAST")
        val args = call.arguments as? Map<String, Double> ?: run {
            result.error("INVALID_ARGS", "Invalid rotation", null)
            return
        }
        renderer?.setRotation(
            xy = args["xy"]?.toFloat() ?: 0f,
            xz = args["xz"]?.toFloat() ?: 0f,
            yz = args["yz"]?.toFloat() ?: 0f,
            xw = args["xw"]?.toFloat() ?: 0f,
            yw = args["yw"]?.toFloat() ?: 0f,
            zw = args["zw"]?.toFloat() ?: 0f
        )
        result.success(null)
    }

    private fun handleResetRotation(result: MethodChannel.Result) {
        renderer?.resetRotation()
        result.success(null)
    }

    private fun handleSetVisualParams(call: MethodCall, result: MethodChannel.Result) {
        @Suppress("UNCHECKED_CAST")
        val args = call.arguments as? Map<String, Double> ?: run {
            result.error("INVALID_ARGS", "Invalid params", null)
            return
        }
        args.forEach { (key, value) ->
            renderer?.setVisualParam(key, value.toFloat())
        }
        result.success(null)
    }

    private fun handleStartRendering(result: MethodChannel.Result) {
        renderer?.startRendering()
        result.success(null)
    }

    private fun handleStopRendering(result: MethodChannel.Result) {
        renderer?.stopRendering()
        result.success(null)
    }

    private fun handleCaptureFrame(result: MethodChannel.Result) {
        val frameData = renderer?.captureFrame()
        result.success(frameData)
    }
}

/**
 * OpenGL ES 3.0 Renderer for VIB3 4D Visualization
 */
class Vib3Renderer(
    private val surfaceTexture: SurfaceTexture,
    private val width: Int,
    private val height: Int
) {
    private var eglDisplay: EGLDisplay? = null
    private var eglContext: EGLContext? = null
    private var eglSurface: EGLSurface? = null
    private var surface: Surface? = null

    private var program: Int = 0
    private var vertexBuffer: FloatBuffer? = null
    private var indexBuffer: ShortBuffer? = null

    private var isRendering = false
    private var renderThread: Thread? = null
    private val handler = Handler(Looper.getMainLooper())

    // State
    private var currentSystem = "quantum"
    private var currentGeometry = 0
    private var gridDensity = 32
    private var rotation = floatArrayOf(0f, 0f, 0f, 0f, 0f, 0f)
    private val visualParams = mutableMapOf(
        "morphFactor" to 0.5f,
        "chaos" to 0.0f,
        "speed" to 1.0f,
        "hue" to 200f,
        "intensity" to 0.8f,
        "saturation" to 0.7f
    )

    init {
        surfaceTexture.setDefaultBufferSize(width, height)
        surface = Surface(surfaceTexture)
        initEGL()
        initShaders()
        generateGeometry()
    }

    private fun initEGL() {
        eglDisplay = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
        if (eglDisplay == EGL14.EGL_NO_DISPLAY) {
            throw RuntimeException("Unable to get EGL display")
        }

        val version = IntArray(2)
        if (!EGL14.eglInitialize(eglDisplay, version, 0, version, 1)) {
            throw RuntimeException("Unable to initialize EGL")
        }

        val configAttribs = intArrayOf(
            EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT,
            EGL14.EGL_RED_SIZE, 8,
            EGL14.EGL_GREEN_SIZE, 8,
            EGL14.EGL_BLUE_SIZE, 8,
            EGL14.EGL_ALPHA_SIZE, 8,
            EGL14.EGL_DEPTH_SIZE, 16,
            EGL14.EGL_NONE
        )

        val configs = arrayOfNulls<EGLConfig>(1)
        val numConfigs = IntArray(1)
        EGL14.eglChooseConfig(eglDisplay, configAttribs, 0, configs, 0, 1, numConfigs, 0)

        val contextAttribs = intArrayOf(
            EGL14.EGL_CONTEXT_CLIENT_VERSION, 3,
            EGL14.EGL_NONE
        )
        eglContext = EGL14.eglCreateContext(eglDisplay, configs[0], EGL14.EGL_NO_CONTEXT, contextAttribs, 0)

        val surfaceAttribs = intArrayOf(EGL14.EGL_NONE)
        eglSurface = EGL14.eglCreateWindowSurface(eglDisplay, configs[0], surface, surfaceAttribs, 0)

        EGL14.eglMakeCurrent(eglDisplay, eglSurface, eglSurface, eglContext)
    }

    private fun initShaders() {
        val vertexShaderCode = """
            #version 300 es
            precision highp float;

            layout(location = 0) in vec4 aPosition;
            layout(location = 1) in vec4 aColor;

            uniform mat4 uProjection;
            uniform mat4 uView;
            uniform float uRotation[6];
            uniform float uProjectionDistance;
            uniform float uHue;
            uniform float uSaturation;
            uniform float uIntensity;

            out vec4 vColor;
            out float vDepth;

            // 4D rotation matrices
            vec4 rotateXY(vec4 p, float angle) {
                float c = cos(angle), s = sin(angle);
                return vec4(c*p.x - s*p.y, s*p.x + c*p.y, p.z, p.w);
            }
            vec4 rotateXZ(vec4 p, float angle) {
                float c = cos(angle), s = sin(angle);
                return vec4(c*p.x - s*p.z, p.y, s*p.x + c*p.z, p.w);
            }
            vec4 rotateYZ(vec4 p, float angle) {
                float c = cos(angle), s = sin(angle);
                return vec4(p.x, c*p.y - s*p.z, s*p.y + c*p.z, p.w);
            }
            vec4 rotateXW(vec4 p, float angle) {
                float c = cos(angle), s = sin(angle);
                return vec4(c*p.x - s*p.w, p.y, p.z, s*p.x + c*p.w);
            }
            vec4 rotateYW(vec4 p, float angle) {
                float c = cos(angle), s = sin(angle);
                return vec4(p.x, c*p.y - s*p.w, p.z, s*p.y + c*p.w);
            }
            vec4 rotateZW(vec4 p, float angle) {
                float c = cos(angle), s = sin(angle);
                return vec4(p.x, p.y, c*p.z - s*p.w, s*p.z + c*p.w);
            }

            // 4D to 3D projection
            vec3 project4Dto3D(vec4 p, float d) {
                float scale = d / (d - p.w);
                return vec3(p.xyz * scale);
            }

            // HSV to RGB
            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }

            void main() {
                // Apply 6D rotation
                vec4 rotated = aPosition;
                rotated = rotateXY(rotated, uRotation[0]);
                rotated = rotateXZ(rotated, uRotation[1]);
                rotated = rotateYZ(rotated, uRotation[2]);
                rotated = rotateXW(rotated, uRotation[3]);
                rotated = rotateYW(rotated, uRotation[4]);
                rotated = rotateZW(rotated, uRotation[5]);

                // Project 4D to 3D
                vec3 projected = project4Dto3D(rotated, uProjectionDistance);

                // Apply view/projection
                gl_Position = uProjection * uView * vec4(projected, 1.0);

                // W-based coloring
                float wNorm = (rotated.w + 1.0) * 0.5;
                float hue = uHue / 360.0 + wNorm * 0.3;
                vec3 rgb = hsv2rgb(vec3(hue, uSaturation, uIntensity));

                vColor = vec4(rgb, 1.0);
                vDepth = wNorm;
            }
        """.trimIndent()

        val fragmentShaderCode = """
            #version 300 es
            precision highp float;

            in vec4 vColor;
            in float vDepth;

            out vec4 fragColor;

            void main() {
                // W-fog for depth cue
                float fog = 1.0 - vDepth * 0.3;
                fragColor = vec4(vColor.rgb * fog, vColor.a);
            }
        """.trimIndent()

        val vertexShader = loadShader(GLES30.GL_VERTEX_SHADER, vertexShaderCode)
        val fragmentShader = loadShader(GLES30.GL_FRAGMENT_SHADER, fragmentShaderCode)

        program = GLES30.glCreateProgram()
        GLES30.glAttachShader(program, vertexShader)
        GLES30.glAttachShader(program, fragmentShader)
        GLES30.glLinkProgram(program)

        GLES30.glDeleteShader(vertexShader)
        GLES30.glDeleteShader(fragmentShader)
    }

    private fun loadShader(type: Int, code: String): Int {
        val shader = GLES30.glCreateShader(type)
        GLES30.glShaderSource(shader, code)
        GLES30.glCompileShader(shader)
        return shader
    }

    private fun generateGeometry() {
        // Generate tesseract (4D hypercube) as example
        val vertices = mutableListOf<Float>()
        for (i in 0 until 16) {
            val x = if (i and 1 == 0) -1f else 1f
            val y = if (i and 2 == 0) -1f else 1f
            val z = if (i and 4 == 0) -1f else 1f
            val w = if (i and 8 == 0) -1f else 1f
            // Position
            vertices.addAll(listOf(x, y, z, w))
            // Color (computed in shader)
            vertices.addAll(listOf(1f, 1f, 1f, 1f))
        }

        // 32 edges
        val indices = mutableListOf<Short>()
        for (i in 0 until 16) {
            for (bit in 0 until 4) {
                val j = i xor (1 shl bit)
                if (j > i) {
                    indices.add(i.toShort())
                    indices.add(j.toShort())
                }
            }
        }

        vertexBuffer = ByteBuffer.allocateDirect(vertices.size * 4)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .put(vertices.toFloatArray())
        vertexBuffer?.position(0)

        indexBuffer = ByteBuffer.allocateDirect(indices.size * 2)
            .order(ByteOrder.nativeOrder())
            .asShortBuffer()
            .put(indices.toShortArray())
        indexBuffer?.position(0)
    }

    fun setSystem(system: String) {
        currentSystem = system
        generateGeometry()
    }

    fun setGeometry(index: Int) {
        currentGeometry = index
        generateGeometry()
    }

    fun setGridDensity(density: Int) {
        gridDensity = density
        generateGeometry()
    }

    fun rotate(plane: String, angle: Float) {
        when (plane.lowercase()) {
            "xy" -> rotation[0] = angle
            "xz" -> rotation[1] = angle
            "yz" -> rotation[2] = angle
            "xw" -> rotation[3] = angle
            "yw" -> rotation[4] = angle
            "zw" -> rotation[5] = angle
        }
    }

    fun setRotation(xy: Float, xz: Float, yz: Float, xw: Float, yw: Float, zw: Float) {
        rotation[0] = xy
        rotation[1] = xz
        rotation[2] = yz
        rotation[3] = xw
        rotation[4] = yw
        rotation[5] = zw
    }

    fun resetRotation() {
        rotation.fill(0f)
    }

    fun setVisualParam(name: String, value: Float) {
        visualParams[name] = value
    }

    fun startRendering() {
        if (isRendering) return
        isRendering = true

        renderThread = Thread {
            while (isRendering) {
                render()
                Thread.sleep(16) // ~60 FPS
            }
        }
        renderThread?.start()
    }

    fun stopRendering() {
        isRendering = false
        renderThread?.join()
        renderThread = null
    }

    private fun render() {
        EGL14.eglMakeCurrent(eglDisplay, eglSurface, eglSurface, eglContext)

        GLES30.glViewport(0, 0, width, height)
        GLES30.glClearColor(0f, 0f, 0.1f, 1f)
        GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT or GLES30.GL_DEPTH_BUFFER_BIT)
        GLES30.glEnable(GLES30.GL_DEPTH_TEST)

        GLES30.glUseProgram(program)

        // Set uniforms
        val rotationLoc = GLES30.glGetUniformLocation(program, "uRotation")
        GLES30.glUniform1fv(rotationLoc, 6, rotation, 0)

        val projDistLoc = GLES30.glGetUniformLocation(program, "uProjectionDistance")
        GLES30.glUniform1f(projDistLoc, 2.0f)

        val hueLoc = GLES30.glGetUniformLocation(program, "uHue")
        GLES30.glUniform1f(hueLoc, visualParams["hue"] ?: 200f)

        val satLoc = GLES30.glGetUniformLocation(program, "uSaturation")
        GLES30.glUniform1f(satLoc, visualParams["saturation"] ?: 0.7f)

        val intLoc = GLES30.glGetUniformLocation(program, "uIntensity")
        GLES30.glUniform1f(intLoc, visualParams["intensity"] ?: 0.8f)

        // Set projection matrix (perspective)
        val projection = FloatArray(16)
        Matrix.perspectiveM(projection, 0, 45f, width.toFloat() / height, 0.1f, 100f)
        val projLoc = GLES30.glGetUniformLocation(program, "uProjection")
        GLES30.glUniformMatrix4fv(projLoc, 1, false, projection, 0)

        // Set view matrix
        val view = FloatArray(16)
        Matrix.setLookAtM(view, 0, 0f, 0f, 5f, 0f, 0f, 0f, 0f, 1f, 0f)
        val viewLoc = GLES30.glGetUniformLocation(program, "uView")
        GLES30.glUniformMatrix4fv(viewLoc, 1, false, view, 0)

        // Draw geometry
        vertexBuffer?.let { vb ->
            val posLoc = GLES30.glGetAttribLocation(program, "aPosition")
            GLES30.glEnableVertexAttribArray(posLoc)
            vb.position(0)
            GLES30.glVertexAttribPointer(posLoc, 4, GLES30.GL_FLOAT, false, 32, vb)

            val colLoc = GLES30.glGetAttribLocation(program, "aColor")
            GLES30.glEnableVertexAttribArray(colLoc)
            vb.position(4)
            GLES30.glVertexAttribPointer(colLoc, 4, GLES30.GL_FLOAT, false, 32, vb)

            indexBuffer?.let { ib ->
                GLES30.glDrawElements(GLES30.GL_LINES, 64, GLES30.GL_UNSIGNED_SHORT, ib)
            }

            GLES30.glDisableVertexAttribArray(posLoc)
            GLES30.glDisableVertexAttribArray(colLoc)
        }

        EGL14.eglSwapBuffers(eglDisplay, eglSurface)
    }

    fun captureFrame(): ByteArray? {
        val buffer = ByteBuffer.allocateDirect(width * height * 4)
        buffer.order(ByteOrder.nativeOrder())

        EGL14.eglMakeCurrent(eglDisplay, eglSurface, eglSurface, eglContext)
        GLES30.glReadPixels(0, 0, width, height, GLES30.GL_RGBA, GLES30.GL_UNSIGNED_BYTE, buffer)

        return buffer.array()
    }

    fun dispose() {
        stopRendering()

        if (eglDisplay != EGL14.EGL_NO_DISPLAY) {
            EGL14.eglMakeCurrent(eglDisplay, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT)
            EGL14.eglDestroySurface(eglDisplay, eglSurface)
            EGL14.eglDestroyContext(eglDisplay, eglContext)
            EGL14.eglTerminate(eglDisplay)
        }

        surface?.release()
        eglDisplay = EGL14.EGL_NO_DISPLAY
        eglContext = EGL14.EGL_NO_CONTEXT
        eglSurface = EGL14.EGL_NO_SURFACE
    }
}
