/**
 * ExclusionPipeline - Multipass Ping-Pong Rendering for Exclusion Blending
 *
 * Implements the "Arithmetic of Light" requirement from the HHC specification.
 * The mix-blend-mode: exclusion visual effect cannot be achieved with standard
 * WebGL/WebGPU fixed-function blending hardware.
 *
 * Solution: Multipass Ping-Pong Architecture
 * - Two off-screen framebuffers (Texture A & Texture B)
 * - Each layer rendered as a separate pass
 * - Fragment shader implements exclusion blend: Src + Dst - 2*Src*Dst
 * - Textures swap roles between passes
 *
 * This creates the sharp-edged, volumetric "Z-Worm" extrusions required
 * for the Moiré interference patterns.
 *
 * @module holograms/kirigami/ExclusionPipeline
 */

/**
 * ExclusionPipeline - WebGL2 implementation of multipass exclusion blending
 */
export class ExclusionPipeline {
    /**
     * Create the exclusion rendering pipeline
     *
     * @param {WebGL2RenderingContext} gl - WebGL2 context
     * @param {Object} options - Configuration
     */
    constructor(gl, options = {}) {
        this.gl = gl;
        this.width = options.width || gl.canvas.width;
        this.height = options.height || gl.canvas.height;

        // Ping-pong framebuffers
        this.framebufferA = null;
        this.framebufferB = null;
        this.textureA = null;
        this.textureB = null;

        // Current read/write targets
        this.readBuffer = null;
        this.writeBuffer = null;
        this.readTexture = null;
        this.writeTexture = null;

        // Shader programs
        this.kirigamiProgram = null;
        this.blitProgram = null;

        // Geometry buffers
        this.quadVAO = null;
        this.polytopeVAO = null;

        // Initialize
        this.initFramebuffers();
        this.initShaders();
        this.initGeometry();
    }

    /**
     * Initialize ping-pong framebuffers
     */
    initFramebuffers() {
        const gl = this.gl;

        // Create Framebuffer A
        this.framebufferA = gl.createFramebuffer();
        this.textureA = this.createRenderTexture();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferA);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textureA, 0);

        // Create Framebuffer B
        this.framebufferB = gl.createFramebuffer();
        this.textureB = this.createRenderTexture();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferB);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textureB, 0);

        // Check framebuffer status
        const statusA = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (statusA !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer A incomplete:', statusA);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Set initial read/write
        this.readBuffer = this.framebufferA;
        this.writeBuffer = this.framebufferB;
        this.readTexture = this.textureA;
        this.writeTexture = this.textureB;
    }

    /**
     * Create a render texture for framebuffer attachment
     *
     * @returns {WebGLTexture}
     */
    createRenderTexture() {
        const gl = this.gl;
        const texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA,
            this.width, this.height, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null
        );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        return texture;
    }

    /**
     * Initialize shader programs
     */
    initShaders() {
        this.kirigamiProgram = this.createKirigamiProgram();
        this.blitProgram = this.createBlitProgram();
    }

    /**
     * Create the main kirigami rendering program with exclusion blend
     *
     * @returns {WebGLProgram}
     */
    createKirigamiProgram() {
        const vertexSource = `#version 300 es
            precision highp float;

            // Vertex attributes
            in vec4 a_position;  // 4D vertex position

            // Uniforms
            uniform mat4 u_viewProj;        // View-projection matrix
            uniform mat4 u_rotationLeft;    // Left isoclinic rotation
            uniform mat4 u_rotationRight;   // Right isoclinic rotation
            uniform float u_scale;          // Kirigami scale (0, 0.5, 1)
            uniform float u_zOffset;        // Z-worm extrusion
            uniform float u_dimension;      // 4D projection parameter (3.0-4.5)
            uniform vec4 u_color;           // Layer color

            // Outputs
            out vec4 v_color;
            out vec2 v_uv;
            out float v_depth;

            void main() {
                // 1. Apply left isoclinic rotation
                vec4 pos = u_rotationLeft * a_position;

                // 2. Apply right isoclinic rotation (transpose for inverse)
                pos = u_rotationRight * pos;

                // 3. Apply kirigami scaling
                pos *= u_scale;

                // 4. 4D to 3D stereographic projection
                float w_factor = 1.0 / (u_dimension - pos.w);
                vec3 pos3 = pos.xyz * w_factor;

                // 5. Z-worm extrusion
                pos3.z += u_zOffset;

                // 6. Apply view-projection
                gl_Position = u_viewProj * vec4(pos3, 1.0);

                // Pass to fragment shader
                v_color = u_color;
                v_uv = gl_Position.xy * 0.5 + 0.5;
                v_depth = pos.w; // Use W for depth-based effects

                // Point size for vertex rendering
                gl_PointSize = 8.0 * u_scale;
            }
        `;

        const fragmentSource = `#version 300 es
            precision highp float;

            // Inputs
            in vec4 v_color;
            in vec2 v_uv;
            in float v_depth;

            // Background texture (previous pass result)
            uniform sampler2D u_background;

            // Output
            out vec4 fragColor;

            void main() {
                // Sample background (destination)
                vec4 dst = texture(u_background, v_uv);

                // Source color
                vec4 src = v_color;

                // Exclusion blend: Src + Dst - 2*Src*Dst
                vec3 exclusion = src.rgb + dst.rgb - 2.0 * src.rgb * dst.rgb;

                // Apply alpha
                float alpha = src.a;
                vec3 result = mix(dst.rgb, exclusion, alpha);

                fragColor = vec4(result, 1.0);
            }
        `;

        return this.compileProgram(vertexSource, fragmentSource);
    }

    /**
     * Create blit program for final output
     *
     * @returns {WebGLProgram}
     */
    createBlitProgram() {
        const vertexSource = `#version 300 es
            precision highp float;

            in vec2 a_position;
            out vec2 v_uv;

            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_uv = a_position * 0.5 + 0.5;
            }
        `;

        const fragmentSource = `#version 300 es
            precision highp float;

            in vec2 v_uv;
            uniform sampler2D u_texture;
            out vec4 fragColor;

            void main() {
                fragColor = texture(u_texture, v_uv);
            }
        `;

        return this.compileProgram(vertexSource, fragmentSource);
    }

    /**
     * Compile a shader program
     *
     * @param {string} vertexSource - Vertex shader source
     * @param {string} fragmentSource - Fragment shader source
     * @returns {WebGLProgram}
     */
    compileProgram(vertexSource, fragmentSource) {
        const gl = this.gl;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
            return null;
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
            return null;
        }

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
        }

        // Clean up shaders
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return program;
    }

    /**
     * Initialize geometry buffers
     */
    initGeometry() {
        const gl = this.gl;

        // Full-screen quad for blitting
        this.quadVAO = gl.createVertexArray();
        gl.bindVertexArray(this.quadVAO);

        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  1, -1,  -1, 1,
            -1, 1,   1, -1,   1, 1
        ]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(this.blitProgram, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
    }

    /**
     * Create VAO for a layer's geometry
     *
     * @param {Float32Array} vertices - 4D vertices (x,y,z,w per vertex)
     * @returns {WebGLVertexArrayObject}
     */
    createLayerVAO(vertices) {
        const gl = this.gl;

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

        const posLoc = gl.getAttribLocation(this.kirigamiProgram, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 4, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);

        return { vao, buffer, vertexCount: vertices.length / 4 };
    }

    /**
     * Swap ping-pong buffers
     */
    swapBuffers() {
        const tempBuffer = this.readBuffer;
        const tempTexture = this.readTexture;

        this.readBuffer = this.writeBuffer;
        this.readTexture = this.writeTexture;
        this.writeBuffer = tempBuffer;
        this.writeTexture = tempTexture;
    }

    /**
     * Clear both framebuffers
     *
     * @param {number[]} clearColor - RGBA clear color (0-1 range)
     */
    clear(clearColor = [0, 0, 0, 1]) {
        const gl = this.gl;

        gl.clearColor(...clearColor);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferA);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferB);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /**
     * Render a single layer with exclusion blending
     *
     * @param {Object} layerData - Layer render data from KirigamiLayer
     * @param {Object} uniforms - Additional uniforms (viewProj, dimension)
     */
    renderLayer(layerData, uniforms) {
        const gl = this.gl;

        // Bind write framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.writeBuffer);
        gl.viewport(0, 0, this.width, this.height);

        // Use kirigami program
        gl.useProgram(this.kirigamiProgram);

        // Bind read texture as background
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.readTexture);
        gl.uniform1i(gl.getUniformLocation(this.kirigamiProgram, 'u_background'), 0);

        // Set uniforms
        const viewProjLoc = gl.getUniformLocation(this.kirigamiProgram, 'u_viewProj');
        gl.uniformMatrix4fv(viewProjLoc, false, uniforms.viewProj);

        const rotLeftLoc = gl.getUniformLocation(this.kirigamiProgram, 'u_rotationLeft');
        gl.uniformMatrix4fv(rotLeftLoc, false, layerData.rotationMatrix);

        const rotRightLoc = gl.getUniformLocation(this.kirigamiProgram, 'u_rotationRight');
        gl.uniformMatrix4fv(rotRightLoc, false, layerData.rightRotationMatrix);

        const scaleLoc = gl.getUniformLocation(this.kirigamiProgram, 'u_scale');
        gl.uniform1f(scaleLoc, layerData.scale);

        const zOffsetLoc = gl.getUniformLocation(this.kirigamiProgram, 'u_zOffset');
        gl.uniform1f(zOffsetLoc, layerData.zOffset);

        const dimensionLoc = gl.getUniformLocation(this.kirigamiProgram, 'u_dimension');
        gl.uniform1f(dimensionLoc, uniforms.dimension || 4.0);

        const colorLoc = gl.getUniformLocation(this.kirigamiProgram, 'u_color');
        gl.uniform4f(colorLoc,
            layerData.color[0] / 255,
            layerData.color[1] / 255,
            layerData.color[2] / 255,
            1.0
        );

        // Render the layer's geometry
        if (layerData.vao) {
            gl.bindVertexArray(layerData.vao);
            gl.drawArrays(gl.POINTS, 0, layerData.vertexCount);
            gl.bindVertexArray(null);
        }

        // Swap buffers for next layer
        this.swapBuffers();
    }

    /**
     * Render all layers with exclusion blending
     *
     * @param {Object[]} layers - Array of layer render data
     * @param {Object} uniforms - Global uniforms
     */
    renderAllLayers(layers, uniforms) {
        // Clear both buffers
        this.clear([0, 0, 0, 1]);

        // Render each layer
        for (const layerData of layers) {
            this.renderLayer(layerData, uniforms);
        }
    }

    /**
     * Blit final result to screen
     */
    blitToScreen() {
        const gl = this.gl;

        // Bind default framebuffer (screen)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);

        // Use blit program
        gl.useProgram(this.blitProgram);

        // Bind the read texture (final result)
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.readTexture);
        gl.uniform1i(gl.getUniformLocation(this.blitProgram, 'u_texture'), 0);

        // Draw full-screen quad
        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
    }

    /**
     * Handle resize
     *
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        this.width = width;
        this.height = height;

        // Recreate textures at new size
        const gl = this.gl;

        gl.bindTexture(gl.TEXTURE_2D, this.textureA);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.bindTexture(gl.TEXTURE_2D, this.textureB);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    /**
     * Dispose of GPU resources
     */
    destroy() {
        const gl = this.gl;

        if (this.framebufferA) gl.deleteFramebuffer(this.framebufferA);
        if (this.framebufferB) gl.deleteFramebuffer(this.framebufferB);
        if (this.textureA) gl.deleteTexture(this.textureA);
        if (this.textureB) gl.deleteTexture(this.textureB);
        if (this.kirigamiProgram) gl.deleteProgram(this.kirigamiProgram);
        if (this.blitProgram) gl.deleteProgram(this.blitProgram);
        if (this.quadVAO) gl.deleteVertexArray(this.quadVAO);

        this.gl = null;
    }
}

export default ExclusionPipeline;
