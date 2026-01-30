/**
 * VIB3+ SpatialInputSystem
 *
 * Evolved spatial orientation input abstraction that maps ANY input source
 * to visualization parameters. Provides universal "card tilting" behavior
 * decoupled from physical device tilt -- mouse, gamepad, gyroscope, audio,
 * MIDI, AR perspective, and programmatic API all feed the same spatial state.
 *
 * Architecture:
 *   Input Sources --> Spatial State (pitch/yaw/roll/x/y/z) --> Smoothing --> Mapping --> Parameter Updates
 *
 * @module reactivity/SpatialInputSystem
 * @version 1.0.0
 */

import { TARGETABLE_PARAMETERS, BLEND_MODES } from './ReactivityConfig.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Recognised input source types.
 * @readonly
 * @enum {string}
 */
export const SOURCE_TYPES = Object.freeze({
    DEVICE_TILT: 'deviceTilt',
    MOUSE_POSITION: 'mousePosition',
    GYROSCOPE: 'gyroscope',
    GAMEPAD: 'gamepad',
    PERSPECTIVE: 'perspective',
    PROGRAMMATIC: 'programmatic',
    AUDIO: 'audio',
    MIDI: 'midi'
});

/**
 * Named spatial axes that form the normalised intermediate state.
 * All values are kept in the range -1 .. 1 (translations) or -1 .. 1
 * (rotational axes). `intensity` and `velocity` are 0 .. 1.
 * @readonly
 * @enum {string}
 */
export const SPATIAL_AXES = Object.freeze([
    'pitch', 'yaw', 'roll',
    'x', 'y', 'z',
    'intensity', 'velocity'
]);

/**
 * Dramatic mode amplification factor (matches legacy DeviceTiltHandler).
 * @constant {number}
 */
const DRAMATIC_MULTIPLIER = 8;

/**
 * Maximum number of concurrently registered input sources.
 * @constant {number}
 */
const MAX_SOURCES = 32;

/**
 * Maximum number of active mappings.
 * @constant {number}
 */
const MAX_MAPPINGS = 256;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Clamp a number between min and max.
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Linear interpolation.
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolant (0..1)
 * @returns {number}
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Create a fresh zero-valued spatial state object.
 * @returns {SpatialState}
 */
function createSpatialState() {
    return {
        pitch: 0,
        yaw: 0,
        roll: 0,
        x: 0,
        y: 0,
        z: 0,
        intensity: 0,
        velocity: 0
    };
}

// ---------------------------------------------------------------------------
// Type definitions (JSDoc only -- no TypeScript)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} SpatialState
 * @property {number} pitch   - Forward/back tilt (-1..1)
 * @property {number} yaw     - Left/right rotation (-1..1)
 * @property {number} roll    - Left/right tilt (-1..1)
 * @property {number} x       - Translation X (-1..1)
 * @property {number} y       - Translation Y (-1..1)
 * @property {number} z       - Translation Z / depth (-1..1)
 * @property {number} intensity - Overall spatial intensity (0..1)
 * @property {number} velocity  - Rate of change (0..1)
 */

/**
 * @typedef {Object} MappingEntry
 * @property {string}   axis      - Source spatial axis name
 * @property {string}   target    - Target VIB3+ parameter name
 * @property {number}   scale     - Multiplier applied to axis value
 * @property {number[]} [clamp]   - Optional [min, max] to clamp mapped output
 * @property {string}   [blendMode] - One of BLEND_MODES ('add'|'replace'|'multiply'|'max'|'min')
 */

/**
 * @typedef {Object} ProfileDef
 * @property {string}         name        - Human-readable name
 * @property {string}         description - What this profile does
 * @property {MappingEntry[]} mappings    - Array of axis-to-parameter mappings
 * @property {string[]}       sources     - Recommended input source types
 * @property {number}         smoothing   - Suggested smoothing factor (0..1)
 */

/**
 * @typedef {Object} SourceEntry
 * @property {string}   name     - Unique source name
 * @property {string}   type     - One of SOURCE_TYPES
 * @property {Object}   config   - Source-specific configuration
 * @property {boolean}  active   - Whether this source is currently feeding data
 * @property {Function|null} _cleanup - Cleanup function for event listeners
 */

/**
 * @typedef {Object} SpatialInputOptions
 * @property {number}   [sensitivity=1.0]  - Global sensitivity multiplier
 * @property {number}   [smoothing=0.15]   - Default smoothing factor (0..1)
 * @property {Function} [onParameterUpdate] - Callback invoked as fn(paramName, value)
 * @property {boolean}  [autoRegisterGlobals=true] - Expose window helpers
 */

// ---------------------------------------------------------------------------
// SpatialInputSystem
// ---------------------------------------------------------------------------

/**
 * SpatialInputSystem -- universal spatial orientation input for VIB3+.
 *
 * Abstracts spatial orientation from any combination of input sources
 * (device tilt, mouse, gamepad, gyroscope, audio, MIDI, AR perspective,
 * programmatic API) and maps the resulting spatial state to any VIB3+
 * visualisation parameter.
 *
 * @example
 * const spatial = new SpatialInputSystem({
 *     onParameterUpdate: (name, value) => engine.setParameter(name, value),
 *     smoothing: 0.12
 * });
 * spatial.addSource('tilt', 'deviceTilt');
 * spatial.addSource('mouse', 'mousePosition');
 * spatial.loadProfile('cardTilt');
 * spatial.enable();
 */
export class SpatialInputSystem {

    // ------------------------------------------------------------------
    // Construction
    // ------------------------------------------------------------------

    /**
     * Create a new SpatialInputSystem.
     * @param {SpatialInputOptions} [options={}]
     */
    constructor(options = {}) {
        /** @type {Map<string, SourceEntry>} Active input sources keyed by name */
        this.sources = new Map();

        /** @type {Map<string, MappingEntry>} Active mappings keyed by "axis->target" */
        this.mappings = new Map();

        /** @type {Map<string, ProfileDef>} Named mapping profiles */
        this.profiles = new Map();

        /** @type {Map<string, number>} Per-axis smoothing state */
        this.smoothing = new Map();

        /** @type {boolean} Whether the frame loop is running */
        this.enabled = false;

        /** @type {number} Global sensitivity multiplier (0.1 .. 10) */
        this.sensitivity = clamp(Number(options.sensitivity) || 1.0, 0.1, 10);

        /** @type {number} Default smoothing factor (0 .. 1) */
        this.smoothingFactor = clamp(Number(options.smoothing) || 0.15, 0, 1);

        /** @type {boolean} Whether dramatic mode (8x amplification) is active */
        this.dramaticMode = false;

        /**
         * Callback invoked when a mapped parameter should be updated.
         * Signature: `(parameterName: string, value: number) => void`
         * @type {Function|null}
         */
        this.parameterUpdateFn = typeof options.onParameterUpdate === 'function'
            ? options.onParameterUpdate
            : null;

        /** @type {Set<string>} Custom user-defined target names beyond TARGETABLE_PARAMETERS */
        this._customTargets = new Set();

        // -- Spatial state (raw, pre-smoothing) --
        /** @type {SpatialState} */
        this.spatialState = createSpatialState();

        // -- Smoothed output state --
        /** @type {SpatialState} */
        this.smoothedState = createSpatialState();

        // -- Previous smoothed state (for velocity calculation) --
        /** @private @type {SpatialState} */
        this._prevSmoothedState = createSpatialState();

        // -- Frame loop bookkeeping --
        /** @private */
        this._frameId = null;
        /** @private */
        this._lastFrameTime = 0;

        // -- Event listeners --
        /** @private @type {Map<string, Function[]>} */
        this._listeners = new Map();

        // -- Bound handlers stored for cleanup --
        /** @private */
        this._boundDeviceOrientation = null;
        /** @private */
        this._boundMouseMove = null;
        /** @private */
        this._boundGamepadPoll = null;
        /** @private */
        this._gyroscopeSensor = null;

        // Initialise built-in profiles
        this._initBuiltInProfiles();

        /** @type {string|null} Name of the currently active profile */
        this.activeProfile = null;

        // Optionally register global helpers
        if (options.autoRegisterGlobals !== false && typeof window !== 'undefined') {
            this._registerGlobals();
        }

        console.log('SpatialInputSystem: Initialised');
    }

    // ------------------------------------------------------------------
    // Global browser helpers
    // ------------------------------------------------------------------

    /**
     * Register convenience functions on the window object.
     * @private
     */
    _registerGlobals() {
        if (typeof window === 'undefined') return;

        window.spatialInputSystem = this;

        /**
         * Enable spatial input with an optional profile.
         * @param {string} [profile]
         */
        window.enableSpatialInput = (profile) => {
            if (profile) this.loadProfile(profile);
            this.enable();
        };

        /**
         * Disable spatial input processing.
         */
        window.disableSpatialInput = () => {
            this.disable();
        };

        /**
         * Switch the active spatial profile.
         * @param {string} name
         */
        window.setSpatialProfile = (name) => {
            this.loadProfile(name);
        };

        /**
         * Feed manual spatial data (programmatic source).
         * @param {Partial<SpatialState>} data
         */
        window.feedSpatialInput = (data) => {
            this.feedInput(SOURCE_TYPES.PROGRAMMATIC, data);
        };

        /**
         * Get the current smoothed spatial state.
         * @returns {SpatialState}
         */
        window.getSpatialState = () => {
            return this.getState();
        };
    }

    // ------------------------------------------------------------------
    // Built-in profiles
    // ------------------------------------------------------------------

    /**
     * Register all built-in mapping profiles.
     * @private
     */
    _initBuiltInProfiles() {

        // ---- Card Tilt ----
        this.profiles.set('cardTilt', {
            name: 'Card Tilt',
            description: 'Physical tilt controls 4D hyperspace rotation',
            mappings: [
                { axis: 'pitch', target: 'rot4dXW', scale: 0.02, clamp: [-1.5, 1.5], blendMode: 'replace' },
                { axis: 'roll', target: 'rot4dYW', scale: 0.025, clamp: [-1.5, 1.5], blendMode: 'replace' },
                { axis: 'yaw', target: 'rot4dZW', scale: 0.015, clamp: [-2.0, 2.0], blendMode: 'replace' },
                { axis: 'intensity', target: 'chaos', scale: 0.3, clamp: [0, 1], blendMode: 'replace' }
            ],
            sources: [SOURCE_TYPES.DEVICE_TILT, SOURCE_TYPES.MOUSE_POSITION],
            smoothing: 0.12
        });

        // ---- Wearable Perspective ----
        this.profiles.set('wearablePerspective', {
            name: 'Wearable Perspective',
            description: 'Viewing angle affects visuals without physical device tilt; designed for AR glasses and headsets',
            mappings: [
                { axis: 'pitch', target: 'rot4dXW', scale: 0.015, clamp: [-1.0, 1.0], blendMode: 'replace' },
                { axis: 'yaw', target: 'rot4dXY', scale: 0.02, clamp: [-3.14, 3.14], blendMode: 'replace' },
                { axis: 'roll', target: 'rot4dYW', scale: 0.01, clamp: [-0.8, 0.8], blendMode: 'replace' },
                { axis: 'z', target: 'dimension', scale: 0.5, clamp: [3.0, 4.5], blendMode: 'replace' },
                { axis: 'intensity', target: 'intensity', scale: 0.4, clamp: [0.2, 1.0], blendMode: 'replace' }
            ],
            sources: [SOURCE_TYPES.PERSPECTIVE, SOURCE_TYPES.DEVICE_TILT],
            smoothing: 0.2
        });

        // ---- Game Asset ----
        this.profiles.set('gameAsset', {
            name: 'Game Asset',
            description: 'Game object orientation in world space maps to all 6 rotation planes',
            mappings: [
                { axis: 'pitch', target: 'rot4dYZ', scale: 1.0, clamp: [-6.28, 6.28], blendMode: 'replace' },
                { axis: 'yaw', target: 'rot4dXZ', scale: 1.0, clamp: [-6.28, 6.28], blendMode: 'replace' },
                { axis: 'roll', target: 'rot4dXY', scale: 1.0, clamp: [-6.28, 6.28], blendMode: 'replace' },
                { axis: 'x', target: 'rot4dXW', scale: 0.5, clamp: [-2.0, 2.0], blendMode: 'replace' },
                { axis: 'y', target: 'rot4dYW', scale: 0.5, clamp: [-2.0, 2.0], blendMode: 'replace' },
                { axis: 'z', target: 'rot4dZW', scale: 0.5, clamp: [-2.0, 2.0], blendMode: 'replace' }
            ],
            sources: [SOURCE_TYPES.PROGRAMMATIC, SOURCE_TYPES.GAMEPAD],
            smoothing: 0.08
        });

        // ---- VJ Audio Spatial ----
        this.profiles.set('vjAudioSpatial', {
            name: 'VJ Audio Spatial',
            description: 'Audio energy creates spatial movement for live VJ performance',
            mappings: [
                { axis: 'pitch', target: 'rot4dXW', scale: 0.8, clamp: [-1.5, 1.5], blendMode: 'add' },
                { axis: 'yaw', target: 'rot4dYW', scale: 0.6, clamp: [-1.5, 1.5], blendMode: 'add' },
                { axis: 'roll', target: 'rot4dZW', scale: 0.5, clamp: [-1.0, 1.0], blendMode: 'add' },
                { axis: 'intensity', target: 'morphFactor', scale: 1.5, clamp: [0, 2], blendMode: 'replace' },
                { axis: 'velocity', target: 'chaos', scale: 0.8, clamp: [0, 1], blendMode: 'replace' },
                { axis: 'x', target: 'hue', scale: 180, clamp: [0, 360], blendMode: 'add' },
                { axis: 'y', target: 'speed', scale: 2.0, clamp: [0.1, 3.0], blendMode: 'replace' }
            ],
            sources: [SOURCE_TYPES.AUDIO, SOURCE_TYPES.MIDI],
            smoothing: 0.08
        });

        // ---- UI Element ----
        this.profiles.set('uiElement', {
            name: 'UI Element',
            description: 'Mouse and scroll position changes visuals without physical movement',
            mappings: [
                { axis: 'pitch', target: 'rot4dXW', scale: 0.8, clamp: [-1.0, 1.0], blendMode: 'replace' },
                { axis: 'roll', target: 'rot4dYW', scale: 0.8, clamp: [-1.0, 1.0], blendMode: 'replace' },
                { axis: 'yaw', target: 'rot4dXY', scale: 0.5, clamp: [-1.5, 1.5], blendMode: 'replace' },
                { axis: 'z', target: 'dimension', scale: 0.3, clamp: [3.0, 4.5], blendMode: 'add' },
                { axis: 'intensity', target: 'intensity', scale: 0.5, clamp: [0.1, 1.0], blendMode: 'replace' }
            ],
            sources: [SOURCE_TYPES.MOUSE_POSITION],
            smoothing: 0.18
        });

        // ---- Immersive XR ----
        this.profiles.set('immersiveXR', {
            name: 'Immersive XR',
            description: 'Full 6DOF mapping for WebXR headsets and controllers',
            mappings: [
                // Rotational axes map to all 6 rotation planes
                { axis: 'pitch', target: 'rot4dYZ', scale: 1.0, clamp: [-6.28, 6.28], blendMode: 'replace' },
                { axis: 'yaw', target: 'rot4dXZ', scale: 1.0, clamp: [-6.28, 6.28], blendMode: 'replace' },
                { axis: 'roll', target: 'rot4dXY', scale: 1.0, clamp: [-6.28, 6.28], blendMode: 'replace' },
                // Translational axes map to 4D hyperspace rotations
                { axis: 'x', target: 'rot4dXW', scale: 1.0, clamp: [-2.0, 2.0], blendMode: 'replace' },
                { axis: 'y', target: 'rot4dYW', scale: 1.0, clamp: [-2.0, 2.0], blendMode: 'replace' },
                { axis: 'z', target: 'rot4dZW', scale: 1.0, clamp: [-2.0, 2.0], blendMode: 'replace' },
                // Movement intensity drives visual intensity
                { axis: 'intensity', target: 'intensity', scale: 0.6, clamp: [0.2, 1.0], blendMode: 'replace' },
                { axis: 'velocity', target: 'speed', scale: 2.0, clamp: [0.1, 3.0], blendMode: 'replace' }
            ],
            sources: [SOURCE_TYPES.PERSPECTIVE, SOURCE_TYPES.GYROSCOPE, SOURCE_TYPES.GAMEPAD],
            smoothing: 0.06
        });
    }

    // ------------------------------------------------------------------
    // Source management
    // ------------------------------------------------------------------

    /**
     * Register an input source.
     *
     * @param {string} name   - Unique identifier for this source instance
     * @param {string} type   - One of SOURCE_TYPES values
     * @param {Object} [config={}] - Source-specific configuration
     * @returns {boolean} True if the source was added successfully
     *
     * @example
     * spatial.addSource('tilt', 'deviceTilt');
     * spatial.addSource('mouse', 'mousePosition', { element: myCanvas });
     * spatial.addSource('pad', 'gamepad', { index: 0, deadzone: 0.1 });
     */
    addSource(name, type, config = {}) {
        if (!name || typeof name !== 'string') {
            console.warn('SpatialInputSystem.addSource: name must be a non-empty string');
            return false;
        }
        if (!Object.values(SOURCE_TYPES).includes(type)) {
            console.warn(`SpatialInputSystem.addSource: unknown source type "${type}"`);
            return false;
        }
        if (this.sources.size >= MAX_SOURCES) {
            console.warn('SpatialInputSystem.addSource: maximum source count reached');
            return false;
        }

        // Remove existing source with same name first
        if (this.sources.has(name)) {
            this.removeSource(name);
        }

        /** @type {SourceEntry} */
        const entry = {
            name,
            type,
            config: { ...config },
            active: true,
            _cleanup: null
        };

        this.sources.set(name, entry);

        // If already enabled, start listening immediately
        if (this.enabled) {
            this._attachSourceListeners(entry);
        }

        this._emit('sourceAdded', { name, type });
        console.log(`SpatialInputSystem: Source added "${name}" (${type})`);
        return true;
    }

    /**
     * Remove an input source and clean up its listeners.
     * @param {string} name
     * @returns {boolean} True if a source was removed
     */
    removeSource(name) {
        const entry = this.sources.get(name);
        if (!entry) return false;

        this._detachSourceListeners(entry);
        this.sources.delete(name);

        this._emit('sourceRemoved', { name, type: entry.type });
        console.log(`SpatialInputSystem: Source removed "${name}"`);
        return true;
    }

    /**
     * Check whether a source with the given name is registered.
     * @param {string} name
     * @returns {boolean}
     */
    hasSource(name) {
        return this.sources.has(name);
    }

    /**
     * Get a list of all registered source names and types.
     * @returns {{ name: string, type: string, active: boolean }[]}
     */
    listSources() {
        const list = [];
        for (const [name, entry] of this.sources) {
            list.push({ name, type: entry.type, active: entry.active });
        }
        return list;
    }

    // ------------------------------------------------------------------
    // Mapping management
    // ------------------------------------------------------------------

    /**
     * Map a spatial axis to a VIB3+ parameter (or custom target).
     *
     * @param {string}   sourceAxis  - Spatial axis name (e.g. 'pitch', 'yaw')
     * @param {string}   targetParam - VIB3+ parameter name (e.g. 'rot4dXW')
     * @param {number}   [scale=1.0] - Scaling multiplier
     * @param {number[]} [clampRange=null] - Optional [min, max]
     * @param {string}   [blendMode='replace'] - One of BLEND_MODES
     * @returns {boolean} True if the mapping was added
     */
    setMapping(sourceAxis, targetParam, scale = 1.0, clampRange = null, blendMode = 'replace') {
        if (!SPATIAL_AXES.includes(sourceAxis)) {
            console.warn(`SpatialInputSystem.setMapping: unknown axis "${sourceAxis}"`);
            return false;
        }
        if (!this._isValidTarget(targetParam)) {
            console.warn(`SpatialInputSystem.setMapping: unknown target "${targetParam}"`);
            return false;
        }
        if (!BLEND_MODES.includes(blendMode)) {
            console.warn(`SpatialInputSystem.setMapping: unknown blend mode "${blendMode}", defaulting to "replace"`);
            blendMode = 'replace';
        }
        if (this.mappings.size >= MAX_MAPPINGS) {
            console.warn('SpatialInputSystem.setMapping: maximum mapping count reached');
            return false;
        }

        const key = `${sourceAxis}->${targetParam}`;

        /** @type {MappingEntry} */
        const entry = {
            axis: sourceAxis,
            target: targetParam,
            scale: Number.isFinite(scale) ? scale : 1.0,
            clamp: Array.isArray(clampRange) && clampRange.length === 2 ? clampRange : null,
            blendMode
        };

        this.mappings.set(key, entry);
        this._emit('mappingChanged', entry);
        return true;
    }

    /**
     * Remove a specific axis-to-parameter mapping.
     * @param {string} sourceAxis
     * @param {string} targetParam
     * @returns {boolean}
     */
    removeMapping(sourceAxis, targetParam) {
        const key = `${sourceAxis}->${targetParam}`;
        const removed = this.mappings.delete(key);
        if (removed) {
            this._emit('mappingRemoved', { axis: sourceAxis, target: targetParam });
        }
        return removed;
    }

    /**
     * Clear all active mappings.
     */
    clearMappings() {
        this.mappings.clear();
        this._emit('mappingsCleared');
    }

    /**
     * Get all current mappings as an array.
     * @returns {MappingEntry[]}
     */
    listMappings() {
        return Array.from(this.mappings.values());
    }

    // ------------------------------------------------------------------
    // Profiles
    // ------------------------------------------------------------------

    /**
     * Load a mapping profile by name, replacing all current mappings.
     *
     * @param {string} profileName
     * @returns {boolean} True if the profile was loaded
     *
     * @example
     * spatial.loadProfile('cardTilt');
     */
    loadProfile(profileName) {
        const profile = this.profiles.get(profileName);
        if (!profile) {
            console.warn(`SpatialInputSystem.loadProfile: unknown profile "${profileName}"`);
            return false;
        }

        // Clear existing mappings
        this.clearMappings();

        // Apply profile smoothing
        if (typeof profile.smoothing === 'number') {
            this.smoothingFactor = clamp(profile.smoothing, 0, 1);
        }

        // Install all mappings from the profile
        for (const m of profile.mappings) {
            this.setMapping(m.axis, m.target, m.scale, m.clamp || null, m.blendMode || 'replace');
        }

        this.activeProfile = profileName;
        this._emit('profileLoaded', { name: profileName, profile });
        console.log(`SpatialInputSystem: Profile loaded "${profileName}"`);
        return true;
    }

    /**
     * Create (or overwrite) a custom mapping profile.
     *
     * @param {string}         name        - Profile identifier
     * @param {MappingEntry[]} mappings    - Array of mapping definitions
     * @param {Object}         [meta={}]   - Optional metadata
     * @param {string}         [meta.description]
     * @param {string[]}       [meta.sources]
     * @param {number}         [meta.smoothing]
     * @returns {boolean}
     */
    createProfile(name, mappings, meta = {}) {
        if (!name || typeof name !== 'string') {
            console.warn('SpatialInputSystem.createProfile: name must be a non-empty string');
            return false;
        }
        if (!Array.isArray(mappings) || mappings.length === 0) {
            console.warn('SpatialInputSystem.createProfile: mappings must be a non-empty array');
            return false;
        }

        /** @type {ProfileDef} */
        const profile = {
            name: meta.name || name,
            description: meta.description || `Custom profile: ${name}`,
            mappings: mappings.map(m => ({
                axis: m.axis,
                target: m.target,
                scale: Number.isFinite(m.scale) ? m.scale : 1.0,
                clamp: Array.isArray(m.clamp) ? m.clamp : null,
                blendMode: m.blendMode || 'replace'
            })),
            sources: Array.isArray(meta.sources) ? meta.sources : [],
            smoothing: typeof meta.smoothing === 'number' ? clamp(meta.smoothing, 0, 1) : this.smoothingFactor
        };

        this.profiles.set(name, profile);
        this._emit('profileCreated', { name, profile });
        console.log(`SpatialInputSystem: Profile created "${name}"`);
        return true;
    }

    /**
     * Remove a custom profile (built-in profiles cannot be removed).
     * @param {string} name
     * @returns {boolean}
     */
    removeProfile(name) {
        const builtIn = ['cardTilt', 'wearablePerspective', 'gameAsset', 'vjAudioSpatial', 'uiElement', 'immersiveXR'];
        if (builtIn.includes(name)) {
            console.warn(`SpatialInputSystem.removeProfile: cannot remove built-in profile "${name}"`);
            return false;
        }
        return this.profiles.delete(name);
    }

    /**
     * Get a list of all available profile names.
     * @returns {string[]}
     */
    listProfiles() {
        return Array.from(this.profiles.keys());
    }

    /**
     * Get a profile definition by name.
     * @param {string} name
     * @returns {ProfileDef|null}
     */
    getProfile(name) {
        const p = this.profiles.get(name);
        return p ? { ...p, mappings: p.mappings.map(m => ({ ...m })) } : null;
    }

    // ------------------------------------------------------------------
    // Custom targets
    // ------------------------------------------------------------------

    /**
     * Register a custom target parameter name (beyond TARGETABLE_PARAMETERS).
     * @param {string} name
     */
    addCustomTarget(name) {
        if (typeof name === 'string' && name.length > 0) {
            this._customTargets.add(name);
        }
    }

    /**
     * Remove a custom target parameter name.
     * @param {string} name
     */
    removeCustomTarget(name) {
        this._customTargets.delete(name);
    }

    /**
     * Check whether a target name is valid (built-in or custom).
     * @private
     * @param {string} name
     * @returns {boolean}
     */
    _isValidTarget(name) {
        return TARGETABLE_PARAMETERS.includes(name) || this._customTargets.has(name);
    }

    // ------------------------------------------------------------------
    // Enable / Disable
    // ------------------------------------------------------------------

    /**
     * Start processing input and updating parameters each frame.
     */
    enable() {
        if (this.enabled) return;

        this.enabled = true;
        this._lastFrameTime = performance.now();

        // Attach listeners for all registered sources
        for (const entry of this.sources.values()) {
            this._attachSourceListeners(entry);
        }

        // Start frame loop
        this._scheduleFrame();

        this._emit('enabled');
        console.log('SpatialInputSystem: Enabled');
    }

    /**
     * Stop processing and detach all listeners.
     */
    disable() {
        if (!this.enabled) return;

        this.enabled = false;

        // Cancel frame loop
        if (this._frameId !== null) {
            cancelAnimationFrame(this._frameId);
            this._frameId = null;
        }

        // Detach listeners for all registered sources
        for (const entry of this.sources.values()) {
            this._detachSourceListeners(entry);
        }

        this._emit('disabled');
        console.log('SpatialInputSystem: Disabled');
    }

    /**
     * Whether the system is currently active.
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    // ------------------------------------------------------------------
    // Configuration setters
    // ------------------------------------------------------------------

    /**
     * Set the global sensitivity multiplier.
     * @param {number} value - 0.1 .. 10
     */
    setSensitivity(value) {
        this.sensitivity = clamp(Number(value) || 1.0, 0.1, 10);
    }

    /**
     * Set the default smoothing factor.
     * @param {number} value - 0 .. 1 (0 = no smoothing, 1 = maximum smoothing)
     */
    setSmoothing(value) {
        this.smoothingFactor = clamp(Number(value) || 0.15, 0, 1);
    }

    /**
     * Set per-axis smoothing override.
     * @param {string} axis  - Spatial axis name
     * @param {number} value - 0 .. 1
     */
    setAxisSmoothing(axis, value) {
        if (SPATIAL_AXES.includes(axis)) {
            this.smoothing.set(axis, clamp(Number(value) || 0, 0, 1));
        }
    }

    /**
     * Enable or disable dramatic mode (8x amplification).
     * @param {boolean} enabled
     */
    setDramaticMode(enabled) {
        this.dramaticMode = !!enabled;
        this._emit('dramaticModeChanged', this.dramaticMode);
        console.log(`SpatialInputSystem: Dramatic mode ${this.dramaticMode ? 'ON' : 'OFF'}`);
    }

    /**
     * Set the parameter update callback.
     * @param {Function} fn - (paramName: string, value: number) => void
     */
    setParameterUpdateFn(fn) {
        this.parameterUpdateFn = typeof fn === 'function' ? fn : null;
    }

    // ------------------------------------------------------------------
    // Manual data injection
    // ------------------------------------------------------------------

    /**
     * Feed spatial data from an external/programmatic source.
     *
     * @param {string} sourceType - One of SOURCE_TYPES
     * @param {Object} data       - Partial spatial state or source-specific data
     *
     * @example
     * // Programmatic: set pitch and roll directly
     * spatial.feedInput('programmatic', { pitch: 0.5, roll: -0.3 });
     *
     * // Audio: provide frequency band levels
     * spatial.feedInput('audio', { bass: 0.8, mid: 0.4, high: 0.2 });
     *
     * // MIDI: provide channel, CC number, and value
     * spatial.feedInput('midi', { channel: 0, cc: 1, value: 64 });
     */
    feedInput(sourceType, data) {
        if (!data || typeof data !== 'object') return;

        switch (sourceType) {
            case SOURCE_TYPES.PROGRAMMATIC:
                this._processProgrammatic(data);
                break;
            case SOURCE_TYPES.DEVICE_TILT:
                this._processDeviceTilt(data);
                break;
            case SOURCE_TYPES.MOUSE_POSITION:
                this._processMousePosition(
                    Number(data.x) || 0,
                    Number(data.y) || 0,
                    data.width || (typeof window !== 'undefined' ? window.innerWidth : 1920),
                    data.height || (typeof window !== 'undefined' ? window.innerHeight : 1080)
                );
                break;
            case SOURCE_TYPES.GYROSCOPE:
                this._processGyroscope(data);
                break;
            case SOURCE_TYPES.GAMEPAD:
                this._processGamepad(data);
                break;
            case SOURCE_TYPES.PERSPECTIVE:
                this._processPerspective(data);
                break;
            case SOURCE_TYPES.AUDIO:
                this._processAudioSpatial(
                    Number(data.bass) || 0,
                    Number(data.mid) || 0,
                    Number(data.high) || 0
                );
                break;
            case SOURCE_TYPES.MIDI:
                this._processMIDI(
                    Number(data.channel) || 0,
                    Number(data.cc) || 0,
                    Number(data.value) || 0
                );
                break;
            default:
                console.warn(`SpatialInputSystem.feedInput: unknown source type "${sourceType}"`);
        }
    }

    // ------------------------------------------------------------------
    // State retrieval
    // ------------------------------------------------------------------

    /**
     * Get the current smoothed spatial state.
     * @returns {SpatialState}
     */
    getState() {
        return { ...this.smoothedState };
    }

    /**
     * Get the raw (pre-smoothing) spatial state.
     * @returns {SpatialState}
     */
    getRawState() {
        return { ...this.spatialState };
    }

    // ------------------------------------------------------------------
    // Serialisation
    // ------------------------------------------------------------------

    /**
     * Export the full configuration (sources, mappings, profile, settings).
     * @returns {Object}
     */
    exportConfig() {
        return {
            version: '1.0',
            sensitivity: this.sensitivity,
            smoothingFactor: this.smoothingFactor,
            dramaticMode: this.dramaticMode,
            activeProfile: this.activeProfile,
            sources: this.listSources(),
            mappings: this.listMappings(),
            customTargets: Array.from(this._customTargets),
            axisSmoothing: Object.fromEntries(this.smoothing)
        };
    }

    /**
     * Import a previously exported configuration.
     *
     * @param {Object} config - Configuration object from exportConfig()
     * @returns {boolean} True if import succeeded
     */
    importConfig(config) {
        if (!config || typeof config !== 'object') {
            console.warn('SpatialInputSystem.importConfig: invalid config');
            return false;
        }

        try {
            // Settings
            if (Number.isFinite(config.sensitivity)) {
                this.setSensitivity(config.sensitivity);
            }
            if (Number.isFinite(config.smoothingFactor)) {
                this.setSmoothing(config.smoothingFactor);
            }
            if (typeof config.dramaticMode === 'boolean') {
                this.setDramaticMode(config.dramaticMode);
            }

            // Custom targets
            if (Array.isArray(config.customTargets)) {
                this._customTargets.clear();
                for (const t of config.customTargets) {
                    this.addCustomTarget(t);
                }
            }

            // Axis smoothing overrides
            if (config.axisSmoothing && typeof config.axisSmoothing === 'object') {
                this.smoothing.clear();
                for (const [axis, val] of Object.entries(config.axisSmoothing)) {
                    this.setAxisSmoothing(axis, val);
                }
            }

            // Sources
            if (Array.isArray(config.sources)) {
                // Remove all existing sources first
                for (const name of Array.from(this.sources.keys())) {
                    this.removeSource(name);
                }
                for (const s of config.sources) {
                    if (s.name && s.type) {
                        this.addSource(s.name, s.type, s.config || {});
                    }
                }
            }

            // Mappings
            if (Array.isArray(config.mappings)) {
                this.clearMappings();
                for (const m of config.mappings) {
                    this.setMapping(m.axis, m.target, m.scale, m.clamp, m.blendMode);
                }
            }

            // Profile (load after mappings -- if a profile is specified, it
            // replaces the explicit mappings above)
            if (config.activeProfile && this.profiles.has(config.activeProfile)) {
                this.loadProfile(config.activeProfile);
            }

            this._emit('configImported', config);
            console.log('SpatialInputSystem: Config imported');
            return true;
        } catch (err) {
            console.error('SpatialInputSystem.importConfig: error during import', err);
            return false;
        }
    }

    // ------------------------------------------------------------------
    // Frame processing
    // ------------------------------------------------------------------

    /**
     * Schedule the next animation frame.
     * @private
     */
    _scheduleFrame() {
        if (!this.enabled) return;
        this._frameId = requestAnimationFrame((ts) => this._onFrame(ts));
    }

    /**
     * Animation frame callback.
     * @private
     * @param {number} timestamp - High-resolution timestamp from rAF
     */
    _onFrame(timestamp) {
        if (!this.enabled) return;

        const deltaTime = Math.min((timestamp - this._lastFrameTime) / 1000, 0.1); // cap at 100ms
        this._lastFrameTime = timestamp;

        // Poll sources that need polling (e.g. gamepad)
        this._pollSources();

        // Run the main processing pipeline
        this.processFrame(deltaTime);

        // Schedule next
        this._scheduleFrame();
    }

    /**
     * Main per-frame processing pipeline.
     *
     * 1. Compute velocity from state delta
     * 2. Compute intensity from overall displacement
     * 3. Apply smoothing
     * 4. Apply dramatic mode amplification
     * 5. Map smoothed state to parameters via active mappings
     * 6. Invoke parameter update callbacks
     *
     * @param {number} deltaTime - Seconds since last frame
     */
    processFrame(deltaTime) {
        const dt = Number.isFinite(deltaTime) && deltaTime > 0 ? deltaTime : 1 / 60;

        // -- Compute derived values --

        // Intensity: Euclidean distance of orientation + translation from origin
        const rawIntensity = Math.sqrt(
            this.spatialState.pitch * this.spatialState.pitch +
            this.spatialState.yaw * this.spatialState.yaw +
            this.spatialState.roll * this.spatialState.roll +
            this.spatialState.x * this.spatialState.x +
            this.spatialState.y * this.spatialState.y +
            this.spatialState.z * this.spatialState.z
        );
        this.spatialState.intensity = clamp(rawIntensity / Math.SQRT2, 0, 1);

        // -- Smooth all axes --
        for (const axis of SPATIAL_AXES) {
            const factor = this.smoothing.has(axis)
                ? this.smoothing.get(axis)
                : this.smoothingFactor;

            // Lerp factor: lower smoothingFactor = more responsive
            const lerpFactor = 1.0 - factor;

            this.smoothedState[axis] = lerp(
                this.smoothedState[axis],
                this.spatialState[axis],
                clamp(lerpFactor, 0, 1)
            );
        }

        // Velocity: rate of change of the smoothed state
        let velocitySum = 0;
        for (const axis of ['pitch', 'yaw', 'roll', 'x', 'y', 'z']) {
            const delta = this.smoothedState[axis] - this._prevSmoothedState[axis];
            velocitySum += delta * delta;
        }
        this.smoothedState.velocity = clamp(Math.sqrt(velocitySum) / (dt * 10), 0, 1);

        // Store previous state
        Object.assign(this._prevSmoothedState, this.smoothedState);

        // -- Apply mappings --
        this._applyMappings();
    }

    /**
     * Apply all active mappings, reading from smoothedState and invoking
     * the parameter update callback.
     * @private
     */
    _applyMappings() {
        if (!this.parameterUpdateFn) return;

        // Accumulate per-target to handle multiple mappings to the same target
        /** @type {Map<string, { value: number, mode: string }>} */
        const accumulator = new Map();

        for (const mapping of this.mappings.values()) {
            const rawValue = this.smoothedState[mapping.axis] || 0;

            // Apply sensitivity and scale
            let value = rawValue * mapping.scale * this.sensitivity;

            // Dramatic mode amplification
            if (this.dramaticMode) {
                value *= DRAMATIC_MULTIPLIER;
            }

            // Clamp if configured
            if (mapping.clamp) {
                value = clamp(value, mapping.clamp[0], mapping.clamp[1]);
            }

            // Guard against NaN
            if (!Number.isFinite(value)) continue;

            const mode = mapping.blendMode || 'replace';
            const existing = accumulator.get(mapping.target);

            if (!existing) {
                accumulator.set(mapping.target, { value, mode });
            } else {
                // Combine multiple mappings targeting the same parameter
                switch (mode) {
                    case 'add':
                        existing.value += value;
                        break;
                    case 'multiply':
                        existing.value *= value;
                        break;
                    case 'max':
                        existing.value = Math.max(existing.value, value);
                        break;
                    case 'min':
                        existing.value = Math.min(existing.value, value);
                        break;
                    case 'replace':
                    default:
                        existing.value = value;
                        break;
                }
            }
        }

        // Invoke callback for each accumulated target
        for (const [param, { value }] of accumulator) {
            try {
                this.parameterUpdateFn(param, value);
            } catch (err) {
                console.error(`SpatialInputSystem: Error updating parameter "${param}"`, err);
            }
        }
    }

    // ------------------------------------------------------------------
    // Input source listeners
    // ------------------------------------------------------------------

    /**
     * Attach native event listeners for a source.
     * @private
     * @param {SourceEntry} entry
     */
    _attachSourceListeners(entry) {
        if (typeof window === 'undefined') return;

        switch (entry.type) {
            case SOURCE_TYPES.DEVICE_TILT:
                this._attachDeviceTilt(entry);
                break;
            case SOURCE_TYPES.MOUSE_POSITION:
                this._attachMousePosition(entry);
                break;
            case SOURCE_TYPES.GYROSCOPE:
                this._attachGyroscope(entry);
                break;
            case SOURCE_TYPES.GAMEPAD:
                // Gamepad is polled, not event-driven; mark for polling
                entry._cleanup = null;
                break;
            case SOURCE_TYPES.PERSPECTIVE:
            case SOURCE_TYPES.PROGRAMMATIC:
            case SOURCE_TYPES.AUDIO:
            case SOURCE_TYPES.MIDI:
                // These are feed-based; no automatic listeners
                entry._cleanup = null;
                break;
        }
    }

    /**
     * Detach native event listeners for a source.
     * @private
     * @param {SourceEntry} entry
     */
    _detachSourceListeners(entry) {
        if (typeof entry._cleanup === 'function') {
            entry._cleanup();
            entry._cleanup = null;
        }
    }

    /**
     * Attach DeviceOrientationEvent listener.
     * @private
     * @param {SourceEntry} entry
     */
    _attachDeviceTilt(entry) {
        if (typeof window === 'undefined') return;

        const handler = (event) => {
            if (!entry.active) return;
            this._processDeviceTilt(event);
        };

        // Request permission on iOS 13+
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then((permission) => {
                    if (permission === 'granted') {
                        window.addEventListener('deviceorientation', handler);
                    } else {
                        console.warn('SpatialInputSystem: Device orientation permission denied');
                    }
                })
                .catch((err) => {
                    console.warn('SpatialInputSystem: Device orientation permission error', err);
                });
        } else {
            window.addEventListener('deviceorientation', handler);
        }

        entry._cleanup = () => {
            window.removeEventListener('deviceorientation', handler);
        };
    }

    /**
     * Attach mousemove listener.
     * @private
     * @param {SourceEntry} entry
     */
    _attachMousePosition(entry) {
        if (typeof window === 'undefined') return;

        const element = entry.config.element || window;
        const handler = (event) => {
            if (!entry.active) return;
            this._processMousePosition(
                event.clientX,
                event.clientY,
                window.innerWidth,
                window.innerHeight
            );
        };

        element.addEventListener('mousemove', handler);
        entry._cleanup = () => {
            element.removeEventListener('mousemove', handler);
        };
    }

    /**
     * Attach GyroscopeSensor API (Generic Sensor API).
     * @private
     * @param {SourceEntry} entry
     */
    _attachGyroscope(entry) {
        if (typeof window === 'undefined' || typeof window.Gyroscope === 'undefined') {
            console.warn('SpatialInputSystem: Gyroscope API not available');
            return;
        }

        try {
            const frequency = entry.config.frequency || 60;
            const sensor = new window.Gyroscope({ frequency });

            sensor.addEventListener('reading', () => {
                if (!entry.active) return;
                this._processGyroscope({
                    x: sensor.x,
                    y: sensor.y,
                    z: sensor.z
                });
            });

            sensor.addEventListener('error', (event) => {
                console.warn('SpatialInputSystem: Gyroscope error', event.error);
            });

            sensor.start();
            this._gyroscopeSensor = sensor;

            entry._cleanup = () => {
                sensor.stop();
                this._gyroscopeSensor = null;
            };
        } catch (err) {
            console.warn('SpatialInputSystem: Failed to initialise Gyroscope', err);
        }
    }

    /**
     * Poll-based sources (called every frame).
     * @private
     */
    _pollSources() {
        for (const entry of this.sources.values()) {
            if (!entry.active) continue;

            switch (entry.type) {
                case SOURCE_TYPES.GAMEPAD:
                    this._pollGamepad(entry);
                    break;
                // Other poll-based sources can be added here
            }
        }
    }

    /**
     * Poll the Gamepad API for analog stick data.
     * @private
     * @param {SourceEntry} entry
     */
    _pollGamepad(entry) {
        if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;

        const gamepads = navigator.getGamepads();
        const index = entry.config.index || 0;
        const gamepad = gamepads[index];

        if (!gamepad || !gamepad.connected) return;

        this._processGamepad(gamepad, entry.config);
    }

    // ------------------------------------------------------------------
    // Input processors
    // ------------------------------------------------------------------

    /**
     * Process DeviceOrientationEvent data.
     *
     * Maps:
     *   beta  (-180..180) --> pitch (-1..1)
     *   gamma (-90..90)   --> roll  (-1..1)
     *   alpha (0..360)    --> yaw   (-1..1)
     *
     * @private
     * @param {DeviceOrientationEvent|Object} event
     */
    _processDeviceTilt(event) {
        const alpha = Number(event.alpha) || 0; // 0..360
        const beta = Number(event.beta) || 0;   // -180..180
        const gamma = Number(event.gamma) || 0; // -90..90

        // Normalise to -1..1
        this.spatialState.pitch = clamp(beta / 90, -1, 1);
        this.spatialState.roll = clamp(gamma / 45, -1, 1);
        this.spatialState.yaw = clamp((alpha - 180) / 180, -1, 1);
    }

    /**
     * Process mouse position as spatial orientation.
     *
     * Maps screen-relative position to pitch (vertical) and roll (horizontal).
     * Centre of screen = neutral (0, 0).
     *
     * @private
     * @param {number} x       - Mouse X pixel coordinate
     * @param {number} y       - Mouse Y pixel coordinate
     * @param {number} [width]  - Viewport width
     * @param {number} [height] - Viewport height
     */
    _processMousePosition(x, y, width, height) {
        const w = Number(width) || (typeof window !== 'undefined' ? window.innerWidth : 1920);
        const h = Number(height) || (typeof window !== 'undefined' ? window.innerHeight : 1080);

        if (w === 0 || h === 0) return;

        // Normalise to -1..1 (centre = 0)
        const normX = clamp(((x / w) - 0.5) * 2, -1, 1);
        const normY = clamp(((y / h) - 0.5) * 2, -1, 1);

        this.spatialState.roll = normX;
        this.spatialState.pitch = -normY; // Inverted: mouse up = positive pitch
        // Yaw stays unchanged by mouse (no horizontal rotation equivalent)
    }

    /**
     * Process GyroscopeSensor reading.
     *
     * Maps angular velocity (rad/s) to spatial axes.
     * Integrates velocity over time to produce position-like values
     * with natural decay.
     *
     * @private
     * @param {Object} event
     * @param {number} event.x - Angular velocity around X axis (rad/s)
     * @param {number} event.y - Angular velocity around Y axis (rad/s)
     * @param {number} event.z - Angular velocity around Z axis (rad/s)
     */
    _processGyroscope(event) {
        const gx = Number(event.x) || 0;
        const gy = Number(event.y) || 0;
        const gz = Number(event.z) || 0;

        // Scale factor to normalise typical angular velocity range (-10..10 rad/s) to -1..1
        const scale = 0.1;
        // Decay factor for integration (prevents drift)
        const decay = 0.95;

        this.spatialState.pitch = clamp(this.spatialState.pitch * decay + gx * scale, -1, 1);
        this.spatialState.roll = clamp(this.spatialState.roll * decay + gy * scale, -1, 1);
        this.spatialState.yaw = clamp(this.spatialState.yaw * decay + gz * scale, -1, 1);
    }

    /**
     * Process Gamepad API data.
     *
     * Standard mapping:
     *   Left stick X   --> roll
     *   Left stick Y   --> pitch
     *   Right stick X  --> yaw
     *   Right stick Y  --> z (depth)
     *   Left trigger    --> negative x
     *   Right trigger   --> positive x
     *
     * @private
     * @param {Gamepad|Object} gamepad
     * @param {Object} [config={}]
     * @param {number} [config.deadzone=0.1] - Analog stick deadzone
     */
    _processGamepad(gamepad, config = {}) {
        const deadzone = Number(config.deadzone) || 0.1;
        const axes = gamepad.axes || [];
        const buttons = gamepad.buttons || [];

        /**
         * Apply deadzone to a value.
         * @param {number} v
         * @returns {number}
         */
        const applyDeadzone = (v) => {
            return Math.abs(v) < deadzone ? 0 : v;
        };

        // Left stick
        if (axes.length >= 2) {
            this.spatialState.roll = clamp(applyDeadzone(axes[0]), -1, 1);
            this.spatialState.pitch = clamp(applyDeadzone(-axes[1]), -1, 1); // Invert Y
        }

        // Right stick
        if (axes.length >= 4) {
            this.spatialState.yaw = clamp(applyDeadzone(axes[2]), -1, 1);
            this.spatialState.z = clamp(applyDeadzone(-axes[3]), -1, 1);
        }

        // Triggers (L2 = button 6, R2 = button 7 in standard mapping)
        if (buttons.length >= 8) {
            const lt = typeof buttons[6] === 'object' ? buttons[6].value : Number(buttons[6]) || 0;
            const rt = typeof buttons[7] === 'object' ? buttons[7].value : Number(buttons[7]) || 0;
            this.spatialState.x = clamp(rt - lt, -1, 1);
        }
    }

    /**
     * Process AR/wearable perspective data.
     *
     * Expects pre-normalised orientation and position data from a
     * perspective tracking system (WebXR, custom AR SDK, etc.).
     *
     * @private
     * @param {Object} data
     * @param {number} [data.pitch]  - Viewing pitch (-1..1)
     * @param {number} [data.yaw]    - Viewing yaw (-1..1)
     * @param {number} [data.roll]   - Viewing roll (-1..1)
     * @param {number} [data.x]      - Position X (-1..1)
     * @param {number} [data.y]      - Position Y (-1..1)
     * @param {number} [data.z]      - Position Z (-1..1)
     */
    _processPerspective(data) {
        if (Number.isFinite(data.pitch)) {
            this.spatialState.pitch = clamp(data.pitch, -1, 1);
        }
        if (Number.isFinite(data.yaw)) {
            this.spatialState.yaw = clamp(data.yaw, -1, 1);
        }
        if (Number.isFinite(data.roll)) {
            this.spatialState.roll = clamp(data.roll, -1, 1);
        }
        if (Number.isFinite(data.x)) {
            this.spatialState.x = clamp(data.x, -1, 1);
        }
        if (Number.isFinite(data.y)) {
            this.spatialState.y = clamp(data.y, -1, 1);
        }
        if (Number.isFinite(data.z)) {
            this.spatialState.z = clamp(data.z, -1, 1);
        }
    }

    /**
     * Process audio frequency band levels as spatial movement.
     *
     * Maps:
     *   bass   --> pitch (deep frequencies drive forward tilt)
     *   mid    --> yaw   (mid-range drives lateral movement)
     *   high   --> roll  (high frequencies drive shimmer/roll)
     *   energy --> x     (overall volume drives translation)
     *
     * Values are normalised 0..1 and mapped to -1..1 spatial range
     * using oscillation modulated by the input level.
     *
     * @private
     * @param {number} bass - Bass band level (0..1)
     * @param {number} mid  - Mid band level (0..1)
     * @param {number} high - High band level (0..1)
     */
    _processAudioSpatial(bass, mid, high) {
        const b = clamp(bass, 0, 1);
        const m = clamp(mid, 0, 1);
        const h = clamp(high, 0, 1);
        const energy = (b + m + h) / 3;

        // Use time-based oscillation modulated by audio levels.
        // This creates organic movement rather than static positioning.
        const t = typeof performance !== 'undefined' ? performance.now() * 0.001 : Date.now() * 0.001;

        this.spatialState.pitch = clamp(Math.sin(t * 1.3) * b, -1, 1);
        this.spatialState.yaw = clamp(Math.sin(t * 0.7) * m, -1, 1);
        this.spatialState.roll = clamp(Math.sin(t * 2.1) * h, -1, 1);
        this.spatialState.x = clamp(Math.cos(t * 0.5) * energy, -1, 1);
        this.spatialState.y = clamp(energy * 2 - 1, -1, 1);
    }

    /**
     * Process MIDI Control Change data.
     *
     * Default mapping (configurable by adding sources with config):
     *   CC 1  (Mod Wheel) --> pitch
     *   CC 2  (Breath)    --> yaw
     *   CC 11 (Expression)--> roll
     *   CC 74 (Brightness)--> x
     *   CC 71 (Resonance) --> y
     *   CC 7  (Volume)    --> z
     *
     * MIDI CC values are 0..127, normalised to -1..1.
     *
     * @private
     * @param {number} channel - MIDI channel (0..15)
     * @param {number} cc      - Control Change number (0..127)
     * @param {number} value   - CC value (0..127)
     */
    _processMIDI(channel, cc, value) {
        // Normalise 0..127 to -1..1
        const norm = clamp((value / 63.5) - 1.0, -1, 1);
        // Normalise 0..127 to 0..1 (for unipolar axes)
        const normUni = clamp(value / 127, 0, 1);

        switch (cc) {
            case 1:  // Mod Wheel
                this.spatialState.pitch = norm;
                break;
            case 2:  // Breath Controller
                this.spatialState.yaw = norm;
                break;
            case 11: // Expression Controller
                this.spatialState.roll = norm;
                break;
            case 74: // Brightness (MPE slide)
                this.spatialState.x = norm;
                break;
            case 71: // Resonance / Timbre
                this.spatialState.y = norm;
                break;
            case 7:  // Channel Volume
                this.spatialState.z = norm;
                break;
            default: {
                // For unmapped CCs, distribute across axes by CC group
                // This allows any CC to have some spatial effect
                const axisIndex = cc % 6;
                const axes = ['pitch', 'yaw', 'roll', 'x', 'y', 'z'];
                this.spatialState[axes[axisIndex]] = norm;
                break;
            }
        }

        this._emit('midiInput', { channel, cc, value, normalized: norm });
    }

    /**
     * Process programmatic / direct API input.
     * Accepts a partial SpatialState and merges it.
     *
     * @private
     * @param {Partial<SpatialState>} data
     */
    _processProgrammatic(data) {
        for (const axis of SPATIAL_AXES) {
            if (Number.isFinite(data[axis])) {
                if (axis === 'intensity' || axis === 'velocity') {
                    this.spatialState[axis] = clamp(data[axis], 0, 1);
                } else {
                    this.spatialState[axis] = clamp(data[axis], -1, 1);
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // Event system
    // ------------------------------------------------------------------

    /**
     * Subscribe to an event.
     * @param {string}   event    - Event name
     * @param {Function} callback - Handler function
     */
    on(event, callback) {
        if (typeof callback !== 'function') return;
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
    }

    /**
     * Unsubscribe from an event.
     * @param {string}   event    - Event name
     * @param {Function} callback - Handler to remove
     */
    off(event, callback) {
        if (!this._listeners.has(event)) return;
        const arr = this._listeners.get(event);
        const idx = arr.indexOf(callback);
        if (idx !== -1) {
            arr.splice(idx, 1);
        }
    }

    /**
     * Emit an event to all registered listeners.
     * @private
     * @param {string} event
     * @param {*}      [data]
     */
    _emit(event, data) {
        if (!this._listeners.has(event)) return;
        for (const fn of this._listeners.get(event)) {
            try {
                fn(data);
            } catch (err) {
                console.error(`SpatialInputSystem: Event handler error for "${event}"`, err);
            }
        }
    }

    // ------------------------------------------------------------------
    // Cleanup
    // ------------------------------------------------------------------

    /**
     * Completely destroy the system, removing all listeners, sources,
     * and global references.
     */
    destroy() {
        this.disable();

        // Remove all sources (which cleans up their listeners)
        for (const name of Array.from(this.sources.keys())) {
            this.removeSource(name);
        }

        this.mappings.clear();
        this._listeners.clear();
        this._customTargets.clear();
        this.smoothing.clear();

        // Clean up global references
        if (typeof window !== 'undefined') {
            if (window.spatialInputSystem === this) {
                delete window.spatialInputSystem;
            }
            delete window.enableSpatialInput;
            delete window.disableSpatialInput;
            delete window.setSpatialProfile;
            delete window.feedSpatialInput;
            delete window.getSpatialState;
        }

        console.log('SpatialInputSystem: Destroyed');
    }
}

// ---------------------------------------------------------------------------
// Default instance setup
// ---------------------------------------------------------------------------

/**
 * Create and return a default SpatialInputSystem instance.
 *
 * The instance is created with default settings and registers global helpers
 * on the window object.  The caller should then add sources, load a profile,
 * and call `enable()`.
 *
 * @param {SpatialInputOptions} [options={}]
 * @returns {SpatialInputSystem}
 *
 * @example
 * import { createSpatialInputSystem } from './SpatialInputSystem.js';
 *
 * const spatial = createSpatialInputSystem({
 *     onParameterUpdate: (name, value) => engine.setParameter(name, value)
 * });
 * spatial.addSource('mouse', 'mousePosition');
 * spatial.loadProfile('uiElement');
 * spatial.enable();
 */
export function createSpatialInputSystem(options = {}) {
    return new SpatialInputSystem(options);
}

export default SpatialInputSystem;
