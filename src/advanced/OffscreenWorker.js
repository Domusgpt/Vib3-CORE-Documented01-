/**
 * VIB3+ OffscreenCanvas Worker Rendering
 * Moves visualization rendering to Web Workers for main-thread performance.
 *
 * Architecture:
 *  - OffscreenCanvasManager (main thread): coordinates canvas transfer, worker
 *    lifecycle, and parameter distribution.
 *  - Worker script (generated via getWorkerScript()): self-contained renderer
 *    that receives an OffscreenCanvas and runs the VIB3 render loop.
 *  - SharedParameterChannel (optional): uses SharedArrayBuffer for zero-copy
 *    parameter updates between main thread and workers.
 *
 * @module advanced/OffscreenWorker
 */

// ---------------------------------------------------------------------------
//  Main Thread Coordinator
// ---------------------------------------------------------------------------

/**
 * Manages OffscreenCanvas transfers to Web Workers and coordinates
 * parameter updates across all active worker renderers.
 */
export class OffscreenCanvasManager {
    constructor() {
        /**
         * Active workers keyed by canvas ID.
         * @type {Map<string, Worker>}
         */
        this.workers = new Map();

        /**
         * Transferred OffscreenCanvas references keyed by canvas ID.
         * @type {Map<string, OffscreenCanvas>}
         */
        this.canvases = new Map();

        /**
         * Shared parameter channel (optional, for SAB path).
         * @type {SharedParameterChannel|null}
         */
        this.sharedChannel = null;

        /**
         * Current parameter state, distributed to all workers.
         * @type {Object}
         */
        this._currentParams = {};

        /**
         * Message handlers registered per canvas ID.
         * @type {Map<string, Function>}
         */
        this._messageHandlers = new Map();

        /**
         * Worker script Blob URL (cached).
         * @type {string|null}
         */
        this._workerBlobURL = null;

        /** @type {boolean} */
        this._destroyed = false;
    }

    // -----------------------------------------------------------------------
    //  Worker Renderer Creation
    // -----------------------------------------------------------------------

    /**
     * Create a worker renderer for a given canvas element.
     * Transfers the canvas to an OffscreenCanvas and sends it to a new
     * Web Worker that runs the VIB3 render loop.
     *
     * @param {string} canvasId - DOM ID of the canvas element
     * @param {string} [system='faceted'] - Initial rendering system
     * @returns {Promise<Worker>} The created worker
     * @throws {Error} If OffscreenCanvas is not supported or canvas not found
     */
    async createWorkerRenderer(canvasId, system = 'faceted') {
        if (this._destroyed) {
            throw new Error('OffscreenCanvasManager has been destroyed.');
        }

        if (typeof OffscreenCanvas === 'undefined') {
            throw new Error('OffscreenCanvas is not supported in this browser.');
        }

        // Get canvas element
        const canvasElement = document.getElementById(canvasId);
        if (!canvasElement) {
            throw new Error(`Canvas element with id "${canvasId}" not found.`);
        }

        if (!(canvasElement instanceof HTMLCanvasElement)) {
            throw new Error(`Element "${canvasId}" is not a canvas element.`);
        }

        // Terminate existing worker for this canvas
        if (this.workers.has(canvasId)) {
            this._terminateWorker(canvasId);
        }

        // Transfer control to OffscreenCanvas
        const offscreen = canvasElement.transferControlToOffscreen();
        this.canvases.set(canvasId, offscreen);

        // Create worker from blob URL
        const worker = new Worker(this._getWorkerBlobURL(), { type: 'module' });

        // Set up message handling
        worker.onmessage = (event) => {
            this._onWorkerMessage(canvasId, event.data);
        };

        worker.onerror = (error) => {
            console.error(`VIB3 Worker [${canvasId}]:`, error.message);
        };

        this.workers.set(canvasId, worker);

        // Build initialization message
        const initMessage = {
            type: 'init',
            canvas: offscreen,
            system,
            width: canvasElement.width,
            height: canvasElement.height,
            params: { ...this._currentParams },
            pixelRatio: window.devicePixelRatio || 1
        };

        // Optionally attach shared buffer
        if (this.sharedChannel) {
            initMessage.sharedBuffer = this.sharedChannel.getBuffer();
        }

        // Transfer the OffscreenCanvas
        worker.postMessage(initMessage, [offscreen]);

        return worker;
    }

    // -----------------------------------------------------------------------
    //  Parameter Updates
    // -----------------------------------------------------------------------

    /**
     * Send parameter updates to all active workers.
     *
     * @param {Object} params - Key-value parameter updates
     */
    updateParameters(params) {
        if (this._destroyed) return;

        // Merge into current state
        Object.assign(this._currentParams, params);

        // If using shared buffer, write there (workers read continuously)
        if (this.sharedChannel) {
            this._writeParamsToSharedBuffer(params);
        }

        // Also post message (for non-SAB path or for discrete events)
        const message = { type: 'params', params };
        for (const [, worker] of this.workers) {
            worker.postMessage(message);
        }
    }

    /**
     * Set a single parameter on all workers.
     *
     * @param {string} name - Parameter name
     * @param {number} value - Parameter value
     */
    setParameter(name, value) {
        this.updateParameters({ [name]: value });
    }

    // -----------------------------------------------------------------------
    //  System Switching
    // -----------------------------------------------------------------------

    /**
     * Tell all workers to switch their rendering system.
     *
     * @param {string} system - 'quantum' | 'faceted' | 'holographic'
     */
    switchSystem(system) {
        if (this._destroyed) return;

        const message = { type: 'switchSystem', system };
        for (const [, worker] of this.workers) {
            worker.postMessage(message);
        }
    }

    // -----------------------------------------------------------------------
    //  Canvas Resize
    // -----------------------------------------------------------------------

    /**
     * Notify a worker of a canvas size change.
     *
     * @param {string} canvasId - Canvas ID
     * @param {number} width - New width in CSS pixels
     * @param {number} height - New height in CSS pixels
     */
    resize(canvasId, width, height) {
        const worker = this.workers.get(canvasId);
        if (!worker) return;

        worker.postMessage({
            type: 'resize',
            width,
            height,
            pixelRatio: window.devicePixelRatio || 1
        });
    }

    // -----------------------------------------------------------------------
    //  Event Forwarding
    // -----------------------------------------------------------------------

    /**
     * Forward a mouse/touch event to a specific worker.
     *
     * @param {string} canvasId
     * @param {string} eventType - 'mousemove', 'mousedown', 'mouseup', 'touchmove', etc.
     * @param {number} x - Normalized X coordinate (0-1)
     * @param {number} y - Normalized Y coordinate (0-1)
     * @param {boolean} [pressed=false] - Whether a button/finger is pressed
     */
    forwardInput(canvasId, eventType, x, y, pressed = false) {
        const worker = this.workers.get(canvasId);
        if (!worker) return;

        worker.postMessage({
            type: 'input',
            eventType,
            x, y, pressed
        });
    }

    // -----------------------------------------------------------------------
    //  SharedParameterChannel Integration
    // -----------------------------------------------------------------------

    /**
     * Attach a SharedParameterChannel for zero-copy parameter transfer.
     * Must be called before creating any workers.
     *
     * @param {SharedParameterChannel} channel
     */
    attachSharedChannel(channel) {
        this.sharedChannel = channel;
    }

    /**
     * Write parameter values to the shared buffer.
     * @param {Object} params
     * @private
     */
    _writeParamsToSharedBuffer(params) {
        if (!this.sharedChannel) return;

        const paramOrder = SharedParameterChannel.PARAM_ORDER;
        for (const [name, value] of Object.entries(params)) {
            const index = paramOrder.indexOf(name);
            if (index >= 0) {
                this.sharedChannel.setParameter(index, value);
            }
        }
    }

    // -----------------------------------------------------------------------
    //  Message Handling
    // -----------------------------------------------------------------------

    /**
     * Register a message handler for a specific worker.
     *
     * @param {string} canvasId
     * @param {Function} handler - Receives message data object
     */
    onWorkerMessage(canvasId, handler) {
        this._messageHandlers.set(canvasId, handler);
    }

    /**
     * Handle messages from workers.
     * @param {string} canvasId
     * @param {Object} data
     * @private
     */
    _onWorkerMessage(canvasId, data) {
        const handler = this._messageHandlers.get(canvasId);
        if (handler) {
            handler(data);
        }
    }

    // -----------------------------------------------------------------------
    //  Worker Script Generation
    // -----------------------------------------------------------------------

    /**
     * Get the Blob URL for the worker script. Cached after first creation.
     * @returns {string}
     * @private
     */
    _getWorkerBlobURL() {
        if (!this._workerBlobURL) {
            const source = getWorkerScript();
            const blob = new Blob([source], { type: 'application/javascript' });
            this._workerBlobURL = URL.createObjectURL(blob);
        }
        return this._workerBlobURL;
    }

    // -----------------------------------------------------------------------
    //  Cleanup
    // -----------------------------------------------------------------------

    /**
     * Terminate a specific worker.
     * @param {string} canvasId
     * @private
     */
    _terminateWorker(canvasId) {
        const worker = this.workers.get(canvasId);
        if (worker) {
            worker.postMessage({ type: 'destroy' });
            worker.terminate();
        }
        this.workers.delete(canvasId);
        this.canvases.delete(canvasId);
        this._messageHandlers.delete(canvasId);
    }

    /**
     * Terminate all workers and release all resources.
     */
    destroy() {
        this._destroyed = true;

        for (const canvasId of Array.from(this.workers.keys())) {
            this._terminateWorker(canvasId);
        }

        if (this._workerBlobURL) {
            URL.revokeObjectURL(this._workerBlobURL);
            this._workerBlobURL = null;
        }

        this.sharedChannel = null;
        this._currentParams = {};
    }
}

// ---------------------------------------------------------------------------
//  Worker Script Generator
// ---------------------------------------------------------------------------

/**
 * Returns the self-contained Web Worker script source code as a string.
 * The worker receives an OffscreenCanvas via postMessage and runs a
 * VIB3-compatible WebGL render loop.
 *
 * The worker handles:
 *  - WebGL context creation on OffscreenCanvas
 *  - Parameter updates (via message or SharedArrayBuffer)
 *  - System switching (faceted, quantum, holographic fragment shaders)
 *  - Render loop with requestAnimationFrame
 *  - Canvas resize
 *  - Input forwarding (mouse/touch)
 *  - Graceful shutdown
 *
 * @returns {string} Complete worker JavaScript source code
 */
export function getWorkerScript() {
    return `
// =========================================================================
//  VIB3+ OffscreenCanvas Worker
//  Self-contained WebGL renderer for VIB3 visualizations.
// =========================================================================

'use strict';

// -- State --
let canvas = null;
let gl = null;
let program = null;
let running = false;
let currentSystem = 'faceted';
let sharedView = null;  // Float32Array on SharedArrayBuffer
let animFrameId = 0;
let startTime = performance.now() / 1000.0;

// -- Parameters --
const params = {
    time: 0,
    geometry: 0,
    rot4dXY: 0, rot4dXZ: 0, rot4dYZ: 0,
    rot4dXW: 0, rot4dYW: 0, rot4dZW: 0,
    gridDensity: 20,
    morphFactor: 0,
    chaos: 0,
    speed: 1,
    hue: 180,
    intensity: 0.5,
    saturation: 0.7,
    dimension: 4.0,
    mouseX: 0.5, mouseY: 0.5, mousePressed: 0,
    bass: 0, mid: 0, high: 0
};

// Parameter order for SharedArrayBuffer reading
const PARAM_ORDER = [
    'geometry', 'rot4dXY', 'rot4dXZ', 'rot4dYZ',
    'rot4dXW', 'rot4dYW', 'rot4dZW', 'gridDensity',
    'morphFactor', 'chaos', 'speed', 'hue',
    'intensity', 'saturation', 'dimension',
    'bass', 'mid', 'high', 'mouseX', 'mouseY'
];

// -- Uniform locations cache --
let uniforms = {};

// =========================================================================
//  Fragment Shader Sources
// =========================================================================

const VERTEX_SHADER = \`
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
\`;

// --- Shared GLSL preamble (4D rotation + projection) ---
const SHARED_GLSL = \`
    precision highp float;

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_geometry;
    uniform float u_rot4dXY, u_rot4dXZ, u_rot4dYZ;
    uniform float u_rot4dXW, u_rot4dYW, u_rot4dZW;
    uniform float u_gridDensity;
    uniform float u_morphFactor;
    uniform float u_chaos;
    uniform float u_speed;
    uniform float u_hue;
    uniform float u_intensity;
    uniform float u_saturation;
    uniform float u_dimension;
    uniform float u_mouseIntensity;
    uniform float u_bass, u_mid, u_high;

    mat4 rotateXY(float a) {
        float c = cos(a), s = sin(a);
        return mat4(c,-s,0,0, s,c,0,0, 0,0,1,0, 0,0,0,1);
    }
    mat4 rotateXZ(float a) {
        float c = cos(a), s = sin(a);
        return mat4(c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1);
    }
    mat4 rotateYZ(float a) {
        float c = cos(a), s = sin(a);
        return mat4(1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1);
    }
    mat4 rotateXW(float a) {
        float c = cos(a), s = sin(a);
        return mat4(c,0,0,-s, 0,1,0,0, 0,0,1,0, s,0,0,c);
    }
    mat4 rotateYW(float a) {
        float c = cos(a), s = sin(a);
        return mat4(1,0,0,0, 0,c,0,-s, 0,0,1,0, 0,s,0,c);
    }
    mat4 rotateZW(float a) {
        float c = cos(a), s = sin(a);
        return mat4(1,0,0,0, 0,1,0,0, 0,0,c,-s, 0,0,s,c);
    }

    mat4 fullRotation4D() {
        return rotateXY(u_rot4dXY) * rotateXZ(u_rot4dXZ) * rotateYZ(u_rot4dYZ)
             * rotateXW(u_rot4dXW) * rotateYW(u_rot4dYW) * rotateZW(u_rot4dZW);
    }

    vec3 project4Dto3D(vec4 p) {
        float d = u_dimension - p.w;
        return p.xyz / max(d, 0.01);
    }

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
\`;

// --- Faceted system fragment shader ---
const FACETED_FRAGMENT = SHARED_GLSL + \`
    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 p = (uv * 2.0 - 1.0) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * u_speed;
        float geom = u_geometry;
        float gi = mod(geom, 8.0);

        vec4 p4 = vec4(p, 0.0, 0.0);
        p4 = fullRotation4D() * p4;
        vec3 proj = project4Dto3D(p4);

        float density = u_gridDensity;
        float pattern = 0.0;

        // Geometry-dependent pattern
        if (gi < 1.0) {
            // Tetrahedron lattice
            pattern = sin(proj.x * density + t) * sin(proj.y * density - t * 0.7);
        } else if (gi < 2.0) {
            // Hypercube grid
            vec2 grid = fract(proj.xy * density * 0.1) - 0.5;
            pattern = step(0.4, max(abs(grid.x), abs(grid.y)));
        } else if (gi < 3.0) {
            // Sphere
            float r = length(proj.xy);
            pattern = sin(r * density - t * 2.0);
        } else if (gi < 4.0) {
            // Torus
            float r = length(proj.xy) - 0.5;
            pattern = sin(atan(proj.y, proj.x) * density + t) * cos(r * density * 3.0);
        } else if (gi < 5.0) {
            // Klein
            float twist = sin(proj.x * 3.14159 + t);
            pattern = sin((proj.y + twist * 0.3) * density);
        } else if (gi < 6.0) {
            // Fractal
            vec2 z = proj.xy * 2.0;
            for (int i = 0; i < 5; i++) {
                z = abs(z) * 2.0 - 1.0;
                z *= mat2(cos(t*0.1), -sin(t*0.1), sin(t*0.1), cos(t*0.1));
            }
            pattern = length(z) * 0.5;
        } else if (gi < 7.0) {
            // Wave
            pattern = sin(proj.x * density + t) + sin(proj.y * density * 0.7 - t * 1.3);
            pattern *= 0.5;
        } else {
            // Crystal
            float hex = abs(proj.x) + abs(proj.y) + abs(proj.x + proj.y);
            pattern = sin(hex * density * 0.5 - t);
        }

        // Morph and chaos
        pattern += sin(length(proj.xy) * 10.0 - t * 3.0) * u_morphFactor * 0.3;
        pattern += (fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * u_chaos;

        // Color
        float h = u_hue / 360.0 + pattern * 0.1;
        vec3 color = hsv2rgb(vec3(h, u_saturation, u_intensity * (0.5 + pattern * 0.5)));

        // Audio reactivity
        color += vec3(u_bass * 0.2, u_mid * 0.15, u_high * 0.1) * pattern;

        gl_FragColor = vec4(color, 1.0);
    }
\`;

// --- Quantum system fragment shader ---
const QUANTUM_FRAGMENT = SHARED_GLSL + \`
    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 p = (uv * 2.0 - 1.0) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * u_speed;
        float gi = mod(u_geometry, 8.0);

        vec4 p4 = vec4(p, sin(t * 0.3) * 0.5, cos(t * 0.2) * 0.5);
        p4 = fullRotation4D() * p4;
        vec3 proj = project4Dto3D(p4);

        // Quantum lattice pattern
        float density = u_gridDensity;
        float wave1 = sin(proj.x * density + t) * cos(proj.y * density * 0.8 - t * 0.6);
        float wave2 = cos(length(proj.xy) * density * 0.5 - t * 1.5);
        float interference = wave1 * wave2;

        // Geometry variation
        float geomMod = 0.0;
        if (gi < 2.0) {
            geomMod = sin(proj.x * proj.y * density);
        } else if (gi < 4.0) {
            geomMod = sin(length(proj) * density * 2.0);
        } else if (gi < 6.0) {
            geomMod = sin(atan(proj.y, proj.x) * floor(gi + 3.0));
        } else {
            geomMod = sin(abs(proj.x) * density) * sin(abs(proj.y) * density);
        }

        float pattern = interference + geomMod * 0.3;
        pattern += u_morphFactor * sin(pattern * 6.28) * 0.4;

        // Quantum probability color mapping
        float probability = abs(pattern);
        float phase = atan(wave1, wave2) / 6.28318 + 0.5;

        float h = u_hue / 360.0 + phase * 0.3;
        float s = u_saturation * (0.5 + probability * 0.5);
        float v = u_intensity * (0.3 + probability * 0.7);

        vec3 color = hsv2rgb(vec3(h, s, v));

        // Chaos noise
        float noise = fract(sin(dot(uv + t * 0.01, vec2(12.9898, 78.233))) * 43758.5453);
        color += (noise - 0.5) * u_chaos * 0.3;

        // Audio
        color.r += u_bass * probability * 0.3;
        color.g += u_mid * (1.0 - probability) * 0.2;
        color.b += u_high * phase * 0.25;

        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
\`;

// --- Holographic system fragment shader ---
const HOLOGRAPHIC_FRAGMENT = SHARED_GLSL + \`
    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 p = (uv * 2.0 - 1.0) * vec2(u_resolution.x / u_resolution.y, 1.0);

        float t = u_time * u_speed;
        float gi = mod(u_geometry, 8.0);

        // 5 virtual layers composited
        vec3 totalColor = vec3(0.0);
        float totalAlpha = 0.0;

        for (int layer = 0; layer < 5; layer++) {
            float layerF = float(layer);
            float layerOffset = layerF * 0.1;
            float layerScale = 1.0 + layerF * 0.15;
            float layerOpacity = 1.0 - layerF * 0.15;

            vec4 p4 = vec4(p * layerScale, layerOffset, sin(t * 0.1 + layerF));
            p4 = fullRotation4D() * p4;
            vec3 proj = project4Dto3D(p4);

            float density = u_gridDensity * (1.0 + layerF * 0.2);
            float pattern = sin(proj.x * density + t + layerF)
                          * cos(proj.y * density * 0.9 - t * 0.7 + layerF * 0.5);

            pattern += sin(length(proj.xy) * density * 0.3 - t * 2.0) * 0.5;
            pattern *= (1.0 + u_morphFactor * sin(pattern * 3.14159));

            // Layer-specific hue shift
            float h = u_hue / 360.0 + layerF * 0.08 + pattern * 0.05;
            float s = u_saturation * (0.6 + layerF * 0.08);
            float v = u_intensity * (0.2 + abs(pattern) * 0.6) * layerOpacity;

            vec3 layerColor = hsv2rgb(vec3(h, s, v));

            // Glassmorphic blend
            float layerAlpha = (0.3 + abs(pattern) * 0.4) * layerOpacity;
            totalColor = mix(totalColor, layerColor, layerAlpha);
            totalAlpha = max(totalAlpha, layerAlpha);
        }

        // Holographic iridescence
        float iridescence = sin(p.x * 20.0 + t) * sin(p.y * 20.0 - t * 0.8) * 0.1;
        totalColor += vec3(iridescence, iridescence * 0.7, iridescence * 1.3);

        // Audio glow
        totalColor += vec3(u_bass, u_mid, u_high) * 0.15;

        // Chaos
        float noise = fract(sin(dot(uv + t * 0.005, vec2(12.9898, 78.233))) * 43758.5453);
        totalColor += (noise - 0.5) * u_chaos * 0.15;

        gl_FragColor = vec4(clamp(totalColor, 0.0, 1.0), 1.0);
    }
\`;

// =========================================================================
//  Shader map by system name
// =========================================================================

const SYSTEM_SHADERS = {
    faceted: FACETED_FRAGMENT,
    quantum: QUANTUM_FRAGMENT,
    holographic: HOLOGRAPHIC_FRAGMENT
};

// =========================================================================
//  WebGL Initialization
// =========================================================================

function initGL(offscreen, width, height, pixelRatio) {
    canvas = offscreen;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
        throw new Error('WebGL not available on OffscreenCanvas.');
    }

    buildProgram(currentSystem);
}

function buildProgram(system) {
    if (program) {
        gl.deleteProgram(program);
        program = null;
    }

    const fragSource = SYSTEM_SHADERS[system] || SYSTEM_SHADERS.faceted;

    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl.FRAGMENT_SHADER, fragSource);
    if (!vs || !fs) return;

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Shader link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        program = null;
        return;
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    // Full-screen quad
    const quadVerts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    uniforms = {};
    const uniformNames = [
        'u_time', 'u_resolution', 'u_geometry',
        'u_rot4dXY', 'u_rot4dXZ', 'u_rot4dYZ',
        'u_rot4dXW', 'u_rot4dYW', 'u_rot4dZW',
        'u_gridDensity', 'u_morphFactor', 'u_chaos',
        'u_speed', 'u_hue', 'u_intensity', 'u_saturation',
        'u_dimension', 'u_mouseIntensity',
        'u_bass', 'u_mid', 'u_high'
    ];
    for (const name of uniformNames) {
        uniforms[name] = gl.getUniformLocation(program, name);
    }
}

function compileShader(type, source) {
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

// =========================================================================
//  Render Loop
// =========================================================================

function render() {
    if (!running || !gl || !program) return;

    // Read shared buffer if available
    if (sharedView) {
        for (let i = 0; i < PARAM_ORDER.length && i < sharedView.length; i++) {
            params[PARAM_ORDER[i]] = sharedView[i];
        }
    }

    params.time = (performance.now() / 1000.0) - startTime;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Set uniforms
    if (uniforms.u_time != null) gl.uniform1f(uniforms.u_time, params.time);
    if (uniforms.u_resolution != null) gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
    if (uniforms.u_geometry != null) gl.uniform1f(uniforms.u_geometry, params.geometry);

    if (uniforms.u_rot4dXY != null) gl.uniform1f(uniforms.u_rot4dXY, params.rot4dXY);
    if (uniforms.u_rot4dXZ != null) gl.uniform1f(uniforms.u_rot4dXZ, params.rot4dXZ);
    if (uniforms.u_rot4dYZ != null) gl.uniform1f(uniforms.u_rot4dYZ, params.rot4dYZ);
    if (uniforms.u_rot4dXW != null) gl.uniform1f(uniforms.u_rot4dXW, params.rot4dXW);
    if (uniforms.u_rot4dYW != null) gl.uniform1f(uniforms.u_rot4dYW, params.rot4dYW);
    if (uniforms.u_rot4dZW != null) gl.uniform1f(uniforms.u_rot4dZW, params.rot4dZW);

    if (uniforms.u_gridDensity != null) gl.uniform1f(uniforms.u_gridDensity, params.gridDensity);
    if (uniforms.u_morphFactor != null) gl.uniform1f(uniforms.u_morphFactor, params.morphFactor);
    if (uniforms.u_chaos != null) gl.uniform1f(uniforms.u_chaos, params.chaos);
    if (uniforms.u_speed != null) gl.uniform1f(uniforms.u_speed, params.speed);
    if (uniforms.u_hue != null) gl.uniform1f(uniforms.u_hue, params.hue);
    if (uniforms.u_intensity != null) gl.uniform1f(uniforms.u_intensity, params.intensity);
    if (uniforms.u_saturation != null) gl.uniform1f(uniforms.u_saturation, params.saturation);
    if (uniforms.u_dimension != null) gl.uniform1f(uniforms.u_dimension, params.dimension);
    if (uniforms.u_mouseIntensity != null) gl.uniform1f(uniforms.u_mouseIntensity, params.mousePressed ? 1.0 : 0.0);
    if (uniforms.u_bass != null) gl.uniform1f(uniforms.u_bass, params.bass);
    if (uniforms.u_mid != null) gl.uniform1f(uniforms.u_mid, params.mid);
    if (uniforms.u_high != null) gl.uniform1f(uniforms.u_high, params.high);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    animFrameId = requestAnimationFrame(render);
}

// =========================================================================
//  Message Handler
// =========================================================================

self.onmessage = function(event) {
    const msg = event.data;

    switch (msg.type) {
        case 'init':
            currentSystem = msg.system || 'faceted';
            Object.assign(params, msg.params || {});

            if (msg.sharedBuffer) {
                sharedView = new Float32Array(msg.sharedBuffer);
            }

            initGL(msg.canvas, msg.width, msg.height, msg.pixelRatio || 1);
            running = true;
            startTime = performance.now() / 1000.0;
            render();

            self.postMessage({ type: 'ready', system: currentSystem });
            break;

        case 'params':
            Object.assign(params, msg.params);
            break;

        case 'switchSystem':
            currentSystem = msg.system || 'faceted';
            if (gl) {
                buildProgram(currentSystem);
            }
            self.postMessage({ type: 'systemChanged', system: currentSystem });
            break;

        case 'resize':
            if (canvas) {
                const pr = msg.pixelRatio || 1;
                canvas.width = msg.width * pr;
                canvas.height = msg.height * pr;
            }
            break;

        case 'input':
            if (msg.eventType === 'mousemove' || msg.eventType === 'touchmove') {
                params.mouseX = msg.x;
                params.mouseY = msg.y;
            }
            if (msg.eventType === 'mousedown' || msg.eventType === 'touchstart') {
                params.mousePressed = 1;
            }
            if (msg.eventType === 'mouseup' || msg.eventType === 'touchend') {
                params.mousePressed = 0;
            }
            break;

        case 'destroy':
            running = false;
            if (animFrameId) {
                cancelAnimationFrame(animFrameId);
            }
            if (gl && program) {
                gl.deleteProgram(program);
            }
            gl = null;
            canvas = null;
            program = null;
            self.postMessage({ type: 'destroyed' });
            break;

        default:
            break;
    }
};

self.postMessage({ type: 'loaded' });
`;
}

// ---------------------------------------------------------------------------
//  SharedArrayBuffer-based Parameter Channel
// ---------------------------------------------------------------------------

/**
 * Zero-copy parameter channel using SharedArrayBuffer.
 * Allows the main thread to write parameter values that workers read
 * directly from shared memory without message-passing overhead.
 *
 * Requirements:
 *  - Page served with cross-origin isolation headers:
 *    Cross-Origin-Opener-Policy: same-origin
 *    Cross-Origin-Embedder-Policy: require-corp
 */
export class SharedParameterChannel {
    /**
     * Standard parameter order for indexing into the shared buffer.
     * @type {string[]}
     */
    static PARAM_ORDER = [
        'geometry', 'rot4dXY', 'rot4dXZ', 'rot4dYZ',
        'rot4dXW', 'rot4dYW', 'rot4dZW', 'gridDensity',
        'morphFactor', 'chaos', 'speed', 'hue',
        'intensity', 'saturation', 'dimension',
        'bass', 'mid', 'high', 'mouseX', 'mouseY'
    ];

    /**
     * @param {number} [paramCount=20] - Number of float32 parameter slots
     */
    constructor(paramCount = 20) {
        if (typeof SharedArrayBuffer === 'undefined') {
            throw new Error(
                'SharedArrayBuffer is not available. '
                + 'Ensure the page has cross-origin isolation headers.'
            );
        }

        /** @type {number} */
        this.paramCount = paramCount;

        /** @type {SharedArrayBuffer} */
        this.buffer = new SharedArrayBuffer(paramCount * 4); // Float32

        /** @type {Float32Array} */
        this.view = new Float32Array(this.buffer);
    }

    /**
     * Set a parameter value by index.
     * @param {number} index - Parameter index (see PARAM_ORDER)
     * @param {number} value - Parameter value
     */
    setParameter(index, value) {
        if (index >= 0 && index < this.paramCount) {
            Atomics.store(
                new Int32Array(this.buffer),
                index,
                this._floatToInt(value)
            );
        }
    }

    /**
     * Get a parameter value by index.
     * @param {number} index
     * @returns {number}
     */
    getParameter(index) {
        if (index >= 0 && index < this.paramCount) {
            return this.view[index];
        }
        return 0;
    }

    /**
     * Set a parameter by name.
     * @param {string} name - Parameter name
     * @param {number} value
     */
    setByName(name, value) {
        const index = SharedParameterChannel.PARAM_ORDER.indexOf(name);
        if (index >= 0) {
            this.setParameter(index, value);
        }
    }

    /**
     * Get a parameter by name.
     * @param {string} name
     * @returns {number}
     */
    getByName(name) {
        const index = SharedParameterChannel.PARAM_ORDER.indexOf(name);
        return index >= 0 ? this.getParameter(index) : 0;
    }

    /**
     * Bulk-set parameters from an object.
     * @param {Object} params - Key-value parameter pairs
     */
    setAll(params) {
        for (const [name, value] of Object.entries(params)) {
            this.setByName(name, value);
        }
    }

    /**
     * Get all parameters as an object.
     * @returns {Object}
     */
    getAll() {
        const result = {};
        for (let i = 0; i < SharedParameterChannel.PARAM_ORDER.length; i++) {
            result[SharedParameterChannel.PARAM_ORDER[i]] = this.view[i];
        }
        return result;
    }

    /**
     * Get the underlying SharedArrayBuffer for transfer to a worker.
     * @returns {SharedArrayBuffer}
     */
    getBuffer() {
        return this.buffer;
    }

    /**
     * Convert float to int bits for Atomics.store compatibility.
     * @param {number} f
     * @returns {number}
     * @private
     */
    _floatToInt(f) {
        const buf = new ArrayBuffer(4);
        new Float32Array(buf)[0] = f;
        return new Int32Array(buf)[0];
    }
}
