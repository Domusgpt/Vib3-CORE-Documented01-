import Flutter
import UIKit
import Metal
import MetalKit

/// VIB3 Flutter Plugin for iOS
public class Vib3FlutterPlugin: NSObject, FlutterPlugin {
    private var registrar: FlutterPluginRegistrar?
    private var renderer: Vib3MetalRenderer?
    private var textureRegistry: FlutterTextureRegistry?
    private var textureId: Int64?

    public static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(name: "com.vib3.engine", binaryMessenger: registrar.messenger())
        let instance = Vib3FlutterPlugin()
        instance.registrar = registrar
        instance.textureRegistry = registrar.textures()
        registrar.addMethodCallDelegate(instance, channel: channel)
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "initialize":
            handleInitialize(call, result: result)
        case "dispose":
            handleDispose(result: result)
        case "setSystem":
            handleSetSystem(call, result: result)
        case "setGeometry":
            handleSetGeometry(call, result: result)
        case "rotate":
            handleRotate(call, result: result)
        case "setRotation":
            handleSetRotation(call, result: result)
        case "resetRotation":
            handleResetRotation(result: result)
        case "setVisualParams":
            handleSetVisualParams(call, result: result)
        case "startRendering":
            handleStartRendering(result: result)
        case "stopRendering":
            handleStopRendering(result: result)
        case "captureFrame":
            handleCaptureFrame(result: result)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    private func handleInitialize(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any] else {
            result(FlutterError(code: "INVALID_ARGS", message: "Invalid arguments", details: nil))
            return
        }

        let system = args["system"] as? String ?? "quantum"
        let geometry = args["geometry"] as? Int ?? 0
        let gridDensity = args["gridDensity"] as? Int ?? 32

        // Create Metal renderer
        renderer = Vib3MetalRenderer()

        guard let renderer = renderer else {
            result(FlutterError(code: "INIT_FAILED", message: "Failed to create renderer", details: nil))
            return
        }

        // Register texture with Flutter
        textureId = textureRegistry?.register(renderer)

        // Configure renderer
        renderer.setSystem(system)
        renderer.setGeometry(geometry)
        renderer.setGridDensity(gridDensity)

        if let rotation = args["rotation"] as? [String: Double] {
            renderer.setRotation(
                xy: Float(rotation["xy"] ?? 0),
                xz: Float(rotation["xz"] ?? 0),
                yz: Float(rotation["yz"] ?? 0),
                xw: Float(rotation["xw"] ?? 0),
                yw: Float(rotation["yw"] ?? 0),
                zw: Float(rotation["zw"] ?? 0)
            )
        }

        result(["textureId": textureId ?? -1])
    }

    private func handleDispose(result: @escaping FlutterResult) {
        if let textureId = textureId {
            textureRegistry?.unregisterTexture(textureId)
        }
        renderer?.dispose()
        renderer = nil
        textureId = nil
        result(nil)
    }

    private func handleSetSystem(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any],
              let system = args["system"] as? String else {
            result(FlutterError(code: "INVALID_ARGS", message: "Missing system", details: nil))
            return
        }
        renderer?.setSystem(system)
        result(nil)
    }

    private func handleSetGeometry(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any],
              let index = args["index"] as? Int else {
            result(FlutterError(code: "INVALID_ARGS", message: "Missing geometry index", details: nil))
            return
        }
        renderer?.setGeometry(index)
        result(nil)
    }

    private func handleRotate(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any],
              let plane = args["plane"] as? String,
              let angle = args["angle"] as? Double else {
            result(FlutterError(code: "INVALID_ARGS", message: "Missing rotation params", details: nil))
            return
        }
        renderer?.rotate(plane: plane, angle: Float(angle))
        result(nil)
    }

    private func handleSetRotation(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Double] else {
            result(FlutterError(code: "INVALID_ARGS", message: "Invalid rotation", details: nil))
            return
        }
        renderer?.setRotation(
            xy: Float(args["xy"] ?? 0),
            xz: Float(args["xz"] ?? 0),
            yz: Float(args["yz"] ?? 0),
            xw: Float(args["xw"] ?? 0),
            yw: Float(args["yw"] ?? 0),
            zw: Float(args["zw"] ?? 0)
        )
        result(nil)
    }

    private func handleResetRotation(result: @escaping FlutterResult) {
        renderer?.resetRotation()
        result(nil)
    }

    private func handleSetVisualParams(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Double] else {
            result(FlutterError(code: "INVALID_ARGS", message: "Invalid params", details: nil))
            return
        }
        for (key, value) in args {
            renderer?.setVisualParam(key, value: Float(value))
        }
        result(nil)
    }

    private func handleStartRendering(result: @escaping FlutterResult) {
        renderer?.startRendering()
        result(nil)
    }

    private func handleStopRendering(result: @escaping FlutterResult) {
        renderer?.stopRendering()
        result(nil)
    }

    private func handleCaptureFrame(result: @escaping FlutterResult) {
        if let imageData = renderer?.captureFrame() {
            result(FlutterStandardTypedData(bytes: imageData))
        } else {
            result(nil)
        }
    }
}

/// Metal Renderer for VIB3 4D Visualization
class Vib3MetalRenderer: NSObject, FlutterTexture {
    private var device: MTLDevice?
    private var commandQueue: MTLCommandQueue?
    private var pipelineState: MTLRenderPipelineState?
    private var texture: MTLTexture?
    private var depthTexture: MTLTexture?
    private var vertexBuffer: MTLBuffer?
    private var indexBuffer: MTLBuffer?
    private var uniformBuffer: MTLBuffer?

    private var displayLink: CADisplayLink?
    private var isRendering = false

    // State
    private var currentSystem = "quantum"
    private var currentGeometry = 0
    private var gridDensity = 32
    private var rotation = simd_float6(0, 0, 0, 0, 0, 0)
    private var visualParams: [String: Float] = [
        "morphFactor": 0.5,
        "chaos": 0.0,
        "speed": 1.0,
        "hue": 200,
        "intensity": 0.8,
        "saturation": 0.7
    ]

    private let textureWidth = 1024
    private let textureHeight = 1024

    override init() {
        super.init()
        setupMetal()
    }

    private func setupMetal() {
        device = MTLCreateSystemDefaultDevice()
        guard let device = device else {
            print("VIB3: Metal not available")
            return
        }

        commandQueue = device.makeCommandQueue()

        // Create texture for Flutter
        let textureDescriptor = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: .bgra8Unorm,
            width: textureWidth,
            height: textureHeight,
            mipmapped: false
        )
        textureDescriptor.usage = [.renderTarget, .shaderRead]
        texture = device.makeTexture(descriptor: textureDescriptor)

        // Create depth texture
        let depthDescriptor = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: .depth32Float,
            width: textureWidth,
            height: textureHeight,
            mipmapped: false
        )
        depthDescriptor.usage = .renderTarget
        depthDescriptor.storageMode = .private
        depthTexture = device.makeTexture(descriptor: depthDescriptor)

        // Setup render pipeline
        setupPipeline()

        // Generate initial geometry
        generateGeometry()
    }

    private func setupPipeline() {
        guard let device = device else { return }

        // Shader source
        let shaderSource = """
        #include <metal_stdlib>
        using namespace metal;

        // 4D rotation matrices
        float4x4 rotationXY(float angle) {
            float c = cos(angle), s = sin(angle);
            return float4x4(
                float4(c, -s, 0, 0),
                float4(s,  c, 0, 0),
                float4(0,  0, 1, 0),
                float4(0,  0, 0, 1)
            );
        }

        float4x4 rotationXZ(float angle) {
            float c = cos(angle), s = sin(angle);
            return float4x4(
                float4(c, 0, -s, 0),
                float4(0, 1,  0, 0),
                float4(s, 0,  c, 0),
                float4(0, 0,  0, 1)
            );
        }

        float4x4 rotationYZ(float angle) {
            float c = cos(angle), s = sin(angle);
            return float4x4(
                float4(1, 0,  0, 0),
                float4(0, c, -s, 0),
                float4(0, s,  c, 0),
                float4(0, 0,  0, 1)
            );
        }

        float4x4 rotationXW(float angle) {
            float c = cos(angle), s = sin(angle);
            return float4x4(
                float4(c, 0, 0, -s),
                float4(0, 1, 0,  0),
                float4(0, 0, 1,  0),
                float4(s, 0, 0,  c)
            );
        }

        float4x4 rotationYW(float angle) {
            float c = cos(angle), s = sin(angle);
            return float4x4(
                float4(1, 0, 0,  0),
                float4(0, c, 0, -s),
                float4(0, 0, 1,  0),
                float4(0, s, 0,  c)
            );
        }

        float4x4 rotationZW(float angle) {
            float c = cos(angle), s = sin(angle);
            return float4x4(
                float4(1, 0, 0,  0),
                float4(0, 1, 0,  0),
                float4(0, 0, c, -s),
                float4(0, 0, s,  c)
            );
        }

        // Uniforms
        struct Uniforms {
            float4x4 projection;
            float4x4 view;
            float6 rotation;
            float projectionDistance;
            float hue;
            float intensity;
            float saturation;
            float morphFactor;
        };

        struct VertexIn {
            float4 position [[attribute(0)]];
            float4 color [[attribute(1)]];
        };

        struct VertexOut {
            float4 position [[position]];
            float4 color;
            float depth;
        };

        // 4D to 3D projection
        float3 project4Dto3D(float4 p, float d) {
            float scale = d / (d - p.w);
            return float3(p.x * scale, p.y * scale, p.z * scale);
        }

        // HSV to RGB
        float3 hsv2rgb(float3 c) {
            float4 K = float4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
            float3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        vertex VertexOut vertexShader(
            VertexIn in [[stage_in]],
            constant Uniforms& uniforms [[buffer(1)]]
        ) {
            // Apply 6D rotation
            float4 rotated = in.position;
            rotated = rotationXY(uniforms.rotation[0]) * rotated;
            rotated = rotationXZ(uniforms.rotation[1]) * rotated;
            rotated = rotationYZ(uniforms.rotation[2]) * rotated;
            rotated = rotationXW(uniforms.rotation[3]) * rotated;
            rotated = rotationYW(uniforms.rotation[4]) * rotated;
            rotated = rotationZW(uniforms.rotation[5]) * rotated;

            // Project 4D to 3D
            float3 projected = project4Dto3D(rotated, uniforms.projectionDistance);

            // Apply view/projection
            float4 viewPos = uniforms.view * float4(projected, 1.0);
            float4 clipPos = uniforms.projection * viewPos;

            // W-based coloring
            float wNorm = (rotated.w + 1.0) * 0.5;
            float hue = uniforms.hue / 360.0 + wNorm * 0.3;
            float3 rgb = hsv2rgb(float3(hue, uniforms.saturation, uniforms.intensity));

            VertexOut out;
            out.position = clipPos;
            out.color = float4(rgb, 1.0);
            out.depth = wNorm;
            return out;
        }

        fragment float4 fragmentShader(VertexOut in [[stage_in]]) {
            // Apply W-fog for depth cue
            float fog = 1.0 - in.depth * 0.3;
            return float4(in.color.rgb * fog, in.color.a);
        }
        """

        do {
            let library = try device.makeLibrary(source: shaderSource, options: nil)
            let vertexFunction = library.makeFunction(name: "vertexShader")
            let fragmentFunction = library.makeFunction(name: "fragmentShader")

            let pipelineDescriptor = MTLRenderPipelineDescriptor()
            pipelineDescriptor.vertexFunction = vertexFunction
            pipelineDescriptor.fragmentFunction = fragmentFunction
            pipelineDescriptor.colorAttachments[0].pixelFormat = .bgra8Unorm
            pipelineDescriptor.depthAttachmentPixelFormat = .depth32Float

            // Vertex descriptor
            let vertexDescriptor = MTLVertexDescriptor()
            vertexDescriptor.attributes[0].format = .float4
            vertexDescriptor.attributes[0].offset = 0
            vertexDescriptor.attributes[0].bufferIndex = 0
            vertexDescriptor.attributes[1].format = .float4
            vertexDescriptor.attributes[1].offset = 16
            vertexDescriptor.attributes[1].bufferIndex = 0
            vertexDescriptor.layouts[0].stride = 32

            pipelineDescriptor.vertexDescriptor = vertexDescriptor

            pipelineState = try device.makeRenderPipelineState(descriptor: pipelineDescriptor)
        } catch {
            print("VIB3: Failed to create pipeline: \(error)")
        }
    }

    private func generateGeometry() {
        // Generate geometry based on current settings
        // This would call into the native VIB3 library
        // For now, generate a simple tesseract (4D hypercube)

        // 16 vertices of a tesseract
        var vertices: [Float] = []
        for i in 0..<16 {
            let x: Float = (i & 1) == 0 ? -1 : 1
            let y: Float = (i & 2) == 0 ? -1 : 1
            let z: Float = (i & 4) == 0 ? -1 : 1
            let w: Float = (i & 8) == 0 ? -1 : 1

            // Position (x, y, z, w)
            vertices.append(contentsOf: [x, y, z, w])
            // Color (will be computed in shader)
            vertices.append(contentsOf: [1, 1, 1, 1])
        }

        // 32 edges of a tesseract
        var indices: [UInt16] = []
        for i in 0..<16 {
            for bit in 0..<4 {
                let j = i ^ (1 << bit)
                if j > i {
                    indices.append(UInt16(i))
                    indices.append(UInt16(j))
                }
            }
        }

        vertexBuffer = device?.makeBuffer(
            bytes: vertices,
            length: vertices.count * MemoryLayout<Float>.size,
            options: []
        )

        indexBuffer = device?.makeBuffer(
            bytes: indices,
            length: indices.count * MemoryLayout<UInt16>.size,
            options: []
        )

        // Create uniform buffer
        uniformBuffer = device?.makeBuffer(length: 256, options: [])
    }

    func setSystem(_ system: String) {
        currentSystem = system
        generateGeometry()
    }

    func setGeometry(_ index: Int) {
        currentGeometry = index
        generateGeometry()
    }

    func setGridDensity(_ density: Int) {
        gridDensity = density
        generateGeometry()
    }

    func rotate(plane: String, angle: Float) {
        switch plane.lowercased() {
        case "xy": rotation[0] = angle
        case "xz": rotation[1] = angle
        case "yz": rotation[2] = angle
        case "xw": rotation[3] = angle
        case "yw": rotation[4] = angle
        case "zw": rotation[5] = angle
        default: break
        }
    }

    func setRotation(xy: Float, xz: Float, yz: Float, xw: Float, yw: Float, zw: Float) {
        rotation = simd_float6(xy, xz, yz, xw, yw, zw)
    }

    func resetRotation() {
        rotation = simd_float6(0, 0, 0, 0, 0, 0)
    }

    func setVisualParam(_ name: String, value: Float) {
        visualParams[name] = value
    }

    func startRendering() {
        guard !isRendering else { return }
        isRendering = true
        displayLink = CADisplayLink(target: self, selector: #selector(render))
        displayLink?.add(to: .main, forMode: .common)
    }

    func stopRendering() {
        isRendering = false
        displayLink?.invalidate()
        displayLink = nil
    }

    @objc private func render() {
        guard let commandBuffer = commandQueue?.makeCommandBuffer(),
              let texture = texture,
              let depthTexture = depthTexture,
              let pipelineState = pipelineState else { return }

        // Render pass descriptor
        let renderPassDescriptor = MTLRenderPassDescriptor()
        renderPassDescriptor.colorAttachments[0].texture = texture
        renderPassDescriptor.colorAttachments[0].loadAction = .clear
        renderPassDescriptor.colorAttachments[0].storeAction = .store
        renderPassDescriptor.colorAttachments[0].clearColor = MTLClearColor(red: 0, green: 0, blue: 0.1, alpha: 1)
        renderPassDescriptor.depthAttachment.texture = depthTexture
        renderPassDescriptor.depthAttachment.loadAction = .clear
        renderPassDescriptor.depthAttachment.storeAction = .dontCare
        renderPassDescriptor.depthAttachment.clearDepth = 1.0

        guard let encoder = commandBuffer.makeRenderCommandEncoder(descriptor: renderPassDescriptor) else { return }

        encoder.setRenderPipelineState(pipelineState)
        encoder.setVertexBuffer(vertexBuffer, offset: 0, index: 0)
        encoder.setVertexBuffer(uniformBuffer, offset: 0, index: 1)

        // Update uniforms
        updateUniforms()

        // Draw
        if let indexBuffer = indexBuffer {
            encoder.drawIndexedPrimitives(
                type: .line,
                indexCount: 64, // 32 edges * 2 vertices
                indexType: .uint16,
                indexBuffer: indexBuffer,
                indexBufferOffset: 0
            )
        }

        encoder.endEncoding()
        commandBuffer.commit()
    }

    private func updateUniforms() {
        // Update uniform buffer with current state
        // This would copy rotation, visual params, projection matrices
    }

    func captureFrame() -> Data? {
        guard let texture = texture else { return nil }

        let bytesPerRow = textureWidth * 4
        let imageSize = bytesPerRow * textureHeight
        var imageData = Data(count: imageSize)

        imageData.withUnsafeMutableBytes { ptr in
            texture.getBytes(
                ptr.baseAddress!,
                bytesPerRow: bytesPerRow,
                from: MTLRegion(
                    origin: MTLOrigin(x: 0, y: 0, z: 0),
                    size: MTLSize(width: textureWidth, height: textureHeight, depth: 1)
                ),
                mipmapLevel: 0
            )
        }

        return imageData
    }

    func dispose() {
        stopRendering()
        texture = nil
        depthTexture = nil
        vertexBuffer = nil
        indexBuffer = nil
        uniformBuffer = nil
        pipelineState = nil
        commandQueue = nil
        device = nil
    }

    // FlutterTexture protocol
    func copyPixelBuffer() -> Unmanaged<CVPixelBuffer>? {
        // For production, implement proper CVPixelBuffer creation
        // This is a placeholder
        return nil
    }
}

// Helper for simd_float6 (not built-in)
typealias simd_float6 = (Float, Float, Float, Float, Float, Float)
