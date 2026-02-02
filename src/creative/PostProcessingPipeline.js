/**
 * PostProcessingPipeline.js - VIB3+ Composable Post-Processing FX Pipeline
 *
 * Provides a chain of composable visual effects applied as a post-processing
 * stage on top of the VIB3+ visualization output. Effects are implemented via
 * a combination of CSS filters and off-screen canvas pixel manipulation,
 * requiring no WebGL dependency. Effects can be freely reordered, enabled,
 * disabled, and parameterized at runtime.
 *
 * @module creative/PostProcessingPipeline
 * @version 1.0.0
 * @author VIB3+ Creative Tooling - Phase B
 */

/**
 * @typedef {Object} EffectDefinition
 * @property {string} name - Effect identifier
 * @property {boolean} enabled - Whether the effect is currently active
 * @property {string} type - 'css' for CSS filter, 'canvas' for pixel manipulation, 'hybrid' for both
 * @property {Object<string, number>} params - Current parameter values
 * @property {Object<string, {min: number, max: number, default: number, description: string}>} paramDefs - Parameter definitions
 * @property {Function} [applyCss] - Returns a CSS filter string fragment
 * @property {Function} [applyCanvas] - Applies pixel manipulation to an ImageData
 */

/**
 * @typedef {Object} PresetChain
 * @property {string} name - Preset chain name
 * @property {string} description - Human-readable description
 * @property {Array<{effect: string, params: Object}>} effects - Ordered list of effects with params
 */

/**
 * Composable post-processing FX pipeline for VIB3+ visualizations.
 *
 * Applies visual effects as a post-processing stage using CSS filters and
 * canvas-based pixel manipulation. No WebGL dependency is required. Effects
 * can be chained in any order and individually toggled.
 *
 * @example
 * const pipeline = new PostProcessingPipeline(document.getElementById('viz-container'));
 *
 * // Add individual effects
 * pipeline.addEffect('bloom', { strength: 0.6, radius: 8 });
 * pipeline.addEffect('scanlines', { spacing: 3, opacity: 0.15 });
 * pipeline.addEffect('vignette', { strength: 0.4 });
 *
 * // Apply all active effects
 * pipeline.apply();
 *
 * // Load a preset chain
 * pipeline.loadPresetChain('Retro CRT');
 */
export class PostProcessingPipeline {
    /**
     * Create a new PostProcessingPipeline.
     *
     * @param {HTMLElement} targetElement - The DOM element to apply effects to.
     *   Typically the main visualization container or a canvas wrapper.
     */
    constructor(targetElement) {
        if (!targetElement) {
            throw new Error('PostProcessingPipeline requires a target DOM element');
        }

        /** @type {HTMLElement} */
        this.target = targetElement;

        /** @type {Map<string, EffectDefinition>} All registered effect definitions */
        this.effects = new Map();

        /** @type {string[]} Ordered list of effect names in the chain */
        this.chain = [];

        /** @type {boolean} Master enable/disable switch */
        this.enabled = true;

        /** @type {HTMLCanvasElement|null} Off-screen canvas for pixel manipulation */
        this._offscreenCanvas = null;

        /** @type {CanvasRenderingContext2D|null} */
        this._offscreenCtx = null;

        /** @type {Map<string, PresetChain>} Built-in preset chains */
        this._presetChains = new Map();

        /** @type {string|null} Currently active preset chain name */
        this._activePresetChain = null;

        /** @type {string} Stores original CSS filter before pipeline was applied */
        this._originalFilter = '';

        this._initBuiltInEffects();
        this._initPresetChains();
    }

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    /**
     * Register all built-in effects.
     * @private
     */
    _initBuiltInEffects() {
        // --- CSS Filter Effects ---

        this._registerEffect({
            name: 'bloom',
            type: 'css',
            enabled: false,
            params: { strength: 0.5, radius: 6 },
            paramDefs: {
                strength: { min: 0, max: 2, default: 0.5, description: 'Bloom brightness boost' },
                radius: { min: 1, max: 20, default: 6, description: 'Bloom blur radius (px)' }
            },
            applyCss(params) {
                // Bloom approximated via brightness + blur layering
                return `brightness(${1 + params.strength * 0.5})`;
            }
        });

        this._registerEffect({
            name: 'blur',
            type: 'css',
            enabled: false,
            params: { radius: 2 },
            paramDefs: {
                radius: { min: 0, max: 20, default: 2, description: 'Blur radius (px)' }
            },
            applyCss(params) {
                return `blur(${params.radius}px)`;
            }
        });

        this._registerEffect({
            name: 'hueRotate',
            type: 'css',
            enabled: false,
            params: { angle: 0 },
            paramDefs: {
                angle: { min: 0, max: 360, default: 0, description: 'Hue rotation angle (degrees)' }
            },
            applyCss(params) {
                return `hue-rotate(${params.angle}deg)`;
            }
        });

        this._registerEffect({
            name: 'invert',
            type: 'css',
            enabled: false,
            params: { amount: 1.0 },
            paramDefs: {
                amount: { min: 0, max: 1, default: 1.0, description: 'Inversion amount (0-1)' }
            },
            applyCss(params) {
                return `invert(${params.amount})`;
            }
        });

        this._registerEffect({
            name: 'sharpen',
            type: 'css',
            enabled: false,
            params: { amount: 1.5 },
            paramDefs: {
                amount: { min: 1, max: 5, default: 1.5, description: 'Contrast sharpen amount' }
            },
            applyCss(params) {
                return `contrast(${params.amount})`;
            }
        });

        // --- Canvas Pixel Effects ---

        this._registerEffect({
            name: 'chromaticAberration',
            type: 'canvas',
            enabled: false,
            params: { offset: 3, angle: 0 },
            paramDefs: {
                offset: { min: 1, max: 20, default: 3, description: 'Color channel offset (px)' },
                angle: { min: 0, max: 360, default: 0, description: 'Aberration angle (degrees)' }
            },
            applyCanvas(imageData, params) {
                const { width, height, data } = imageData;
                const output = new Uint8ClampedArray(data.length);
                const rad = (params.angle * Math.PI) / 180;
                const ox = Math.round(Math.cos(rad) * params.offset);
                const oy = Math.round(Math.sin(rad) * params.offset);

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const i = (y * width + x) * 4;

                        // Red channel shifted
                        const rx = Math.min(width - 1, Math.max(0, x + ox));
                        const ry = Math.min(height - 1, Math.max(0, y + oy));
                        const ri = (ry * width + rx) * 4;

                        // Blue channel shifted opposite
                        const bx = Math.min(width - 1, Math.max(0, x - ox));
                        const by = Math.min(height - 1, Math.max(0, y - oy));
                        const bi = (by * width + bx) * 4;

                        output[i] = data[ri];         // R from offset position
                        output[i + 1] = data[i + 1];  // G stays
                        output[i + 2] = data[bi + 2]; // B from opposite offset
                        output[i + 3] = data[i + 3];  // A stays
                    }
                }

                imageData.data.set(output);
                return imageData;
            }
        });

        this._registerEffect({
            name: 'filmGrain',
            type: 'canvas',
            enabled: false,
            params: { intensity: 0.15, size: 1 },
            paramDefs: {
                intensity: { min: 0, max: 1, default: 0.15, description: 'Grain noise intensity' },
                size: { min: 1, max: 4, default: 1, description: 'Grain particle size' }
            },
            applyCanvas(imageData, params) {
                const { data } = imageData;
                const strength = params.intensity * 80;
                const step = Math.max(1, Math.round(params.size));

                for (let i = 0; i < data.length; i += 4 * step) {
                    const noise = (Math.random() - 0.5) * strength;
                    data[i] = Math.min(255, Math.max(0, data[i] + noise));
                    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
                    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
                }

                return imageData;
            }
        });

        this._registerEffect({
            name: 'vignette',
            type: 'canvas',
            enabled: false,
            params: { strength: 0.5, radius: 0.7 },
            paramDefs: {
                strength: { min: 0, max: 1, default: 0.5, description: 'Darkening strength' },
                radius: { min: 0.1, max: 1.5, default: 0.7, description: 'Vignette inner radius' }
            },
            applyCanvas(imageData, params) {
                const { width, height, data } = imageData;
                const cx = width / 2;
                const cy = height / 2;
                const maxDist = Math.sqrt(cx * cx + cy * cy);
                const innerRadius = params.radius;
                const strength = params.strength;

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const dx = (x - cx) / cx;
                        const dy = (y - cy) / cy;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const vignette = 1 - Math.max(0, (dist - innerRadius) / (1.5 - innerRadius)) * strength;
                        const i = (y * width + x) * 4;
                        data[i] = data[i] * vignette;
                        data[i + 1] = data[i + 1] * vignette;
                        data[i + 2] = data[i + 2] * vignette;
                    }
                }

                return imageData;
            }
        });

        this._registerEffect({
            name: 'scanlines',
            type: 'canvas',
            enabled: false,
            params: { spacing: 3, opacity: 0.2, thickness: 1 },
            paramDefs: {
                spacing: { min: 1, max: 10, default: 3, description: 'Line spacing (px)' },
                opacity: { min: 0, max: 1, default: 0.2, description: 'Scanline darkness' },
                thickness: { min: 1, max: 4, default: 1, description: 'Line thickness (px)' }
            },
            applyCanvas(imageData, params) {
                const { width, height, data } = imageData;
                const spacing = Math.max(1, Math.round(params.spacing));
                const thickness = Math.max(1, Math.round(params.thickness));
                const darken = 1 - params.opacity;

                for (let y = 0; y < height; y++) {
                    if (y % spacing < thickness) {
                        for (let x = 0; x < width; x++) {
                            const i = (y * width + x) * 4;
                            data[i] = data[i] * darken;
                            data[i + 1] = data[i + 1] * darken;
                            data[i + 2] = data[i + 2] * darken;
                        }
                    }
                }

                return imageData;
            }
        });

        this._registerEffect({
            name: 'glitch',
            type: 'canvas',
            enabled: false,
            params: { intensity: 0.3, blockSize: 8, frequency: 0.5 },
            paramDefs: {
                intensity: { min: 0, max: 1, default: 0.3, description: 'Glitch displacement intensity' },
                blockSize: { min: 2, max: 50, default: 8, description: 'Glitch block height (px)' },
                frequency: { min: 0, max: 1, default: 0.5, description: 'Probability of a block glitching' }
            },
            applyCanvas(imageData, params) {
                const { width, height, data } = imageData;
                const output = new Uint8ClampedArray(data);
                const blockH = Math.max(2, Math.round(params.blockSize));
                const maxShift = Math.round(width * params.intensity * 0.3);

                for (let y = 0; y < height; y += blockH) {
                    if (Math.random() > params.frequency) continue;

                    const shift = Math.round((Math.random() - 0.5) * 2 * maxShift);
                    const blockEnd = Math.min(y + blockH, height);

                    for (let row = y; row < blockEnd; row++) {
                        for (let x = 0; x < width; x++) {
                            const srcX = Math.min(width - 1, Math.max(0, x + shift));
                            const dstIdx = (row * width + x) * 4;
                            const srcIdx = (row * width + srcX) * 4;
                            output[dstIdx] = data[srcIdx];
                            output[dstIdx + 1] = data[srcIdx + 1];
                            output[dstIdx + 2] = data[srcIdx + 2];
                            output[dstIdx + 3] = data[srcIdx + 3];
                        }
                    }
                }

                imageData.data.set(output);
                return imageData;
            }
        });

        this._registerEffect({
            name: 'pixelate',
            type: 'canvas',
            enabled: false,
            params: { size: 4 },
            paramDefs: {
                size: { min: 1, max: 32, default: 4, description: 'Pixel block size' }
            },
            applyCanvas(imageData, params) {
                const { width, height, data } = imageData;
                const size = Math.max(1, Math.round(params.size));

                for (let y = 0; y < height; y += size) {
                    for (let x = 0; x < width; x += size) {
                        // Average the block
                        let r = 0, g = 0, b = 0, count = 0;
                        for (let dy = 0; dy < size && y + dy < height; dy++) {
                            for (let dx = 0; dx < size && x + dx < width; dx++) {
                                const i = ((y + dy) * width + (x + dx)) * 4;
                                r += data[i];
                                g += data[i + 1];
                                b += data[i + 2];
                                count++;
                            }
                        }
                        r = Math.round(r / count);
                        g = Math.round(g / count);
                        b = Math.round(b / count);

                        // Fill the block
                        for (let dy = 0; dy < size && y + dy < height; dy++) {
                            for (let dx = 0; dx < size && x + dx < width; dx++) {
                                const i = ((y + dy) * width + (x + dx)) * 4;
                                data[i] = r;
                                data[i + 1] = g;
                                data[i + 2] = b;
                            }
                        }
                    }
                }

                return imageData;
            }
        });

        this._registerEffect({
            name: 'kaleidoscope',
            type: 'canvas',
            enabled: false,
            params: { segments: 6, rotation: 0 },
            paramDefs: {
                segments: { min: 2, max: 16, default: 6, description: 'Number of mirror segments' },
                rotation: { min: 0, max: 360, default: 0, description: 'Rotation angle (degrees)' }
            },
            applyCanvas(imageData, params) {
                const { width, height, data } = imageData;
                const output = new Uint8ClampedArray(data);
                const cx = width / 2;
                const cy = height / 2;
                const segments = Math.max(2, Math.round(params.segments));
                const segAngle = (2 * Math.PI) / segments;
                const rotRad = (params.rotation * Math.PI) / 180;

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const dx = x - cx;
                        const dy = y - cy;
                        let angle = Math.atan2(dy, dx) - rotRad;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        // Normalize angle to first segment
                        angle = ((angle % segAngle) + segAngle) % segAngle;

                        // Mirror within segment
                        if (angle > segAngle / 2) {
                            angle = segAngle - angle;
                        }

                        angle += rotRad;

                        const srcX = Math.round(cx + Math.cos(angle) * dist);
                        const srcY = Math.round(cy + Math.sin(angle) * dist);

                        const dstIdx = (y * width + x) * 4;

                        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
                            const srcIdx = (srcY * width + srcX) * 4;
                            output[dstIdx] = data[srcIdx];
                            output[dstIdx + 1] = data[srcIdx + 1];
                            output[dstIdx + 2] = data[srcIdx + 2];
                            output[dstIdx + 3] = data[srcIdx + 3];
                        }
                    }
                }

                imageData.data.set(output);
                return imageData;
            }
        });

        this._registerEffect({
            name: 'mirror',
            type: 'canvas',
            enabled: false,
            params: { axis: 0, position: 0.5 },
            paramDefs: {
                axis: { min: 0, max: 1, default: 0, description: '0 = horizontal mirror, 1 = vertical mirror' },
                position: { min: 0, max: 1, default: 0.5, description: 'Mirror position (0-1)' }
            },
            applyCanvas(imageData, params) {
                const { width, height, data } = imageData;
                const output = new Uint8ClampedArray(data);
                const isVertical = Math.round(params.axis) === 1;

                if (isVertical) {
                    const mirrorY = Math.round(height * params.position);
                    for (let y = mirrorY; y < height; y++) {
                        const srcY = mirrorY - (y - mirrorY) - 1;
                        if (srcY < 0) continue;
                        for (let x = 0; x < width; x++) {
                            const dstIdx = (y * width + x) * 4;
                            const srcIdx = (srcY * width + x) * 4;
                            output[dstIdx] = data[srcIdx];
                            output[dstIdx + 1] = data[srcIdx + 1];
                            output[dstIdx + 2] = data[srcIdx + 2];
                            output[dstIdx + 3] = data[srcIdx + 3];
                        }
                    }
                } else {
                    const mirrorX = Math.round(width * params.position);
                    for (let y = 0; y < height; y++) {
                        for (let x = mirrorX; x < width; x++) {
                            const srcX = mirrorX - (x - mirrorX) - 1;
                            if (srcX < 0) continue;
                            const dstIdx = (y * width + x) * 4;
                            const srcIdx = (y * width + srcX) * 4;
                            output[dstIdx] = data[srcIdx];
                            output[dstIdx + 1] = data[srcIdx + 1];
                            output[dstIdx + 2] = data[srcIdx + 2];
                            output[dstIdx + 3] = data[srcIdx + 3];
                        }
                    }
                }

                imageData.data.set(output);
                return imageData;
            }
        });

        this._registerEffect({
            name: 'posterize',
            type: 'canvas',
            enabled: false,
            params: { levels: 4 },
            paramDefs: {
                levels: { min: 2, max: 32, default: 4, description: 'Number of color levels per channel' }
            },
            applyCanvas(imageData, params) {
                const { data } = imageData;
                const levels = Math.max(2, Math.round(params.levels));
                const factor = 255 / (levels - 1);

                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.round(Math.round(data[i] / factor) * factor);
                    data[i + 1] = Math.round(Math.round(data[i + 1] / factor) * factor);
                    data[i + 2] = Math.round(Math.round(data[i + 2] / factor) * factor);
                }

                return imageData;
            }
        });
    }

    /**
     * Initialize built-in preset chains.
     * @private
     */
    _initPresetChains() {
        const chains = [
            {
                name: 'Retro CRT',
                description: 'Classic CRT monitor look with scanlines, chromatic aberration, and vignette',
                effects: [
                    { effect: 'scanlines', params: { spacing: 3, opacity: 0.2, thickness: 1 } },
                    { effect: 'chromaticAberration', params: { offset: 2, angle: 0 } },
                    { effect: 'vignette', params: { strength: 0.6, radius: 0.6 } },
                    { effect: 'filmGrain', params: { intensity: 0.08, size: 1 } },
                    { effect: 'bloom', params: { strength: 0.3, radius: 4 } }
                ]
            },
            {
                name: 'Holographic',
                description: 'Iridescent holographic display with color shifts and bloom',
                effects: [
                    { effect: 'hueRotate', params: { angle: 30 } },
                    { effect: 'bloom', params: { strength: 0.7, radius: 10 } },
                    { effect: 'chromaticAberration', params: { offset: 5, angle: 45 } }
                ]
            },
            {
                name: 'Glitch Art',
                description: 'Aggressive digital glitch aesthetic',
                effects: [
                    { effect: 'glitch', params: { intensity: 0.6, blockSize: 12, frequency: 0.7 } },
                    { effect: 'chromaticAberration', params: { offset: 8, angle: 0 } },
                    { effect: 'posterize', params: { levels: 6 } },
                    { effect: 'scanlines', params: { spacing: 4, opacity: 0.15, thickness: 1 } }
                ]
            },
            {
                name: 'Clean',
                description: 'Minimal processing, just subtle polish',
                effects: [
                    { effect: 'sharpen', params: { amount: 1.2 } },
                    { effect: 'vignette', params: { strength: 0.15, radius: 0.9 } }
                ]
            },
            {
                name: 'Cinematic',
                description: 'Film-grade look with grain, vignette, and subtle color grading',
                effects: [
                    { effect: 'vignette', params: { strength: 0.45, radius: 0.65 } },
                    { effect: 'filmGrain', params: { intensity: 0.1, size: 1 } },
                    { effect: 'bloom', params: { strength: 0.2, radius: 6 } },
                    { effect: 'sharpen', params: { amount: 1.15 } }
                ]
            },
            {
                name: 'Psychedelic',
                description: 'Wild color shifts with kaleidoscope and inversion',
                effects: [
                    { effect: 'kaleidoscope', params: { segments: 8, rotation: 15 } },
                    { effect: 'hueRotate', params: { angle: 90 } },
                    { effect: 'bloom', params: { strength: 0.6, radius: 8 } },
                    { effect: 'chromaticAberration', params: { offset: 4, angle: 120 } }
                ]
            },
            {
                name: 'Lo-Fi',
                description: 'Low fidelity retro aesthetic',
                effects: [
                    { effect: 'pixelate', params: { size: 3 } },
                    { effect: 'posterize', params: { levels: 8 } },
                    { effect: 'filmGrain', params: { intensity: 0.2, size: 2 } },
                    { effect: 'vignette', params: { strength: 0.35, radius: 0.7 } }
                ]
            }
        ];

        for (const chain of chains) {
            this._presetChains.set(chain.name, chain);
        }
    }

    /**
     * Register an effect definition.
     *
     * @param {EffectDefinition} def - Effect definition
     * @private
     */
    _registerEffect(def) {
        this.effects.set(def.name, {
            name: def.name,
            type: def.type,
            enabled: def.enabled || false,
            params: { ...def.params },
            paramDefs: def.paramDefs ? { ...def.paramDefs } : {},
            applyCss: def.applyCss || null,
            applyCanvas: def.applyCanvas || null
        });
    }

    // -------------------------------------------------------------------------
    // Public API - Effect Management
    // -------------------------------------------------------------------------

    /**
     * Add an effect to the active chain (enables it and appends to chain order).
     *
     * @param {string} name - Effect name
     * @param {Object<string, number>} [params] - Optional parameter overrides
     * @returns {boolean} true if the effect was added
     */
    addEffect(name, params = {}) {
        const effect = this.effects.get(name);
        if (!effect) {
            console.warn(`PostProcessingPipeline: Unknown effect "${name}"`);
            return false;
        }

        // Apply parameter overrides
        if (params && typeof params === 'object') {
            for (const [key, value] of Object.entries(params)) {
                if (key in effect.paramDefs) {
                    const def = effect.paramDefs[key];
                    effect.params[key] = this._clamp(Number(value), def.min, def.max);
                }
            }
        }

        effect.enabled = true;

        // Add to chain if not already present
        if (!this.chain.includes(name)) {
            this.chain.push(name);
        }

        return true;
    }

    /**
     * Remove an effect from the active chain (disables it).
     *
     * @param {string} name - Effect name
     * @returns {boolean} true if the effect was removed
     */
    removeEffect(name) {
        const effect = this.effects.get(name);
        if (!effect) {
            return false;
        }

        effect.enabled = false;
        const idx = this.chain.indexOf(name);
        if (idx >= 0) {
            this.chain.splice(idx, 1);
        }

        return true;
    }

    /**
     * Toggle an effect on or off.
     *
     * @param {string} name - Effect name
     * @returns {boolean} New enabled state, or false if effect not found
     */
    toggleEffect(name) {
        const effect = this.effects.get(name);
        if (!effect) return false;

        if (effect.enabled) {
            this.removeEffect(name);
            return false;
        } else {
            this.addEffect(name);
            return true;
        }
    }

    /**
     * Set a parameter on an effect.
     *
     * @param {string} effectName - Effect name
     * @param {string} param - Parameter name
     * @param {number} value - New parameter value
     * @returns {boolean} true if the parameter was set
     */
    setEffectParam(effectName, param, value) {
        const effect = this.effects.get(effectName);
        if (!effect) {
            console.warn(`PostProcessingPipeline: Unknown effect "${effectName}"`);
            return false;
        }

        const def = effect.paramDefs[param];
        if (!def) {
            console.warn(`PostProcessingPipeline: Unknown param "${param}" on effect "${effectName}"`);
            return false;
        }

        effect.params[param] = this._clamp(Number(value), def.min, def.max);
        return true;
    }

    /**
     * Set multiple parameters on an effect at once.
     *
     * @param {string} effectName - Effect name
     * @param {Object<string, number>} params - Parameter key-value pairs
     */
    setEffectParams(effectName, params) {
        if (!params || typeof params !== 'object') return;
        for (const [key, value] of Object.entries(params)) {
            this.setEffectParam(effectName, key, value);
        }
    }

    /**
     * Reorder the effects chain.
     *
     * @param {string[]} newOrder - Array of effect names in desired order.
     *   Only effects that are currently in the chain are kept.
     */
    reorder(newOrder) {
        if (!Array.isArray(newOrder)) {
            console.warn('PostProcessingPipeline: reorder expects an array of effect names');
            return;
        }

        // Validate: keep only effects that exist and are in the current chain
        const validOrder = newOrder.filter(name =>
            this.effects.has(name) && this.chain.includes(name)
        );

        // Add any effects that were in the chain but not in the new order (at the end)
        for (const name of this.chain) {
            if (!validOrder.includes(name)) {
                validOrder.push(name);
            }
        }

        this.chain = validOrder;
    }

    // -------------------------------------------------------------------------
    // Public API - Applying Effects
    // -------------------------------------------------------------------------

    /**
     * Apply all enabled effects in the current chain order.
     *
     * CSS filter effects are combined into a single filter string and applied
     * to the target element's style. Canvas effects are applied to any
     * `<canvas>` children of the target element.
     */
    apply() {
        if (!this.enabled) {
            this._clearEffects();
            return;
        }

        // Separate CSS and canvas effects in chain order
        const cssEffects = [];
        const canvasEffects = [];

        for (const name of this.chain) {
            const effect = this.effects.get(name);
            if (!effect || !effect.enabled) continue;

            if ((effect.type === 'css' || effect.type === 'hybrid') && effect.applyCss) {
                cssEffects.push(effect);
            }
            if ((effect.type === 'canvas' || effect.type === 'hybrid') && effect.applyCanvas) {
                canvasEffects.push(effect);
            }
        }

        // Apply CSS filters
        this._applyCssFilters(cssEffects);

        // Apply canvas effects
        if (canvasEffects.length > 0) {
            this._applyCanvasEffects(canvasEffects);
        }
    }

    /**
     * Remove all applied effects and restore the target element.
     */
    clear() {
        this._clearEffects();
        for (const [, effect] of this.effects) {
            effect.enabled = false;
        }
        this.chain = [];
        this._activePresetChain = null;
    }

    // -------------------------------------------------------------------------
    // Public API - Preset Chains
    // -------------------------------------------------------------------------

    /**
     * Load and apply a preset effect chain by name.
     *
     * @param {string} name - Preset chain name
     * @returns {boolean} true if the preset was found and applied
     */
    loadPresetChain(name) {
        const preset = this._presetChains.get(name);
        if (!preset) {
            console.warn(`PostProcessingPipeline: Unknown preset chain "${name}"`);
            return false;
        }

        // Clear current chain
        this.clear();

        // Apply each effect in the preset
        for (const { effect, params } of preset.effects) {
            this.addEffect(effect, params);
        }

        this._activePresetChain = name;
        this.apply();
        return true;
    }

    /**
     * Get a list of all available preset chains.
     *
     * @returns {Array<{name: string, description: string}>}
     */
    getPresetChains() {
        const list = [];
        for (const [, chain] of this._presetChains) {
            list.push({ name: chain.name, description: chain.description });
        }
        return list;
    }

    /**
     * Get the currently active preset chain name.
     *
     * @returns {string|null}
     */
    getActivePresetChain() {
        return this._activePresetChain;
    }

    // -------------------------------------------------------------------------
    // Public API - Queries
    // -------------------------------------------------------------------------

    /**
     * Get all available effects and their current state.
     *
     * @returns {Array<{name: string, enabled: boolean, type: string, params: Object, paramDefs: Object}>}
     */
    getEffects() {
        const list = [];
        for (const [, effect] of this.effects) {
            list.push({
                name: effect.name,
                enabled: effect.enabled,
                type: effect.type,
                params: { ...effect.params },
                paramDefs: { ...effect.paramDefs }
            });
        }
        return list;
    }

    /**
     * Get the current ordered chain of enabled effects.
     *
     * @returns {string[]}
     */
    getChain() {
        return [...this.chain];
    }

    /**
     * Get details of a specific effect.
     *
     * @param {string} name - Effect name
     * @returns {{name: string, enabled: boolean, type: string, params: Object, paramDefs: Object}|null}
     */
    getEffect(name) {
        const effect = this.effects.get(name);
        if (!effect) return null;
        return {
            name: effect.name,
            enabled: effect.enabled,
            type: effect.type,
            params: { ...effect.params },
            paramDefs: { ...effect.paramDefs }
        };
    }

    // -------------------------------------------------------------------------
    // Public API - Serialization
    // -------------------------------------------------------------------------

    /**
     * Export the current pipeline state for storage.
     *
     * @returns {Object} Serializable pipeline state
     */
    exportState() {
        const chainState = this.chain.map(name => {
            const effect = this.effects.get(name);
            return {
                effect: name,
                enabled: effect ? effect.enabled : false,
                params: effect ? { ...effect.params } : {}
            };
        });

        return {
            type: 'vib3-postprocess-pipeline',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            enabled: this.enabled,
            chain: chainState
        };
    }

    /**
     * Import a pipeline state from serialized data.
     *
     * @param {Object} data - Pipeline state data
     * @returns {boolean} true if imported successfully
     */
    importState(data) {
        if (!data || data.type !== 'vib3-postprocess-pipeline' || !Array.isArray(data.chain)) {
            console.warn('PostProcessingPipeline: Invalid import data');
            return false;
        }

        this.clear();
        this.enabled = data.enabled !== false;

        for (const item of data.chain) {
            if (item.effect && this.effects.has(item.effect)) {
                this.addEffect(item.effect, item.params || {});
                if (item.enabled === false) {
                    const effect = this.effects.get(item.effect);
                    if (effect) effect.enabled = false;
                }
            }
        }

        return true;
    }

    // -------------------------------------------------------------------------
    // Public API - Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Set the master enabled state of the pipeline.
     *
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
        if (!this.enabled) {
            this._clearEffects();
        }
    }

    /**
     * Clean up resources and remove all effects.
     */
    dispose() {
        this._clearEffects();
        this.effects.clear();
        this.chain = [];
        this._presetChains.clear();
        this._offscreenCanvas = null;
        this._offscreenCtx = null;
    }

    // -------------------------------------------------------------------------
    // Private - CSS Filter Application
    // -------------------------------------------------------------------------

    /**
     * Compose and apply CSS filter string from enabled effects.
     *
     * @param {EffectDefinition[]} effects - CSS effects to apply
     * @private
     */
    _applyCssFilters(effects) {
        if (effects.length === 0) {
            this.target.style.filter = '';
            return;
        }

        const filterParts = effects.map(effect => effect.applyCss(effect.params));
        this.target.style.filter = filterParts.join(' ');
    }

    // -------------------------------------------------------------------------
    // Private - Canvas Pixel Effect Application
    // -------------------------------------------------------------------------

    /**
     * Apply canvas-based pixel manipulation effects.
     *
     * Finds all `<canvas>` elements within the target element and applies
     * effects to each one using an off-screen canvas buffer.
     *
     * @param {EffectDefinition[]} effects - Canvas effects to apply
     * @private
     */
    _applyCanvasEffects(effects) {
        // Find all canvas elements in the target
        const canvases = this.target.querySelectorAll
            ? this.target.querySelectorAll('canvas')
            : [];

        // If the target itself is a canvas, include it
        const targets = this.target.tagName === 'CANVAS'
            ? [this.target]
            : Array.from(canvases);

        for (const canvas of targets) {
            this._applyEffectsToCanvas(canvas, effects);
        }
    }

    /**
     * Apply a list of effects to a single canvas element.
     *
     * @param {HTMLCanvasElement} canvas
     * @param {EffectDefinition[]} effects
     * @private
     */
    _applyEffectsToCanvas(canvas, effects) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        if (width === 0 || height === 0) return;

        try {
            let imageData = ctx.getImageData(0, 0, width, height);

            for (const effect of effects) {
                if (effect.applyCanvas) {
                    imageData = effect.applyCanvas(imageData, effect.params);
                }
            }

            ctx.putImageData(imageData, 0, 0);
        } catch (err) {
            // getImageData can throw on tainted canvases (cross-origin)
            console.warn('PostProcessingPipeline: Cannot apply canvas effects -', err.message);
        }
    }

    // -------------------------------------------------------------------------
    // Private - Cleanup
    // -------------------------------------------------------------------------

    /**
     * Remove all visual effects from the target element.
     * @private
     */
    _clearEffects() {
        this.target.style.filter = '';
    }

    // -------------------------------------------------------------------------
    // Private - Utilities
    // -------------------------------------------------------------------------

    /**
     * Clamp a value to a range.
     *
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     * @private
     */
    _clamp(value, min, max) {
        if (!Number.isFinite(value)) return min;
        return Math.max(min, Math.min(max, value));
    }
}
