/**
 * VIB3+ Engine - Unified Visualization System
 * Coordinates Quantum, Faceted, and Holographic systems
 * Supports 24 geometries per system with full 6D rotation
 *
 * Backend selection: Faceted supports WebGL/WebGPU via UnifiedRenderBridge.
 * Quantum and Holographic use direct WebGL (5-layer canvas architecture).
 */

import { ParameterManager } from './Parameters.js';
import { CanvasManager } from './CanvasManager.js';
import { QuantumEngine } from '../quantum/QuantumEngine.js';
import { FacetedSystem } from '../faceted/FacetedSystem.js';
import { RealHolographicSystem } from '../holograms/RealHolographicSystem.js';
import { ReactivityManager } from '../reactivity/ReactivityManager.js';
import { ReactivityConfig } from '../reactivity/ReactivityConfig.js';
import { SpatialInputSystem } from '../reactivity/SpatialInputSystem.js';

export class VIB3Engine {
    /**
     * @param {object} [options]
     * @param {boolean} [options.preferWebGPU=true] - Prefer WebGPU with WebGL fallback
     * @param {boolean} [options.debug=false] - Enable debug logging
     * @param {object|ReactivityConfig} [options.reactivityConfig] - Initial reactivity config
     */
    constructor(options = {}) {
        this.activeSystem = null; // Only one system active at a time
        this.currentSystemName = 'quantum';
        this.parameters = new ParameterManager();
        this.initialized = false;
        this.canvasManager = null;

        /** @type {boolean} Whether to prefer WebGPU (default: true, falls back to WebGL) */
        this.preferWebGPU = options.preferWebGPU !== false;

        /** @type {boolean} Debug mode */
        this.debug = options.debug || false;

        /** @type {ReactivityManager} Reactivity system for audio/tilt/interaction */
        this.reactivity = new ReactivityManager((name, value) => {
            this.parameters.setParameter(name, value);
            this.updateCurrentSystemParameters();
        });

        /** @type {SpatialInputSystem} Universal spatial input (evolved tilt/perspective/gamepad) */
        this.spatialInput = new SpatialInputSystem({
            sensitivity: options.spatialSensitivity || 1.0,
            smoothing: options.spatialSmoothing || 0.15,
            onParameterUpdate: (name, value) => {
                this.parameters.setParameter(name, value);
                this.updateCurrentSystemParameters();
            }
        });

        // Load initial reactivity config if provided
        if (options.reactivityConfig) {
            this.reactivity.loadConfig(options.reactivityConfig);
        }

        // Load initial spatial profile if provided
        if (options.spatialProfile) {
            this.spatialInput.loadProfile(options.spatialProfile);
        }
    }

    /**
     * Initialize the VIB3+ engine
     */
    async initialize(containerId = 'vib3-container') {
        console.log('Initializing VIB3+ Engine');

        // Create CanvasManager
        try {
            this.canvasManager = new CanvasManager(containerId);
        } catch (error) {
            console.error('CanvasManager initialization failed:', error);
            return false;
        }

        // Initialize starting system
        await this.switchSystem(this.currentSystemName);

        // Sync base parameters to reactivity manager
        this.reactivity.setBaseParameters(this.parameters.getAllParameters());

        this.initialized = true;
        console.log('VIB3+ Engine initialized');
        return true;
    }

    /**
     * Create and initialize a specific system
     * CRITICAL: Engines find canvases by ID in DOM, not passed as parameters!
     */
    async createSystem(systemName) {
        console.log(`Creating ${systemName} system...`);

        // Create canvases with correct IDs in DOM
        const canvasIds = this.canvasManager.createSystemCanvases(systemName);

        let system = null;
        try {
            switch (systemName) {
                case 'quantum':
                    system = new QuantumEngine();
                    if (this.preferWebGPU) {
                        try {
                            const bridgeOk = await system.initWithBridge({
                                preferWebGPU: true,
                                debug: this.debug
                            });
                            if (bridgeOk) {
                                console.log('Quantum: WebGPU bridge active');
                                break;
                            }
                        } catch (_e) { /* fall through */ }
                        console.warn('Quantum: WebGPU bridge failed, falling back to WebGL');
                        system = new QuantumEngine();
                    }
                    break;

                case 'faceted':
                    system = new FacetedSystem();
                    if (this.preferWebGPU) {
                        const canvas = document.getElementById('content-canvas');
                        if (canvas) {
                            try {
                                const bridgeOk = await system.initWithBridge(canvas, {
                                    preferWebGPU: true,
                                    debug: this.debug
                                });
                                if (bridgeOk) {
                                    console.log('Faceted: WebGPU bridge active');
                                    break;
                                }
                            } catch (_e) { /* fall through */ }
                            console.warn('Faceted: WebGPU bridge failed, falling back to WebGL');
                            system = new FacetedSystem();
                        }
                    }

                    const facetedSuccess = system.initialize();
                    if (!facetedSuccess) {
                        throw new Error('Faceted system initialization failed');
                    }
                    break;

                case 'holographic':
                    system = new RealHolographicSystem();
                    if (this.preferWebGPU) {
                        try {
                            const bridgeOk = await system.initWithBridge({
                                preferWebGPU: true,
                                debug: this.debug
                            });
                            if (bridgeOk) {
                                console.log('Holographic: WebGPU bridge active');
                                break;
                            }
                        } catch (_e) { /* fall through */ }
                        console.warn('Holographic: WebGPU bridge failed, falling back to WebGL');
                        system = new RealHolographicSystem();
                    }
                    break;

                default:
                    throw new Error(`Unknown system: ${systemName}`);
            }

            // Register WebGL contexts with CanvasManager for cleanup
            canvasIds.forEach(canvasId => {
                const canvas = document.getElementById(canvasId);
                if (canvas) {
                    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
                    if (gl) {
                        this.canvasManager.registerContext(canvasId, gl);
                    }
                }
            });

            // Apply current parameters
            system.updateParameters(this.parameters.getAllParameters());
            system.setActive(true);

            console.log(`${systemName} system created and activated`);
            return system;

        } catch (error) {
            console.error(`${systemName} system creation failed:`, error);
            throw error;
        }
    }

    /**
     * Switch between visualization systems
     * DESTROYS old system and CREATES new system (proper WebGL cleanup)
     */
    async switchSystem(systemName) {
        if (!['quantum', 'faceted', 'holographic'].includes(systemName)) {
            console.error('Unknown system:', systemName);
            return false;
        }

        console.log(`Switching from ${this.currentSystemName} to ${systemName}`);

        // Destroy active system if exists
        if (this.activeSystem) {
            if (this.activeSystem.setActive) {
                this.activeSystem.setActive(false);
            }
            if (this.activeSystem.destroy) {
                this.activeSystem.destroy();
            }
            this.activeSystem = null;
        }

        // Create and initialize new system
        try {
            this.activeSystem = await this.createSystem(systemName);
            this.currentSystemName = systemName;
            console.log(`Switched to ${systemName} system`);
            return true;
        } catch (error) {
            console.error(`Failed to switch to ${systemName}:`, error);
            return false;
        }
    }

    /**
     * Get the active backend type for the current system
     * @returns {'webgl'|'webgpu'|'direct-webgl'|null}
     */
    getActiveBackendType() {
        if (this.activeSystem && this.activeSystem.getBackendType) {
            return this.activeSystem.getBackendType();
        }
        return null;
    }

    /**
     * Update parameters for active system
     */
    updateCurrentSystemParameters() {
        const params = this.parameters.getAllParameters();

        if (this.activeSystem && this.activeSystem.updateParameters) {
            this.activeSystem.updateParameters(params);
        }
    }

    /**
     * Update a single parameter
     */
    setParameter(name, value) {
        this.parameters.setParameter(name, value);
        this.reactivity.setBaseParameter(name, value);
        this.updateCurrentSystemParameters();
    }

    /**
     * Update multiple parameters
     */
    setParameters(params) {
        this.parameters.setParameters(params);
        this.reactivity.setBaseParameters(params);
        this.updateCurrentSystemParameters();
    }

    /**
     * Get current parameter value
     */
    getParameter(name) {
        return this.parameters.getParameter(name);
    }

    /**
     * Get all parameters
     */
    getAllParameters() {
        return this.parameters.getAllParameters();
    }

    /**
     * Randomize all parameters
     */
    randomizeAll() {
        this.parameters.randomizeAll();
        this.updateCurrentSystemParameters();
    }

    /**
     * Reset to defaults
     */
    resetAll() {
        this.parameters.resetToDefaults();
        this.updateCurrentSystemParameters();
    }

    /**
     * Get current system name
     */
    getCurrentSystem() {
        return this.currentSystemName;
    }

    /**
     * Get active system instance
     */
    getActiveSystemInstance() {
        return this.activeSystem;
    }

    // ========================================================================
    // Reactivity
    // ========================================================================

    /**
     * Get the ReactivityManager instance
     * @returns {ReactivityManager}
     */
    getReactivityManager() {
        return this.reactivity;
    }

    /**
     * Load a reactivity configuration
     * @param {object|ReactivityConfig} config
     * @returns {{ valid: boolean, errors: string[] }}
     */
    loadReactivityConfig(config) {
        return this.reactivity.loadConfig(config);
    }

    /**
     * Get current reactivity configuration
     * @returns {object}
     */
    getReactivityConfig() {
        return this.reactivity.getConfig();
    }

    /**
     * Start reactivity processing (audio/tilt/interaction)
     */
    startReactivity() {
        this.reactivity.setBaseParameters(this.parameters.getAllParameters());
        this.reactivity.start();
    }

    /**
     * Stop reactivity processing
     */
    stopReactivity() {
        this.reactivity.stop();
    }

    /**
     * Check if reactivity is active
     * @returns {boolean}
     */
    isReactivityActive() {
        return this.reactivity.isActive;
    }

    /**
     * Feed audio data into the reactivity system
     * @param {number} bass - Bass level 0-1
     * @param {number} mid - Mid level 0-1
     * @param {number} high - High level 0-1
     * @param {number} [energy] - Overall energy (computed if omitted)
     */
    setAudioInput(bass, mid, high, energy) {
        this.reactivity.setAudioInput(bass, mid, high, energy);
    }

    /**
     * Feed device tilt data into the reactivity system
     * @param {number} alpha - Z-axis rotation (0-360)
     * @param {number} beta - X-axis rotation (-180 to 180)
     * @param {number} gamma - Y-axis rotation (-90 to 90)
     */
    setTiltInput(alpha, beta, gamma) {
        this.reactivity.setTiltInput(alpha, beta, gamma);
    }

    /**
     * Feed mouse position into the reactivity system
     * @param {number} x - Normalized X (0-1)
     * @param {number} y - Normalized Y (0-1)
     * @param {number} [velocityX=0]
     * @param {number} [velocityY=0]
     */
    setMouseInput(x, y, velocityX = 0, velocityY = 0) {
        this.reactivity.setMouseInput(x, y, velocityX, velocityY);
    }

    /**
     * Trigger a click event in the reactivity system
     * @param {number} [intensity=1.0]
     */
    triggerClick(intensity = 1.0) {
        this.reactivity.triggerClick(intensity);
    }

    /**
     * Feed scroll delta into the reactivity system
     * @param {number} delta
     */
    setScrollDelta(delta) {
        this.reactivity.setScrollDelta(delta);
    }

    /**
     * Feed touch data into the reactivity system
     * @param {Touch[]} touches
     * @param {number} [pinchScale=1]
     * @param {number} [rotation=0]
     */
    setTouchInput(touches, pinchScale = 1, rotation = 0) {
        this.reactivity.setTouchInput(touches, pinchScale, rotation);
    }

    // ========================================================================
    // Spatial Input System
    // ========================================================================

    /**
     * Get the SpatialInputSystem instance
     * @returns {SpatialInputSystem}
     */
    getSpatialInputSystem() {
        return this.spatialInput;
    }

    /**
     * Enable spatial input with a named profile
     * @param {string} [profile='cardTilt'] - Profile name
     * @returns {boolean}
     */
    enableSpatialInput(profile = 'cardTilt') {
        this.spatialInput.loadProfile(profile);
        this.spatialInput.enable();
        return true;
    }

    /**
     * Disable spatial input
     */
    disableSpatialInput() {
        this.spatialInput.disable();
    }

    /**
     * Switch spatial input profile
     * @param {string} profile - Profile name
     */
    setSpatialProfile(profile) {
        this.spatialInput.loadProfile(profile);
    }

    /**
     * Feed external spatial data (for programmatic/API use)
     * @param {object} data - Spatial state data {pitch, yaw, roll, x, y, z}
     */
    feedSpatialInput(data) {
        this.spatialInput.feedInput('programmatic', data);
    }

    /**
     * Set spatial input sensitivity
     * @param {number} value - 0.1 to 5.0
     */
    setSpatialSensitivity(value) {
        this.spatialInput.setSensitivity(value);
    }

    /**
     * Toggle dramatic spatial mode (8x amplification)
     * @param {boolean} enabled
     */
    setSpatialDramaticMode(enabled) {
        this.spatialInput.setDramaticMode(enabled);
    }

    // ========================================================================
    // Geometry
    // ========================================================================

    /**
     * Get geometry names for current system
     */
    getGeometryNames() {
        return [
            // Base geometries (0-7)
            'Tetrahedron',
            'Hypercube',
            'Sphere',
            'Torus',
            'Klein Bottle',
            'Fractal',
            'Wave',
            'Crystal',
            // Hypersphere Core (8-15)
            'Hypersphere Core (Tetrahedron)',
            'Hypersphere Core (Hypercube)',
            'Hypersphere Core (Sphere)',
            'Hypersphere Core (Torus)',
            'Hypersphere Core (Klein)',
            'Hypersphere Core (Fractal)',
            'Hypersphere Core (Wave)',
            'Hypersphere Core (Crystal)',
            // Hypertetrahedron Core (16-23)
            'Hypertetrahedron Core (Tetrahedron)',
            'Hypertetrahedron Core (Hypercube)',
            'Hypertetrahedron Core (Sphere)',
            'Hypertetrahedron Core (Torus)',
            'Hypertetrahedron Core (Klein)',
            'Hypertetrahedron Core (Fractal)',
            'Hypertetrahedron Core (Wave)',
            'Hypertetrahedron Core (Crystal)'
        ];
    }

    /**
     * Export current state
     */
    exportState() {
        return {
            system: this.currentSystemName,
            parameters: this.parameters.getAllParameters(),
            reactivity: this.reactivity.getConfig(),
            reactivityActive: this.reactivity.isActive,
            spatialInput: this.spatialInput.exportConfig(),
            spatialActive: this.spatialInput.enabled,
            backend: this.getActiveBackendType(),
            timestamp: new Date().toISOString(),
            version: '1.2.0'
        };
    }

    /**
     * Import state
     */
    async importState(state) {
        if (!state || typeof state !== 'object') {
            console.warn('VIB3Engine: importState received invalid state');
            return;
        }

        // Size guard: reject excessively large state objects (> 256 KB serialized)
        try {
            const serialized = JSON.stringify(state);
            if (serialized.length > 256 * 1024) {
                console.warn('VIB3Engine: importState rejected — state exceeds 256 KB');
                return;
            }
        } catch {
            console.warn('VIB3Engine: importState received non-serializable state');
            return;
        }

        // Depth guard: reject deeply nested objects (max depth 6)
        const maxDepth = (obj, depth = 0) => {
            if (depth > 6) return depth;
            if (!obj || typeof obj !== 'object') return depth;
            let max = depth;
            for (const v of Object.values(obj)) {
                max = Math.max(max, maxDepth(v, depth + 1));
                if (max > 6) return max;
            }
            return max;
        };
        if (maxDepth(state) > 6) {
            console.warn('VIB3Engine: importState rejected — state nesting exceeds depth 6');
            return;
        }

        if (state.system && typeof state.system === 'string') {
            await this.switchSystem(state.system);
        }
        if (state.parameters && typeof state.parameters === 'object' && !Array.isArray(state.parameters)) {
            // Only allow known parameter keys through
            const safeParams = {};
            for (const [key, value] of Object.entries(state.parameters)) {
                if (typeof value === 'number' && Number.isFinite(value)) {
                    safeParams[key] = value;
                }
            }
            this.parameters.setParameters(safeParams);
            this.reactivity.setBaseParameters(safeParams);
            this.updateCurrentSystemParameters();
        }
        if (state.reactivity && typeof state.reactivity === 'object' && !Array.isArray(state.reactivity)) {
            this.reactivity.loadConfig(state.reactivity);
        }
        if (state.reactivityActive) {
            this.startReactivity();
        }
        if (state.spatialInput && typeof state.spatialInput === 'object') {
            this.spatialInput.importConfig(state.spatialInput);
        }
        if (state.spatialActive) {
            this.spatialInput.enable();
        }
    }

    /**
     * Destroy engine and clean up
     */
    destroy() {
        // Stop and destroy spatial input
        if (this.spatialInput) {
            this.spatialInput.destroy();
        }

        // Stop and destroy reactivity
        if (this.reactivity) {
            this.reactivity.destroy();
        }

        // Destroy active system
        if (this.activeSystem && this.activeSystem.destroy) {
            this.activeSystem.destroy();
        }
        this.activeSystem = null;

        // Destroy canvas manager
        if (this.canvasManager) {
            this.canvasManager.destroy();
        }
        this.canvasManager = null;

        this.initialized = false;
        console.log('VIB3+ Engine destroyed');
    }
}
