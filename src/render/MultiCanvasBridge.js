/**
 * MultiCanvasBridge - Multi-canvas rendering orchestrator for VIB3+
 *
 * The Quantum and Holographic visualization systems use a 5-layer canvas
 * architecture (background, shadow, content, highlight, accent) where each
 * layer has its own WebGL/WebGPU context. This bridge manages multiple
 * UnifiedRenderBridge instances — one per canvas — and coordinates shader
 * compilation, uniform updates, and rendering across all layers.
 *
 * Usage:
 *   const multi = new MultiCanvasBridge();
 *   await multi.initialize({
 *       canvases: {
 *           background: document.getElementById('bg-canvas'),
 *           shadow: document.getElementById('shadow-canvas'),
 *           content: document.getElementById('content-canvas'),
 *           highlight: document.getElementById('highlight-canvas'),
 *           accent: document.getElementById('accent-canvas'),
 *       },
 *       preferWebGPU: true
 *   });
 *
 *   multi.compileShaderAll('holographic', shaderSources);
 *   multi.setSharedUniforms({ u_time: t, u_resolution: [w, h] });
 *   multi.setLayerUniforms('background', { u_layerOpacity: 0.2, u_densityMult: 0.4 });
 *   multi.renderAll('holographic');
 */

import { UnifiedRenderBridge } from './UnifiedRenderBridge.js';

/**
 * Default layer configuration matching the VIB3+ holographic system.
 * Each layer has role-specific opacity, density, and speed multipliers.
 */
const DEFAULT_LAYER_CONFIG = {
    background: { layerScale: 1.0, layerOpacity: 0.2, densityMult: 0.4, speedMult: 0.2 },
    shadow:     { layerScale: 1.0, layerOpacity: 0.4, densityMult: 0.8, speedMult: 0.3 },
    content:    { layerScale: 1.0, layerOpacity: 0.8, densityMult: 1.0, speedMult: 0.5 },
    highlight:  { layerScale: 1.0, layerOpacity: 0.6, densityMult: 1.5, speedMult: 0.8 },
    accent:     { layerScale: 1.0, layerOpacity: 0.3, densityMult: 2.5, speedMult: 0.4 }
};

/**
 * Standard layer order (back to front).
 */
const LAYER_ORDER = ['background', 'shadow', 'content', 'highlight', 'accent'];

export class MultiCanvasBridge {
    constructor() {
        /** @type {Map<string, UnifiedRenderBridge>} layer name → bridge */
        this._bridges = new Map();

        /** @type {Map<string, HTMLCanvasElement>} layer name → canvas */
        this._canvases = new Map();

        /** @type {object} Shared uniforms applied to all layers */
        this._sharedUniforms = {};

        /** @type {Map<string, object>} Per-layer uniform overrides */
        this._layerUniforms = new Map();

        /** @type {Map<string, object>} Per-layer config (opacity, density, speed) */
        this._layerConfig = new Map();

        /** @type {boolean} */
        this._initialized = false;

        /** @type {string|null} Active backend type (set after init) */
        this._backendType = null;
    }

    /**
     * Initialize bridges for all canvases.
     *
     * @param {object} options
     * @param {object} options.canvases - Map of layer name → HTMLCanvasElement
     * @param {boolean} [options.preferWebGPU=true] - Try WebGPU for each canvas
     * @param {boolean} [options.debug=false]
     * @param {object} [options.layerConfig] - Override default layer configuration
     * @returns {Promise<void>}
     */
    async initialize(options) {
        const {
            canvases,
            preferWebGPU = true,
            debug = false,
            layerConfig = {}
        } = options;

        // Initialize bridges in parallel
        const entries = Object.entries(canvases);
        const results = await Promise.allSettled(
            entries.map(async ([layerName, canvas]) => {
                const bridge = await UnifiedRenderBridge.create(canvas, { preferWebGPU, debug });
                return { layerName, canvas, bridge };
            })
        );

        for (const result of results) {
            if (result.status === 'fulfilled') {
                const { layerName, canvas, bridge } = result.value;
                this._bridges.set(layerName, bridge);
                this._canvases.set(layerName, canvas);

                // Apply layer config (user override > default)
                const config = {
                    ...(DEFAULT_LAYER_CONFIG[layerName] || {}),
                    ...(layerConfig[layerName] || {})
                };
                this._layerConfig.set(layerName, config);
                this._layerUniforms.set(layerName, {});

                if (!this._backendType) {
                    this._backendType = bridge.getBackendType();
                }
            } else {
                console.error(`MultiCanvasBridge: Failed to init layer "${result.reason}"`);
            }
        }

        this._initialized = this._bridges.size > 0;
        if (debug) {
            console.log(`MultiCanvasBridge: ${this._bridges.size}/${entries.length} layers initialized (${this._backendType})`);
        }
    }

    /**
     * Check if the bridge is initialized.
     * @returns {boolean}
     */
    get initialized() {
        return this._initialized;
    }

    /**
     * Get the active backend type.
     * @returns {string|null}
     */
    get backendType() {
        return this._backendType;
    }

    /**
     * Get layer names in render order.
     * @returns {string[]}
     */
    get layerNames() {
        return LAYER_ORDER.filter(name => this._bridges.has(name));
    }

    /**
     * Get the bridge for a specific layer.
     * @param {string} layerName
     * @returns {UnifiedRenderBridge|undefined}
     */
    getBridge(layerName) {
        return this._bridges.get(layerName);
    }

    // ========================================================================
    // Shader Compilation
    // ========================================================================

    /**
     * Compile shaders on all layer bridges.
     *
     * @param {string} shaderName - e.g. 'holographic'
     * @param {object} sources - { glslVertex, glslFragment, wgslFragment }
     * @returns {{ succeeded: string[], failed: string[] }}
     */
    compileShaderAll(shaderName, sources) {
        const succeeded = [];
        const failed = [];

        for (const [layerName, bridge] of this._bridges) {
            const ok = bridge.compileShader(shaderName, sources);
            if (ok) {
                succeeded.push(layerName);
            } else {
                failed.push(layerName);
            }
        }

        return { succeeded, failed };
    }

    /**
     * Compile a shader on a single layer.
     *
     * @param {string} layerName
     * @param {string} shaderName
     * @param {object} sources
     * @returns {boolean}
     */
    compileShader(layerName, shaderName, sources) {
        const bridge = this._bridges.get(layerName);
        if (!bridge) return false;
        return bridge.compileShader(shaderName, sources);
    }

    // ========================================================================
    // Uniform Management
    // ========================================================================

    /**
     * Set uniforms shared across all layers (e.g. time, resolution, geometry).
     *
     * @param {object} uniforms
     */
    setSharedUniforms(uniforms) {
        this._sharedUniforms = uniforms;
    }

    /**
     * Set per-layer uniform overrides (e.g. layerOpacity, densityMult).
     *
     * @param {string} layerName
     * @param {object} uniforms
     */
    setLayerUniforms(layerName, uniforms) {
        const existing = this._layerUniforms.get(layerName) || {};
        this._layerUniforms.set(layerName, { ...existing, ...uniforms });
    }

    /**
     * Update the layer configuration.
     *
     * @param {string} layerName
     * @param {object} config - Partial config update
     */
    setLayerConfig(layerName, config) {
        const existing = this._layerConfig.get(layerName) || {};
        this._layerConfig.set(layerName, { ...existing, ...config });
    }

    /**
     * Build the merged uniform set for a specific layer.
     *
     * Priority: shared < layer config < layer overrides
     *
     * @param {string} layerName
     * @returns {object}
     */
    _buildLayerUniforms(layerName) {
        const config = this._layerConfig.get(layerName) || {};
        const overrides = this._layerUniforms.get(layerName) || {};

        return {
            ...this._sharedUniforms,
            u_layerScale: config.layerScale || 1.0,
            u_layerOpacity: config.layerOpacity || 1.0,
            u_densityMult: config.densityMult || 1.0,
            u_speedMult: config.speedMult || 1.0,
            ...overrides
        };
    }

    // ========================================================================
    // Rendering
    // ========================================================================

    /**
     * Render all layers in order using the named shader.
     *
     * @param {string} shaderName - Shader program to use
     * @param {object} [options]
     * @param {number[]} [options.clearColor] - RGBA clear color
     */
    renderAll(shaderName, options = {}) {
        for (const layerName of this.layerNames) {
            this.renderLayer(layerName, shaderName, options);
        }
    }

    /**
     * Render a single layer.
     *
     * @param {string} layerName
     * @param {string} shaderName
     * @param {object} [options]
     */
    renderLayer(layerName, shaderName, options = {}) {
        const bridge = this._bridges.get(layerName);
        if (!bridge) return;

        const uniforms = this._buildLayerUniforms(layerName);
        bridge.setUniforms(uniforms);
        bridge.render(shaderName, {
            clearColor: options.clearColor || [0, 0, 0, 0],
            clear: true
        });
    }

    // ========================================================================
    // Canvas Management
    // ========================================================================

    /**
     * Resize all canvases.
     *
     * @param {number} width - CSS width
     * @param {number} height - CSS height
     * @param {number} [pixelRatio=1]
     */
    resizeAll(width, height, pixelRatio = 1) {
        for (const [, bridge] of this._bridges) {
            bridge.resize(width, height, pixelRatio);
        }
    }

    /**
     * Get the number of active layers.
     * @returns {number}
     */
    get layerCount() {
        return this._bridges.size;
    }

    // ========================================================================
    // Cleanup
    // ========================================================================

    /**
     * Dispose all bridges and clear state.
     */
    dispose() {
        for (const [, bridge] of this._bridges) {
            bridge.dispose();
        }
        this._bridges.clear();
        this._canvases.clear();
        this._layerUniforms.clear();
        this._layerConfig.clear();
        this._sharedUniforms = {};
        this._initialized = false;
        this._backendType = null;
    }
}

export default MultiCanvasBridge;
