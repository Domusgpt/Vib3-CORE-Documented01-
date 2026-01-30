/**
 * ColorPresetsSystem.js - VIB3+ Color Presets & Themes System
 *
 * Provides 20+ built-in color presets organized by mood/theme, with support
 * for smooth transitions, custom presets, and serialization. Integrates with
 * the VIB3+ parameter system via the parameterUpdateFn callback pattern.
 *
 * @module creative/ColorPresetsSystem
 * @version 1.0.0
 * @author VIB3+ Creative Tooling - Phase B
 */

/**
 * @typedef {Object} ColorPresetConfig
 * @property {number} hue - Primary hue value (0-360)
 * @property {number} saturation - Color saturation (0-1)
 * @property {number} intensity - Visual intensity/brightness (0-1)
 * @property {number} [hueShift=0] - Secondary hue offset applied over time (degrees)
 * @property {number} [saturationRange=0] - Range of saturation oscillation (0-1)
 * @property {number} [intensityRange=0] - Range of intensity oscillation (0-1)
 * @property {number} [speed] - Optional speed override (0.1-3)
 * @property {number} [chaos] - Optional chaos override (0-1)
 * @property {number} [morphFactor] - Optional morph factor override (0-2)
 * @property {string} [category] - Category grouping for UI display
 * @property {string} [description] - Human-readable description
 */

/**
 * @typedef {Object} TransitionState
 * @property {ColorPresetConfig} from - Starting preset configuration
 * @property {ColorPresetConfig} to - Target preset configuration
 * @property {number} startTime - Transition start timestamp (ms)
 * @property {number} duration - Transition duration (ms)
 * @property {number} progress - Current progress (0-1)
 */

/**
 * Color presets and themes system for VIB3+ visualization engine.
 *
 * Manages a library of built-in and custom color presets, each defining
 * hue, saturation, intensity and optional secondary color shift parameters.
 * Supports smooth animated transitions between presets.
 *
 * @example
 * const colors = new ColorPresetsSystem((name, value) => {
 *     engine.setParameter(name, value);
 * });
 *
 * // Apply a preset with smooth transition
 * colors.applyPreset('Cyberpunk Neon');
 *
 * // List all presets
 * const presets = colors.getPresets();
 *
 * // Create and apply a custom preset
 * colors.createCustomPreset('My Theme', { hue: 42, saturation: 0.9, intensity: 0.7 });
 * colors.applyPreset('My Theme');
 */
export class ColorPresetsSystem {
    /**
     * Create a new ColorPresetsSystem.
     *
     * @param {Function} parameterUpdateFn - Callback invoked as (paramName, value)
     *   whenever a VIB3+ parameter should be updated. This follows the standard
     *   VIB3+ parameter callback pattern.
     */
    constructor(parameterUpdateFn) {
        if (typeof parameterUpdateFn !== 'function') {
            throw new Error('ColorPresetsSystem requires a parameterUpdateFn callback');
        }

        /** @type {Function} */
        this.updateParameter = parameterUpdateFn;

        /** @type {Map<string, ColorPresetConfig>} Built-in presets */
        this.presets = new Map();

        /** @type {Map<string, ColorPresetConfig>} User-created presets */
        this.customPresets = new Map();

        /** @type {string|null} Name of the currently active preset */
        this.currentPreset = null;

        /** @type {TransitionState|null} Active transition state */
        this.transitionState = null;

        /** @type {number|null} requestAnimationFrame ID for transitions */
        this._frameId = null;

        /** @type {Function|null} Callback invoked when a transition completes */
        this._onTransitionComplete = null;

        this._initBuiltInPresets();
    }

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    /**
     * Initialize all built-in color presets.
     * @private
     */
    _initBuiltInPresets() {
        const builtIn = [
            {
                name: 'Cyberpunk Neon',
                config: {
                    hue: 290,
                    saturation: 0.95,
                    intensity: 0.85,
                    hueShift: 30,
                    saturationRange: 0.1,
                    intensityRange: 0.15,
                    speed: 1.4,
                    chaos: 0.35,
                    category: 'Futuristic',
                    description: 'Hot magenta and electric blue neon glow'
                }
            },
            {
                name: 'Ocean Deep',
                config: {
                    hue: 200,
                    saturation: 0.75,
                    intensity: 0.55,
                    hueShift: 15,
                    saturationRange: 0.1,
                    intensityRange: 0.1,
                    speed: 0.6,
                    chaos: 0.1,
                    category: 'Nature',
                    description: 'Deep ocean blues and teals with gentle motion'
                }
            },
            {
                name: 'Solar Flare',
                config: {
                    hue: 30,
                    saturation: 0.9,
                    intensity: 0.9,
                    hueShift: 25,
                    saturationRange: 0.1,
                    intensityRange: 0.2,
                    speed: 2.0,
                    chaos: 0.5,
                    category: 'Cosmic',
                    description: 'Explosive orange and yellow solar eruption'
                }
            },
            {
                name: 'Midnight Purple',
                config: {
                    hue: 270,
                    saturation: 0.7,
                    intensity: 0.4,
                    hueShift: 10,
                    saturationRange: 0.05,
                    intensityRange: 0.08,
                    speed: 0.5,
                    chaos: 0.05,
                    category: 'Dark',
                    description: 'Subdued deep purple with subtle shimmer'
                }
            },
            {
                name: 'Arctic Aurora',
                config: {
                    hue: 160,
                    saturation: 0.8,
                    intensity: 0.65,
                    hueShift: 50,
                    saturationRange: 0.15,
                    intensityRange: 0.2,
                    speed: 0.8,
                    chaos: 0.2,
                    category: 'Nature',
                    description: 'Northern lights green-to-violet sweeps'
                }
            },
            {
                name: 'Volcanic',
                config: {
                    hue: 10,
                    saturation: 0.85,
                    intensity: 0.75,
                    hueShift: 15,
                    saturationRange: 0.1,
                    intensityRange: 0.25,
                    speed: 1.2,
                    chaos: 0.45,
                    category: 'Elemental',
                    description: 'Molten reds and oranges with dark undertones'
                }
            },
            {
                name: 'Forest Mystic',
                config: {
                    hue: 130,
                    saturation: 0.6,
                    intensity: 0.5,
                    hueShift: 20,
                    saturationRange: 0.1,
                    intensityRange: 0.1,
                    speed: 0.7,
                    chaos: 0.15,
                    category: 'Nature',
                    description: 'Enchanted forest greens with mossy accents'
                }
            },
            {
                name: 'Retro Wave',
                config: {
                    hue: 310,
                    saturation: 0.9,
                    intensity: 0.8,
                    hueShift: 40,
                    saturationRange: 0.1,
                    intensityRange: 0.15,
                    speed: 1.5,
                    chaos: 0.3,
                    category: 'Retro',
                    description: 'Synthwave pink and cyan retrowave palette'
                }
            },
            {
                name: 'Quantum Void',
                config: {
                    hue: 240,
                    saturation: 0.5,
                    intensity: 0.3,
                    hueShift: 5,
                    saturationRange: 0.05,
                    intensityRange: 0.15,
                    speed: 0.4,
                    chaos: 0.6,
                    category: 'Cosmic',
                    description: 'Near-black indigo with sporadic quantum flickers'
                }
            },
            {
                name: 'Golden Hour',
                config: {
                    hue: 45,
                    saturation: 0.8,
                    intensity: 0.7,
                    hueShift: 10,
                    saturationRange: 0.05,
                    intensityRange: 0.1,
                    speed: 0.5,
                    chaos: 0.05,
                    category: 'Warm',
                    description: 'Warm golden light of late afternoon'
                }
            },
            {
                name: 'Ice Crystal',
                config: {
                    hue: 190,
                    saturation: 0.55,
                    intensity: 0.8,
                    hueShift: 8,
                    saturationRange: 0.1,
                    intensityRange: 0.1,
                    speed: 0.6,
                    chaos: 0.08,
                    category: 'Elemental',
                    description: 'Crisp icy blue-white crystalline shimmer'
                }
            },
            {
                name: 'Blood Moon',
                config: {
                    hue: 0,
                    saturation: 0.85,
                    intensity: 0.5,
                    hueShift: 10,
                    saturationRange: 0.1,
                    intensityRange: 0.15,
                    speed: 0.7,
                    chaos: 0.25,
                    category: 'Dark',
                    description: 'Deep crimson with dark blood-red pulsation'
                }
            },
            {
                name: 'Digital Rain',
                config: {
                    hue: 120,
                    saturation: 0.9,
                    intensity: 0.7,
                    hueShift: 5,
                    saturationRange: 0.05,
                    intensityRange: 0.2,
                    speed: 1.8,
                    chaos: 0.4,
                    category: 'Futuristic',
                    description: 'Matrix-green cascading digital streams'
                }
            },
            {
                name: 'Sunset Gradient',
                config: {
                    hue: 20,
                    saturation: 0.85,
                    intensity: 0.75,
                    hueShift: 35,
                    saturationRange: 0.1,
                    intensityRange: 0.1,
                    speed: 0.5,
                    chaos: 0.1,
                    category: 'Warm',
                    description: 'Orange-to-purple sunset sweep across the sky'
                }
            },
            {
                name: 'Deep Space',
                config: {
                    hue: 250,
                    saturation: 0.6,
                    intensity: 0.35,
                    hueShift: 20,
                    saturationRange: 0.1,
                    intensityRange: 0.2,
                    speed: 0.3,
                    chaos: 0.15,
                    category: 'Cosmic',
                    description: 'Dark nebula blues with distant starlight'
                }
            },
            {
                name: 'Toxic Green',
                config: {
                    hue: 100,
                    saturation: 0.95,
                    intensity: 0.8,
                    hueShift: 10,
                    saturationRange: 0.05,
                    intensityRange: 0.15,
                    speed: 1.6,
                    chaos: 0.5,
                    category: 'Futuristic',
                    description: 'Radioactive green glow with toxic highlights'
                }
            },
            {
                name: 'Royal Purple',
                config: {
                    hue: 280,
                    saturation: 0.75,
                    intensity: 0.6,
                    hueShift: 12,
                    saturationRange: 0.08,
                    intensityRange: 0.1,
                    speed: 0.8,
                    chaos: 0.12,
                    category: 'Elegant',
                    description: 'Rich regal purple with velvet depth'
                }
            },
            {
                name: 'Coral Reef',
                config: {
                    hue: 350,
                    saturation: 0.7,
                    intensity: 0.65,
                    hueShift: 25,
                    saturationRange: 0.1,
                    intensityRange: 0.1,
                    speed: 0.7,
                    chaos: 0.2,
                    category: 'Nature',
                    description: 'Coral pink and aqua reef ecosystem'
                }
            },
            {
                name: 'Thunderstorm',
                config: {
                    hue: 220,
                    saturation: 0.6,
                    intensity: 0.5,
                    hueShift: 15,
                    saturationRange: 0.15,
                    intensityRange: 0.35,
                    speed: 1.3,
                    chaos: 0.65,
                    category: 'Elemental',
                    description: 'Electric blues and greys with lightning flashes'
                }
            },
            {
                name: 'Holographic Rainbow',
                config: {
                    hue: 0,
                    saturation: 0.85,
                    intensity: 0.75,
                    hueShift: 120,
                    saturationRange: 0.15,
                    intensityRange: 0.2,
                    speed: 1.0,
                    chaos: 0.2,
                    category: 'Special',
                    description: 'Full-spectrum holographic rainbow sweep'
                }
            },
            {
                name: 'Lavender Dream',
                config: {
                    hue: 260,
                    saturation: 0.5,
                    intensity: 0.6,
                    hueShift: 8,
                    saturationRange: 0.05,
                    intensityRange: 0.05,
                    speed: 0.4,
                    chaos: 0.03,
                    category: 'Elegant',
                    description: 'Soft pastel lavender with dreamlike calm'
                }
            },
            {
                name: 'Amber Glow',
                config: {
                    hue: 38,
                    saturation: 0.85,
                    intensity: 0.65,
                    hueShift: 8,
                    saturationRange: 0.05,
                    intensityRange: 0.1,
                    speed: 0.6,
                    chaos: 0.08,
                    category: 'Warm',
                    description: 'Warm amber candlelight radiance'
                }
            }
        ];

        for (const { name, config } of builtIn) {
            this.presets.set(name, { ...config });
        }
    }

    // -------------------------------------------------------------------------
    // Public API - Querying
    // -------------------------------------------------------------------------

    /**
     * Get a flat list of all available presets (built-in + custom).
     *
     * @returns {Array<{name: string, config: ColorPresetConfig, isCustom: boolean}>}
     */
    getPresets() {
        const list = [];

        for (const [name, config] of this.presets) {
            list.push({ name, config: { ...config }, isCustom: false });
        }
        for (const [name, config] of this.customPresets) {
            list.push({ name, config: { ...config }, isCustom: true });
        }

        return list;
    }

    /**
     * Get presets grouped by their category.
     *
     * @returns {Object<string, Array<{name: string, config: ColorPresetConfig, isCustom: boolean}>>}
     */
    getPresetsByCategory() {
        const categories = {};
        const all = this.getPresets();

        for (const preset of all) {
            const cat = preset.config.category || 'Uncategorized';
            if (!categories[cat]) {
                categories[cat] = [];
            }
            categories[cat].push(preset);
        }

        return categories;
    }

    /**
     * Get a single preset configuration by name.
     *
     * @param {string} name - Preset name
     * @returns {ColorPresetConfig|null} The preset config, or null if not found
     */
    getPreset(name) {
        const config = this.customPresets.get(name) || this.presets.get(name);
        return config ? { ...config } : null;
    }

    /**
     * Get the name of the currently active preset.
     *
     * @returns {string|null}
     */
    getCurrentPreset() {
        return this.currentPreset;
    }

    /**
     * Check whether a transition animation is currently active.
     *
     * @returns {boolean}
     */
    isTransitioning() {
        return this.transitionState !== null;
    }

    // -------------------------------------------------------------------------
    // Public API - Applying Presets
    // -------------------------------------------------------------------------

    /**
     * Apply a color preset by name.
     *
     * @param {string} name - Name of the preset to apply
     * @param {boolean} [transition=true] - Whether to smoothly animate to the preset
     * @param {number} [duration=800] - Transition duration in milliseconds
     * @param {Function} [onComplete] - Optional callback when transition finishes
     * @returns {boolean} true if the preset was found and applied
     */
    applyPreset(name, transition = true, duration = 800, onComplete = null) {
        const config = this.customPresets.get(name) || this.presets.get(name);
        if (!config) {
            console.warn(`ColorPresetsSystem: Unknown preset "${name}"`);
            return false;
        }

        if (transition && duration > 0) {
            this._startTransition(config, duration, onComplete);
        } else {
            this._applyConfigImmediate(config);
            if (typeof onComplete === 'function') {
                onComplete();
            }
        }

        this.currentPreset = name;
        return true;
    }

    /**
     * Apply a raw preset configuration object directly (without looking up by name).
     *
     * @param {ColorPresetConfig} config - The configuration to apply
     * @param {boolean} [transition=true] - Whether to animate
     * @param {number} [duration=800] - Transition duration in ms
     */
    applyConfig(config, transition = true, duration = 800) {
        if (!config || typeof config.hue !== 'number') {
            console.warn('ColorPresetsSystem: Invalid config object');
            return;
        }

        if (transition && duration > 0) {
            this._startTransition(config, duration);
        } else {
            this._applyConfigImmediate(config);
        }

        this.currentPreset = null;
    }

    // -------------------------------------------------------------------------
    // Public API - Custom Presets
    // -------------------------------------------------------------------------

    /**
     * Create a new custom preset.
     *
     * @param {string} name - Name for the custom preset
     * @param {ColorPresetConfig} config - Preset configuration
     * @returns {boolean} true if created, false if name conflicts with built-in
     */
    createCustomPreset(name, config) {
        if (typeof name !== 'string' || name.trim().length === 0) {
            console.warn('ColorPresetsSystem: Preset name must be a non-empty string');
            return false;
        }

        if (this.presets.has(name)) {
            console.warn(`ColorPresetsSystem: Cannot overwrite built-in preset "${name}"`);
            return false;
        }

        const validated = this._validateConfig(config);
        this.customPresets.set(name.trim(), validated);
        return true;
    }

    /**
     * Update an existing custom preset.
     *
     * @param {string} name - Name of the custom preset to update
     * @param {ColorPresetConfig} config - New configuration
     * @returns {boolean} true if updated
     */
    updateCustomPreset(name, config) {
        if (!this.customPresets.has(name)) {
            console.warn(`ColorPresetsSystem: Custom preset "${name}" not found`);
            return false;
        }

        const validated = this._validateConfig(config);
        this.customPresets.set(name, validated);
        return true;
    }

    /**
     * Delete a custom preset.
     *
     * @param {string} name - Name of the custom preset to remove
     * @returns {boolean} true if deleted
     */
    deleteCustomPreset(name) {
        return this.customPresets.delete(name);
    }

    // -------------------------------------------------------------------------
    // Public API - Serialization
    // -------------------------------------------------------------------------

    /**
     * Export a preset for external storage or sharing.
     *
     * @param {string} [name] - Preset name to export. If omitted, exports current state.
     * @returns {Object} Serializable preset data
     */
    exportPreset(name) {
        let config;
        let presetName;

        if (name) {
            config = this.getPreset(name);
            presetName = name;
        } else if (this.currentPreset) {
            config = this.getPreset(this.currentPreset);
            presetName = this.currentPreset;
        } else {
            console.warn('ColorPresetsSystem: No preset specified or active for export');
            return null;
        }

        if (!config) {
            console.warn(`ColorPresetsSystem: Preset "${name}" not found for export`);
            return null;
        }

        return {
            type: 'vib3-color-preset',
            version: '1.0.0',
            name: presetName,
            timestamp: new Date().toISOString(),
            config: { ...config }
        };
    }

    /**
     * Export all custom presets for backup.
     *
     * @returns {Object} Serializable object containing all custom presets
     */
    exportAllCustomPresets() {
        const presets = {};
        for (const [name, config] of this.customPresets) {
            presets[name] = { ...config };
        }

        return {
            type: 'vib3-color-preset-collection',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            presets
        };
    }

    /**
     * Import a preset from serialized data.
     *
     * @param {Object} data - Preset data as returned by exportPreset()
     * @returns {boolean} true if imported successfully
     */
    importPreset(data) {
        if (!data || typeof data !== 'object') {
            console.warn('ColorPresetsSystem: Invalid import data');
            return false;
        }

        if (data.type === 'vib3-color-preset' && data.config) {
            const name = data.name || `Imported ${Date.now()}`;
            return this.createCustomPreset(name, data.config);
        }

        if (data.type === 'vib3-color-preset-collection' && data.presets) {
            let count = 0;
            for (const [name, config] of Object.entries(data.presets)) {
                if (this.createCustomPreset(name, config)) {
                    count++;
                }
            }
            return count > 0;
        }

        console.warn('ColorPresetsSystem: Unrecognized import format');
        return false;
    }

    // -------------------------------------------------------------------------
    // Public API - Transition Control
    // -------------------------------------------------------------------------

    /**
     * Cancel any in-progress transition and keep current values.
     */
    cancelTransition() {
        if (this._frameId !== null) {
            cancelAnimationFrame(this._frameId);
            this._frameId = null;
        }
        this.transitionState = null;
        this._onTransitionComplete = null;
    }

    // -------------------------------------------------------------------------
    // Public API - Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Clean up resources and cancel any active animation.
     */
    dispose() {
        this.cancelTransition();
        this.presets.clear();
        this.customPresets.clear();
        this.currentPreset = null;
    }

    // -------------------------------------------------------------------------
    // Private - Transition Engine
    // -------------------------------------------------------------------------

    /**
     * Begin a smooth transition to the target configuration.
     *
     * @param {ColorPresetConfig} targetConfig - Target color configuration
     * @param {number} duration - Duration in milliseconds
     * @param {Function} [onComplete] - Completion callback
     * @private
     */
    _startTransition(targetConfig, duration, onComplete = null) {
        // Cancel any existing transition
        this.cancelTransition();

        // Capture the current parameter values as the starting point
        const fromConfig = this._captureCurrentState();

        this.transitionState = {
            from: fromConfig,
            to: { ...targetConfig },
            startTime: performance.now(),
            duration,
            progress: 0
        };

        this._onTransitionComplete = onComplete;
        this._tickTransition();
    }

    /**
     * Animation frame tick for the transition.
     * @private
     */
    _tickTransition() {
        if (!this.transitionState) return;

        const now = performance.now();
        const elapsed = now - this.transitionState.startTime;
        const progress = Math.min(elapsed / this.transitionState.duration, 1);

        // Smooth ease-in-out curve
        const eased = this._easeInOutCubic(progress);

        this.transitionState.progress = progress;

        // Interpolate and apply each animatable parameter
        const from = this.transitionState.from;
        const to = this.transitionState.to;

        // Hue needs special circular interpolation
        const hue = this._lerpHue(from.hue, to.hue, eased);
        this.updateParameter('hue', Math.round(hue));

        // Linear interpolation for saturation and intensity
        if (typeof to.saturation === 'number') {
            this.updateParameter('saturation', this._lerp(from.saturation, to.saturation, eased));
        }
        if (typeof to.intensity === 'number') {
            this.updateParameter('intensity', this._lerp(from.intensity, to.intensity, eased));
        }

        // Optional parameter overrides
        if (typeof to.speed === 'number' && typeof from.speed === 'number') {
            this.updateParameter('speed', this._lerp(from.speed, to.speed, eased));
        }
        if (typeof to.chaos === 'number' && typeof from.chaos === 'number') {
            this.updateParameter('chaos', this._lerp(from.chaos, to.chaos, eased));
        }
        if (typeof to.morphFactor === 'number' && typeof from.morphFactor === 'number') {
            this.updateParameter('morphFactor', this._lerp(from.morphFactor, to.morphFactor, eased));
        }

        // Continue or finish
        if (progress < 1) {
            this._frameId = requestAnimationFrame(() => this._tickTransition());
        } else {
            this.transitionState = null;
            this._frameId = null;
            if (typeof this._onTransitionComplete === 'function') {
                const cb = this._onTransitionComplete;
                this._onTransitionComplete = null;
                cb();
            }
        }
    }

    /**
     * Apply a configuration immediately without transition.
     *
     * @param {ColorPresetConfig} config
     * @private
     */
    _applyConfigImmediate(config) {
        if (typeof config.hue === 'number') {
            this.updateParameter('hue', Math.round(config.hue));
        }
        if (typeof config.saturation === 'number') {
            this.updateParameter('saturation', config.saturation);
        }
        if (typeof config.intensity === 'number') {
            this.updateParameter('intensity', config.intensity);
        }
        if (typeof config.speed === 'number') {
            this.updateParameter('speed', config.speed);
        }
        if (typeof config.chaos === 'number') {
            this.updateParameter('chaos', config.chaos);
        }
        if (typeof config.morphFactor === 'number') {
            this.updateParameter('morphFactor', config.morphFactor);
        }
    }

    /**
     * Capture the current state of animatable parameters as a snapshot.
     * Uses sensible defaults for any parameter the callback system cannot
     * report back (since the callback is write-only).
     *
     * @returns {ColorPresetConfig}
     * @private
     */
    _captureCurrentState() {
        // If we have a current preset, use its values as the starting state
        if (this.currentPreset) {
            const preset = this.customPresets.get(this.currentPreset) || this.presets.get(this.currentPreset);
            if (preset) {
                return { ...preset };
            }
        }

        // Fallback: use VIB3+ defaults from Parameters.js
        return {
            hue: 200,
            saturation: 0.8,
            intensity: 0.5,
            speed: 1.0,
            chaos: 0.2,
            morphFactor: 1.0
        };
    }

    // -------------------------------------------------------------------------
    // Private - Validation
    // -------------------------------------------------------------------------

    /**
     * Validate and sanitize a preset config, filling defaults for missing fields.
     *
     * @param {Object} config - Raw config object
     * @returns {ColorPresetConfig} Sanitized config
     * @private
     */
    _validateConfig(config) {
        return {
            hue: this._clamp(Number(config.hue) || 0, 0, 360),
            saturation: this._clamp(Number(config.saturation) ?? 0.8, 0, 1),
            intensity: this._clamp(Number(config.intensity) ?? 0.5, 0, 1),
            hueShift: Number(config.hueShift) || 0,
            saturationRange: this._clamp(Number(config.saturationRange) || 0, 0, 1),
            intensityRange: this._clamp(Number(config.intensityRange) || 0, 0, 1),
            speed: config.speed != null ? this._clamp(Number(config.speed), 0.1, 3) : undefined,
            chaos: config.chaos != null ? this._clamp(Number(config.chaos), 0, 1) : undefined,
            morphFactor: config.morphFactor != null ? this._clamp(Number(config.morphFactor), 0, 2) : undefined,
            category: typeof config.category === 'string' ? config.category : 'Custom',
            description: typeof config.description === 'string' ? config.description : ''
        };
    }

    // -------------------------------------------------------------------------
    // Private - Math Utilities
    // -------------------------------------------------------------------------

    /**
     * Linear interpolation.
     *
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Progress (0-1)
     * @returns {number}
     * @private
     */
    _lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Circular hue interpolation that takes the shortest path around the
     * 360-degree hue wheel.
     *
     * @param {number} a - Start hue (0-360)
     * @param {number} b - End hue (0-360)
     * @param {number} t - Progress (0-1)
     * @returns {number} Interpolated hue (0-360)
     * @private
     */
    _lerpHue(a, b, t) {
        let diff = b - a;

        // Take the shortest arc around the wheel
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        let result = a + diff * t;
        if (result < 0) result += 360;
        if (result >= 360) result -= 360;

        return result;
    }

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

    /**
     * Cubic ease-in-out for smooth transitions.
     *
     * @param {number} t - Progress (0-1)
     * @returns {number} Eased value
     * @private
     */
    _easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
}
