/**
 * UnifiedRenderBridge - Connects VIB3+ visualization systems to WebGL/WebGPU backends.
 *
 * All three VIB3+ visualization systems (Quantum, Faceted, Holographic) use the same
 * rendering pattern: procedural fragment shaders on a fullscreen quad. This bridge
 * abstracts that pattern so systems can render identically on either backend.
 *
 * Usage:
 *   const bridge = await UnifiedRenderBridge.create(canvas, { preferWebGPU: true });
 *   bridge.compileShader('faceted', vertexSrc, fragmentSrc);
 *   bridge.setUniforms({ u_time: 1.5, u_resolution: [800, 600], ... });
 *   bridge.render('faceted');
 *   bridge.dispose();
 */

import { createWebGPUBackend, isWebGPUSupported, WGSLShaderLib } from './backends/WebGPUBackend.js';

/** @typedef {'webgl'|'webgpu'} BackendType */

/**
 * Packs VIB3+ parameters into a Float32Array for WebGPU uniform buffer.
 * Layout must match VIB3Uniforms struct in WGSL.
 *
 * @param {object} uniforms - Uniform name→value map
 * @returns {Float32Array}
 */
function packVIB3Uniforms(uniforms) {
    // Total: 32 floats = 128 bytes → aligned to 256 bytes in buffer
    const data = new Float32Array(64); // 256 bytes

    data[0] = uniforms.u_time || 0;
    data[1] = 0; // _pad0
    data[2] = uniforms.u_resolution?.[0] || 800;
    data[3] = uniforms.u_resolution?.[1] || 600;

    data[4] = uniforms.u_geometry || 0;
    data[5] = uniforms.u_rot4dXY || 0;
    data[6] = uniforms.u_rot4dXZ || 0;
    data[7] = uniforms.u_rot4dYZ || 0;
    data[8] = uniforms.u_rot4dXW || 0;
    data[9] = uniforms.u_rot4dYW || 0;
    data[10] = uniforms.u_rot4dZW || 0;

    data[11] = uniforms.u_dimension || 3.5;
    data[12] = uniforms.u_gridDensity || 1.5;
    data[13] = uniforms.u_morphFactor || 1.0;
    data[14] = uniforms.u_chaos || 0.2;
    data[15] = uniforms.u_speed || 1.0;
    data[16] = uniforms.u_hue || 200;
    data[17] = uniforms.u_intensity || 0.7;
    data[18] = uniforms.u_saturation || 0.8;

    data[19] = uniforms.u_mouseIntensity || 0;
    data[20] = uniforms.u_clickIntensity || 0;
    data[21] = uniforms.u_bass || 0;
    data[22] = uniforms.u_mid || 0;
    data[23] = uniforms.u_high || 0;

    data[24] = uniforms.u_layerScale || 1.0;
    data[25] = uniforms.u_layerOpacity || 1.0;
    data[26] = 0; // _pad1
    data[27] = uniforms.u_layerColor?.[0] || 1.0;
    data[28] = uniforms.u_layerColor?.[1] || 1.0;
    data[29] = uniforms.u_layerColor?.[2] || 1.0;
    data[30] = uniforms.u_densityMult || 1.0;
    data[31] = uniforms.u_speedMult || 1.0;
    // [32..63] padding to 256

    return data;
}

export class UnifiedRenderBridge {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {BackendType} backendType
     * @param {object} backend - WebGLBackend-like or WebGPUBackend instance
     */
    constructor(canvas, backendType, backend) {
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;

        /** @type {BackendType} */
        this.backendType = backendType;

        /** @type {object} */
        this.backend = backend;

        // ---- WebGL state ----
        /** @type {Map<string, {program: WebGLProgram, uniformLocations: Map<string, WebGLUniformLocation>}>} */
        this._glPrograms = new Map();

        /** @type {WebGLBuffer|null} */
        this._glQuadBuffer = null;

        // ---- WebGPU state ----
        /** @type {Map<string, string>} pipeline name → buffer name */
        this._gpuPipelineBuffers = new Map();

        // ---- Shared state ----
        /** @type {Map<string, object>} */
        this._currentUniforms = new Map();

        this._initialized = false;
    }

    /**
     * Create a UnifiedRenderBridge with automatic backend selection.
     *
     * @param {HTMLCanvasElement} canvas - Target canvas element
     * @param {object} [options]
     * @param {boolean} [options.preferWebGPU=true] - Try WebGPU first
     * @param {boolean} [options.debug=false] - Enable debug logging
     * @returns {Promise<UnifiedRenderBridge>}
     */
    static async create(canvas, options = {}) {
        const preferWebGPU = options.preferWebGPU !== false;
        const debug = options.debug || false;

        // Try WebGPU first if preferred
        if (preferWebGPU && isWebGPUSupported()) {
            try {
                const gpuBackend = await createWebGPUBackend(canvas, {
                    debug,
                    depth: false // Procedural shaders don't need depth
                });

                if (gpuBackend) {
                    const bridge = new UnifiedRenderBridge(canvas, 'webgpu', gpuBackend);
                    bridge._initialized = true;
                    if (debug) console.log('UnifiedRenderBridge: using WebGPU backend');
                    return bridge;
                }
            } catch (e) {
                if (debug) console.warn('WebGPU init failed, falling back to WebGL:', e);
            }
        }

        // Fall back to WebGL
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
            throw new Error('Neither WebGPU nor WebGL is available');
        }

        const bridge = new UnifiedRenderBridge(canvas, 'webgl', gl);
        bridge._initWebGLQuadBuffer();
        bridge._initialized = true;
        if (debug) console.log('UnifiedRenderBridge: using WebGL backend');
        return bridge;
    }

    /**
     * Get the active backend type
     * @returns {BackendType}
     */
    getBackendType() {
        return this.backendType;
    }

    /**
     * Check if the bridge is initialized
     * @returns {boolean}
     */
    get initialized() {
        return this._initialized;
    }

    // ========================================================================
    // Shader Compilation
    // ========================================================================

    /**
     * Compile a shader program for a named visualization.
     *
     * For WebGL: compiles GLSL vertex + fragment shaders.
     * For WebGPU: compiles WGSL fragment shader with fullscreen pipeline.
     *
     * @param {string} name - Shader name (e.g., 'faceted', 'quantum')
     * @param {object} sources
     * @param {string} sources.glslVertex - GLSL vertex shader source
     * @param {string} sources.glslFragment - GLSL fragment shader source
     * @param {string} [sources.wgslFragment] - WGSL fragment shader source (optional, for WebGPU)
     * @returns {boolean} Success
     */
    compileShader(name, sources) {
        if (this.backendType === 'webgl') {
            return this._compileWebGLShader(name, sources.glslVertex, sources.glslFragment);
        } else {
            if (!sources.wgslFragment) {
                // If no WGSL provided, we can't render on WebGPU with this shader.
                // Systems that want WebGPU support must provide WGSL sources.
                console.warn(`No WGSL fragment shader for "${name}", WebGPU rendering unavailable`);
                return false;
            }
            return this._compileWebGPUShader(name, sources.wgslFragment);
        }
    }

    /**
     * @private
     */
    _compileWebGLShader(name, vertexSrc, fragmentSrc) {
        const gl = this.backend;

        const vertexShader = this._compileGLShader(gl, gl.VERTEX_SHADER, vertexSrc);
        const fragmentShader = this._compileGLShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);

        if (!vertexShader || !fragmentShader) return false;

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(`Shader link error [${name}]:`, gl.getProgramInfoLog(program));
            return false;
        }

        // Cache uniform locations
        const uniformLocations = new Map();
        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(program, i);
            if (info) {
                uniformLocations.set(info.name, gl.getUniformLocation(program, info.name));
            }
        }

        // Clean up old program if replacing
        const old = this._glPrograms.get(name);
        if (old) {
            gl.deleteProgram(old.program);
        }

        this._glPrograms.set(name, { program, uniformLocations });

        // Clean up shader objects (they're linked into the program now)
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return true;
    }

    /**
     * @private
     */
    _compileGLShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    /**
     * @private
     */
    _compileWebGPUShader(name, wgslFragmentSrc) {
        const gpu = this.backend;

        // Create custom uniform buffer for VIB3+ uniforms
        const bufferName = `${name}-uniforms`;
        const existing = gpu.getCustomUniformBuffer(bufferName);
        if (!existing) {
            gpu.createCustomUniformBuffer(bufferName, 256);
        }

        const uniformEntry = gpu.getCustomUniformBuffer(bufferName);

        // Create fullscreen pipeline with the custom bind group layout
        try {
            gpu.createFullscreenPipeline(name, wgslFragmentSrc, {
                bindGroupLayouts: [uniformEntry.layout]
            });

            this._gpuPipelineBuffers.set(name, bufferName);
            return true;
        } catch (e) {
            console.error(`WebGPU pipeline creation failed [${name}]:`, e);
            return false;
        }
    }

    // ========================================================================
    // Uniform Updates
    // ========================================================================

    /**
     * Set uniforms for the next render call.
     * Accepts a flat object with uniform names as keys.
     *
     * @param {object} uniforms - e.g., { u_time: 1.5, u_resolution: [800, 600] }
     */
    setUniforms(uniforms) {
        // Store for render-time application
        this._pendingUniforms = uniforms;
    }

    // ========================================================================
    // Rendering
    // ========================================================================

    /**
     * Render a fullscreen quad using the named shader program.
     *
     * @param {string} name - Shader name to use
     * @param {object} [options]
     * @param {number[]} [options.clearColor] - RGBA 0-1
     * @param {boolean} [options.clear] - Whether to clear before drawing
     */
    render(name, options = {}) {
        if (this.backendType === 'webgl') {
            this._renderWebGL(name, options);
        } else {
            this._renderWebGPU(name, options);
        }
    }

    /**
     * @private
     */
    _renderWebGL(name, options) {
        const gl = this.backend;
        const entry = this._glPrograms.get(name);
        if (!entry) return;

        const { program, uniformLocations } = entry;

        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        if (options.clear !== false) {
            const cc = options.clearColor || [0, 0, 0, 1];
            gl.clearColor(cc[0], cc[1], cc[2], cc[3]);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        // Apply uniforms
        const uniforms = this._pendingUniforms || {};
        for (const [uName, value] of Object.entries(uniforms)) {
            const loc = uniformLocations.get(uName);
            if (loc === null || loc === undefined) continue;

            if (Array.isArray(value)) {
                switch (value.length) {
                    case 2: gl.uniform2fv(loc, value); break;
                    case 3: gl.uniform3fv(loc, value); break;
                    case 4: gl.uniform4fv(loc, value); break;
                    default: gl.uniform1fv(loc, value); break;
                }
            } else if (typeof value === 'number') {
                gl.uniform1f(loc, value);
            } else if (typeof value === 'boolean') {
                gl.uniform1i(loc, value ? 1 : 0);
            }
        }

        // Draw fullscreen quad
        gl.bindBuffer(gl.ARRAY_BUFFER, this._glQuadBuffer);
        const posLoc = gl.getAttribLocation(program, 'a_position');
        if (posLoc >= 0) {
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    /**
     * @private
     */
    _renderWebGPU(name, options) {
        const gpu = this.backend;
        const bufferName = this._gpuPipelineBuffers.get(name);
        if (!bufferName) return;

        const uniformEntry = gpu.getCustomUniformBuffer(bufferName);
        if (!uniformEntry) return;

        // Pack and upload uniforms
        const packed = packVIB3Uniforms(this._pendingUniforms || {});
        gpu.updateCustomUniforms(bufferName, packed);

        // Render fullscreen quad
        gpu.renderFullscreenQuad({
            pipeline: name,
            bindGroups: [uniformEntry.bindGroup],
            clearColor: options.clearColor || [0, 0, 0, 1],
            clear: options.clear !== false
        });
    }

    // ========================================================================
    // Canvas Management
    // ========================================================================

    /**
     * Resize the rendering surface
     * @param {number} width
     * @param {number} height
     * @param {number} [pixelRatio=1]
     */
    resize(width, height, pixelRatio = 1) {
        const w = Math.floor(width * pixelRatio);
        const h = Math.floor(height * pixelRatio);

        this.canvas.width = w;
        this.canvas.height = h;

        if (this.backendType === 'webgl') {
            this.backend.viewport(0, 0, w, h);
        } else {
            this.backend.resize(w, h);
        }
    }

    /**
     * Get the raw WebGL context or WebGPU backend for advanced usage
     * @returns {WebGLRenderingContext|WebGL2RenderingContext|import('./backends/WebGPUBackend.js').WebGPUBackend}
     */
    getRawBackend() {
        return this.backend;
    }

    // ========================================================================
    // Cleanup
    // ========================================================================

    /**
     * Dispose of all resources
     */
    dispose() {
        if (this.backendType === 'webgl') {
            const gl = this.backend;
            for (const [, entry] of this._glPrograms) {
                gl.deleteProgram(entry.program);
            }
            this._glPrograms.clear();

            if (this._glQuadBuffer) {
                gl.deleteBuffer(this._glQuadBuffer);
                this._glQuadBuffer = null;
            }

            // Lose context to free GPU memory
            const loseContext = gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
                loseContext.loseContext();
            }
        } else {
            this.backend.dispose();
        }

        this._gpuPipelineBuffers.clear();
        this._currentUniforms.clear();
        this._pendingUniforms = null;
        this._initialized = false;
    }

    // ========================================================================
    // Internal Helpers
    // ========================================================================

    /**
     * Create the fullscreen quad vertex buffer for WebGL
     * @private
     */
    _initWebGLQuadBuffer() {
        const gl = this.backend;
        const vertices = new Float32Array([
            -1, -1,   1, -1,  -1, 1,
            -1,  1,   1, -1,   1, 1
        ]);
        this._glQuadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._glQuadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    }
}

/**
 * Check if WebGPU is available in the current environment
 * @returns {boolean}
 */
export function canUseWebGPU() {
    return isWebGPUSupported();
}

export { WGSLShaderLib };

export default UnifiedRenderBridge;
