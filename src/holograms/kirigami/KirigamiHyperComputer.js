/**
 * KirigamiHyperComputer - Main System Class for the Holographic Hyper-Computer
 *
 * This is the top-level integration class that combines:
 * - Hexastack600 (6-layer 600-cell constellation)
 * - ExclusionPipeline (multipass rendering with exclusion blend)
 * - IsoclinicRotation (4D rotation via quaternion pairs)
 * - Audio/Data reactivity
 *
 * The HHC operates as an "Analog Computational Architecture" where:
 * - Data is not merely displayed
 * - The geometry itself IS the computation
 * - Deformation, rotation, and folding constitute the computational process
 *
 * @module holograms/kirigami/KirigamiHyperComputer
 */

import { Vec4 } from '../../math/Vec4.js';
import { Hexastack600 } from './Hexastack600.js';
import { ExclusionPipeline } from './ExclusionPipeline.js';
import { DataBrain } from './IsoclinicRotation.js';
import { KirigamiState } from './KirigamiLayer.js';

/**
 * Matrix utility functions for camera setup
 * These supplement the core Mat4x4 class with view/projection matrices
 */
const MatrixUtils = {
    /**
     * Create a perspective projection matrix
     */
    perspective(fovY, aspect, near, far) {
        const f = 1.0 / Math.tan(fovY / 2);
        const nf = 1 / (near - far);

        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, 2 * far * near * nf, 0
        ]);
    },

    /**
     * Create a look-at view matrix
     */
    lookAt(eye, center, up) {
        const zAxis = normalize(subtract(eye, center));
        const xAxis = normalize(cross(up, zAxis));
        const yAxis = cross(zAxis, xAxis);

        return new Float32Array([
            xAxis.x, yAxis.x, zAxis.x, 0,
            xAxis.y, yAxis.y, zAxis.y, 0,
            xAxis.z, yAxis.z, zAxis.z, 0,
            -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1
        ]);
    },

    /**
     * Multiply two 4x4 matrices
     */
    multiply(a, b) {
        const result = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) {
                    sum += a[i + k * 4] * b[k + j * 4];
                }
                result[i + j * 4] = sum;
            }
        }
        return result;
    },

    /**
     * Create identity matrix
     */
    identity() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }
};

// Vector helper functions for lookAt
function subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len < 1e-10) return { x: 0, y: 0, z: 1 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * KirigamiHyperComputer - The complete HHC visualization system
 */
export class KirigamiHyperComputer {
    /**
     * Create the Kirigami Hyper-Computer
     *
     * @param {Object} options - Configuration
     * @param {string} options.canvasId - Canvas element ID
     * @param {number} options.scale - Geometry scale
     * @param {boolean} options.audioReactive - Enable audio input
     */
    constructor(options = {}) {
        this.canvasId = options.canvasId || 'kirigami-canvas';
        this.canvas = null;
        this.gl = null;

        // Configuration
        this.scale = options.scale || 1;
        this.dimension = options.dimension || 4.0;
        this.audioReactive = options.audioReactive ?? true;

        // Core components
        this.hexastack = null;
        this.pipeline = null;
        this.dataBrain = null;

        // Camera/view
        this.viewMatrix = MatrixUtils.identity();
        this.projMatrix = MatrixUtils.identity();
        this.viewProjMatrix = new Float32Array(16);

        // Timing
        this.time = 0;
        this.lastFrameTime = 0;
        this.animationId = null;
        this.isRunning = false;

        // Audio
        this.audioContext = null;
        this.analyser = null;
        this.frequencyData = null;
        this.audioEnabled = false;
        this.audioData = { bass: 0, mid: 0, high: 0, energy: 0, rhythm: 0, melody: 0 };

        // Parameters (compatible with VIB3 system)
        this.parameters = {
            rot4dXY: 0,
            rot4dXZ: 0,
            rot4dYZ: 0,
            rot4dXW: 0,
            rot4dYW: 0,
            rot4dZW: 0,
            dimension: 4.0,
            gridDensity: 24,
            morphFactor: 1.0,
            chaos: 0.2,
            speed: 1.0,
            hue: 280,
            intensity: 0.7,
            saturation: 0.8,
            coherence: 0.5
        };

        // Current variant (for gallery compatibility)
        this.currentVariant = 0;
        this.variantNames = this.generateVariantNames();

        // Layer VAOs for rendering
        this.layerGeometries = [];

        // Event callbacks
        this.onStateChange = null;
        this.onRender = null;
    }

    /**
     * Initialize the HHC system
     *
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        console.log('🔮 Initializing Kirigami Hyper-Computer...');

        try {
            // Get canvas
            this.canvas = document.getElementById(this.canvasId);
            if (!this.canvas) {
                console.error(`Canvas not found: ${this.canvasId}`);
                return false;
            }

            // Initialize WebGL2
            this.gl = this.canvas.getContext('webgl2', {
                alpha: true,
                depth: true,
                stencil: false,
                antialias: true,
                premultipliedAlpha: true,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            });

            if (!this.gl) {
                console.error('WebGL2 not supported');
                return false;
            }

            // Initialize components
            this.hexastack = new Hexastack600({
                scale: this.scale,
                coherence: this.parameters.coherence
            });

            this.pipeline = new ExclusionPipeline(this.gl, {
                width: this.canvas.width,
                height: this.canvas.height
            });

            this.dataBrain = new DataBrain({
                angleScale: Math.PI * 2,
                smoothing: 0.15
            });

            // Create geometry buffers for each layer
            this.createLayerGeometries();

            // Set up camera
            this.setupCamera();

            // Handle resize
            this.setupResizeHandler();

            // Initialize audio if enabled
            if (this.audioReactive) {
                await this.initAudio();
            }

            console.log('✅ Kirigami Hyper-Computer initialized');
            return true;

        } catch (error) {
            console.error('❌ HHC initialization failed:', error);
            return false;
        }
    }

    /**
     * Create geometry buffers for all layers
     */
    createLayerGeometries() {
        this.layerGeometries = [];

        for (let i = 0; i < 6; i++) {
            const layer = this.hexastack.getLayer(i);

            // Pack vertices into Float32Array (4 floats per vertex)
            const vertexData = new Float32Array(layer.vertices.length * 4);
            for (let j = 0; j < layer.vertices.length; j++) {
                const v = layer.vertices[j];
                vertexData[j * 4 + 0] = v.x;
                vertexData[j * 4 + 1] = v.y;
                vertexData[j * 4 + 2] = v.z;
                vertexData[j * 4 + 3] = v.w;
            }

            const geometry = this.pipeline.createLayerVAO(vertexData);
            this.layerGeometries.push(geometry);
        }
    }

    /**
     * Update geometry buffers after layer transformation
     */
    updateLayerGeometries() {
        const gl = this.gl;

        for (let i = 0; i < 6; i++) {
            const layer = this.hexastack.getLayer(i);
            const geometry = this.layerGeometries[i];

            // Pack updated vertices
            const vertexData = new Float32Array(layer.vertices.length * 4);
            for (let j = 0; j < layer.vertices.length; j++) {
                const v = layer.vertices[j];
                vertexData[j * 4 + 0] = v.x;
                vertexData[j * 4 + 1] = v.y;
                vertexData[j * 4 + 2] = v.z;
                vertexData[j * 4 + 3] = v.w;
            }

            // Update buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, geometry.buffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexData);
        }
    }

    /**
     * Set up camera matrices
     */
    setupCamera() {
        // View matrix (camera at z=5, looking at origin)
        const eye = { x: 0, y: 0, z: 5 };
        const target = { x: 0, y: 0, z: 0 };
        const up = { x: 0, y: 1, z: 0 };
        this.viewMatrix = MatrixUtils.lookAt(eye, target, up);

        // Perspective projection
        const aspect = this.canvas.width / this.canvas.height;
        this.projMatrix = MatrixUtils.perspective(Math.PI / 4, aspect, 0.1, 100);

        // Combined view-projection
        this.updateViewProjMatrix();
    }

    /**
     * Update combined view-projection matrix
     */
    updateViewProjMatrix() {
        this.viewProjMatrix = MatrixUtils.multiply(this.projMatrix, this.viewMatrix);
    }

    /**
     * Set up resize handler
     */
    setupResizeHandler() {
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                this.handleResize(width, height);
            }
        });

        resizeObserver.observe(this.canvas.parentElement || this.canvas);
    }

    /**
     * Handle canvas resize
     *
     * @param {number} width
     * @param {number} height
     */
    handleResize(width, height) {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(width * dpr);
        const h = Math.floor(height * dpr);

        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;

            if (this.pipeline) {
                this.pipeline.resize(w, h);
            }

            // Update projection matrix
            const aspect = w / h;
            this.projMatrix = MatrixUtils.perspective(Math.PI / 4, aspect, 0.1, 100);
            this.updateViewProjMatrix();
        }
    }

    /**
     * Initialize audio input
     */
    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);

            this.audioEnabled = true;
            console.log('🎵 HHC audio reactivity enabled');

        } catch (error) {
            console.warn('Audio initialization failed:', error);
            this.audioEnabled = false;
        }
    }

    /**
     * Process audio data
     */
    updateAudio() {
        if (!this.audioEnabled || !this.analyser) return;

        this.analyser.getByteFrequencyData(this.frequencyData);

        const len = this.frequencyData.length;
        const bassEnd = Math.floor(len * 0.1);
        const midEnd = Math.floor(len * 0.4);

        let bass = 0, mid = 0, high = 0;

        for (let i = 0; i < bassEnd; i++) bass += this.frequencyData[i];
        for (let i = bassEnd; i < midEnd; i++) mid += this.frequencyData[i];
        for (let i = midEnd; i < len; i++) high += this.frequencyData[i];

        bass /= bassEnd * 255;
        mid /= (midEnd - bassEnd) * 255;
        high /= (len - midEnd) * 255;

        // Smooth
        const s = 0.3;
        this.audioData.bass = this.audioData.bass * (1 - s) + bass * s;
        this.audioData.mid = this.audioData.mid * (1 - s) + mid * s;
        this.audioData.high = this.audioData.high * (1 - s) + high * s;
        this.audioData.energy = (bass + mid + high) / 3;
        this.audioData.rhythm = bass > this.audioData.bass + 0.1 ? 1.0 : 0.0;
        this.audioData.melody = (mid + high) / 2;
    }

    /**
     * Update parameters (VIB3 compatible interface)
     *
     * @param {Object} params - Parameter object
     */
    updateParameters(params) {
        Object.assign(this.parameters, params);

        // Apply rotation parameters to hexastack
        if (this.hexastack) {
            this.hexastack.setRotation({
                rot4dXY: this.parameters.rot4dXY,
                rot4dXZ: this.parameters.rot4dXZ,
                rot4dYZ: this.parameters.rot4dYZ,
                rot4dXW: this.parameters.rot4dXW,
                rot4dYW: this.parameters.rot4dYW,
                rot4dZW: this.parameters.rot4dZW
            });

            this.hexastack.coherence = this.parameters.coherence;
        }

        this.dimension = this.parameters.dimension;
    }

    /**
     * Update single parameter
     *
     * @param {string} name - Parameter name
     * @param {number} value - Parameter value
     */
    updateParameter(name, value) {
        this.parameters[name] = value;
        this.updateParameters({ [name]: value });
    }

    /**
     * Set variant (for gallery compatibility)
     *
     * @param {number} variant - Variant index
     */
    setVariant(variant) {
        this.currentVariant = variant % this.variantNames.length;

        // Map variant to parameters
        const baseGeometry = Math.floor(variant / 4);
        const subVariant = variant % 4;

        // Configure hexastack based on variant
        const states = [
            KirigamiState.DEPLOYED,
            KirigamiState.FOLDED,
            KirigamiState.GROUNDED
        ];

        // Set computational focus based on sub-variant
        const focuses = ['all', 'alpha', 'beta', 'gamma'];
        this.hexastack.setComputationalFocus(focuses[subVariant]);

        console.log(`🔮 HHC variant ${variant}: ${this.variantNames[variant]}`);
    }

    /**
     * Generate variant names
     *
     * @returns {string[]}
     */
    generateVariantNames() {
        const names = [];
        const bases = ['600-CELL', 'HEXASTACK', 'KIRIGAMI', 'MOIRÉ', 'Z-WORM', 'PILOT'];
        const types = ['DEPLOYED', 'FOLDED', 'RESONANT', 'QUANTUM'];

        for (const base of bases) {
            for (const type of types) {
                names.push(`${base} ${type}`);
            }
        }

        return names;
    }

    /**
     * Get current variant info
     *
     * @returns {Object}
     */
    getCurrentVariantInfo() {
        return {
            variant: this.currentVariant,
            name: this.variantNames[this.currentVariant],
            geometryType: Math.floor(this.currentVariant / 4)
        };
    }

    /**
     * Get current parameters (for saving)
     *
     * @returns {Object}
     */
    getParameters() {
        return { ...this.parameters, variant: this.currentVariant };
    }

    /**
     * Main render loop
     */
    render() {
        const now = performance.now();
        const deltaTime = this.lastFrameTime ? (now - this.lastFrameTime) / 1000 : 1/60;
        this.lastFrameTime = now;
        this.time += deltaTime * this.parameters.speed;

        // Update audio
        this.updateAudio();

        // Generate data signal from audio or animation
        let dataSignal;
        if (this.audioEnabled && this.audioData.energy > 0.01) {
            dataSignal = Hexastack600.audioToSignal(this.audioData);
        } else {
            // Generate animated signal
            dataSignal = this.generateAnimatedSignal();
        }

        // Process signal through hexastack
        this.hexastack.processSignal(Array.from(dataSignal));

        // Apply breathing animation in idle mode
        if (!this.audioEnabled || this.audioData.energy < 0.01) {
            this.hexastack.animateBreathing(this.parameters.speed);
        }

        // Update layer geometries with new transformations
        this.updateLayerGeometries();

        // Get render batch
        const renderBatch = this.hexastack.getRenderBatch();

        // Attach VAO info to render data
        for (let i = 0; i < renderBatch.length; i++) {
            renderBatch[i].vao = this.layerGeometries[i].vao;
            renderBatch[i].vertexCount = this.layerGeometries[i].vertexCount;
        }

        // Render with exclusion blending
        this.pipeline.renderAllLayers(renderBatch, {
            viewProj: this.viewProjMatrix,
            dimension: this.dimension
        });

        // Blit to screen
        this.pipeline.blitToScreen();

        // Callback
        if (this.onRender) {
            this.onRender({
                time: this.time,
                deltaTime,
                stats: this.hexastack.getStatistics()
            });
        }
    }

    /**
     * Generate animated data signal for demo mode
     *
     * @returns {Float32Array}
     */
    generateAnimatedSignal() {
        const signal = new Float32Array(6);
        const t = this.time;

        // Generate smooth oscillating signals with phase offsets
        for (let i = 0; i < 6; i++) {
            const phase = i * Math.PI / 3;
            const freq = 0.5 + i * 0.1;
            signal[i] = 0.5 + 0.4 * Math.sin(t * freq + phase);
        }

        // Add some chaos
        const chaosAmount = this.parameters.chaos;
        for (let i = 0; i < 6; i++) {
            signal[i] += (Math.random() - 0.5) * chaosAmount * 0.2;
            signal[i] = Math.max(0, Math.min(1, signal[i]));
        }

        return signal;
    }

    /**
     * Start the render loop
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastFrameTime = performance.now();

        const loop = () => {
            if (!this.isRunning) return;
            this.render();
            this.animationId = requestAnimationFrame(loop);
        };

        loop();
        console.log('▶️ HHC render loop started');
    }

    /**
     * Stop the render loop
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        console.log('⏹️ HHC render loop stopped');
    }

    /**
     * Set active state (VIB3 compatible)
     *
     * @param {boolean} active
     */
    setActive(active) {
        if (active) {
            this.start();
        } else {
            this.stop();
        }
    }

    /**
     * Reset the system
     */
    reset() {
        this.hexastack.reset();
        this.dataBrain.reset();
        this.time = 0;
    }

    /**
     * Get variant name
     *
     * @param {number} variant
     * @returns {string}
     */
    getVariantName(variant = this.currentVariant) {
        return this.variantNames[variant] || 'UNKNOWN';
    }

    /**
     * Destroy and clean up
     */
    destroy() {
        this.stop();

        if (this.pipeline) {
            this.pipeline.destroy();
            this.pipeline = null;
        }

        if (this.hexastack) {
            this.hexastack.destroy();
            this.hexastack = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        // Delete layer geometries
        if (this.gl && this.layerGeometries) {
            for (const geom of this.layerGeometries) {
                if (geom.vao) this.gl.deleteVertexArray(geom.vao);
                if (geom.buffer) this.gl.deleteBuffer(geom.buffer);
            }
        }
        this.layerGeometries = [];

        this.gl = null;
        this.canvas = null;

        console.log('🧹 HHC destroyed');
    }
}

export default KirigamiHyperComputer;
