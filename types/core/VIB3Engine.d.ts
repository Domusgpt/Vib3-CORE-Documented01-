/**
 * VIB3Engine TypeScript Definitions
 * VIB3+ SDK - Unified Visualization Engine
 */

import { ReactivityManager, ReactivityConfigData, ValidationResult } from '../reactivity';
import { ReactivityConfig } from '../reactivity';

/** Visualization system name */
export type SystemName = 'quantum' | 'faceted' | 'holographic';

/** Backend type for the active system */
export type BackendType = 'webgl' | 'webgpu' | 'direct-webgl' | null;

/** VIB3Engine constructor options */
export interface VIB3EngineOptions {
    /** Try WebGPU for systems that support it (default: false) */
    preferWebGPU?: boolean;
    /** Enable debug logging (default: false) */
    debug?: boolean;
    /** Initial reactivity configuration */
    reactivityConfig?: Partial<ReactivityConfigData> | ReactivityConfig;
}

/** Exported engine state */
export interface VIB3EngineState {
    system: SystemName;
    parameters: Record<string, number>;
    reactivity: ReactivityConfigData;
    reactivityActive: boolean;
    backend: BackendType;
    timestamp: string;
    version: string;
}

/** Geometry names array (24 entries) */
export type GeometryNames = string[];

/**
 * VIB3+ Engine - Unified Visualization System
 *
 * Coordinates Quantum, Faceted, and Holographic systems.
 * Supports 24 geometries per system with full 6D rotation.
 * Backend selection: Faceted supports WebGL/WebGPU via UnifiedRenderBridge.
 * Quantum and Holographic use direct WebGL (5-layer canvas architecture).
 */
export declare class VIB3Engine {
    /** Whether to prefer WebGPU for systems that support it */
    readonly preferWebGPU: boolean;

    /** Debug mode */
    readonly debug: boolean;

    /** Whether the engine is initialized */
    readonly initialized: boolean;

    /** Current system name */
    readonly currentSystemName: SystemName;

    constructor(options?: VIB3EngineOptions);

    // ========================================================================
    // Initialization & System Management
    // ========================================================================

    /**
     * Initialize the VIB3+ engine.
     * @param containerId - DOM container element ID (default: 'vib3-container')
     * @returns Whether initialization succeeded
     */
    initialize(containerId?: string): Promise<boolean>;

    /**
     * Switch between visualization systems.
     * Destroys the old system and creates the new one (proper WebGL cleanup).
     */
    switchSystem(systemName: SystemName): Promise<boolean>;

    /** Get the active backend type for the current system */
    getActiveBackendType(): BackendType;

    /** Get current system name */
    getCurrentSystem(): SystemName;

    /** Get active system instance */
    getActiveSystemInstance(): any;

    // ========================================================================
    // Parameters
    // ========================================================================

    /** Update a single parameter */
    setParameter(name: string, value: number): void;

    /** Update multiple parameters */
    setParameters(params: Record<string, number>): void;

    /** Get current parameter value */
    getParameter(name: string): number;

    /** Get all parameters */
    getAllParameters(): Record<string, number>;

    /** Randomize all parameters */
    randomizeAll(): void;

    /** Reset to defaults */
    resetAll(): void;

    // ========================================================================
    // Reactivity
    // ========================================================================

    /** Get the ReactivityManager instance */
    getReactivityManager(): ReactivityManager;

    /** Load a reactivity configuration */
    loadReactivityConfig(config: Partial<ReactivityConfigData> | ReactivityConfig): ValidationResult;

    /** Get current reactivity configuration */
    getReactivityConfig(): ReactivityConfigData;

    /** Start reactivity processing (audio/tilt/interaction) */
    startReactivity(): void;

    /** Stop reactivity processing */
    stopReactivity(): void;

    /** Check if reactivity is active */
    isReactivityActive(): boolean;

    /**
     * Feed audio data into the reactivity system
     * @param bass - Bass level 0-1
     * @param mid - Mid level 0-1
     * @param high - High level 0-1
     * @param energy - Overall energy (computed if omitted)
     */
    setAudioInput(bass: number, mid: number, high: number, energy?: number): void;

    /**
     * Feed device tilt data into the reactivity system
     * @param alpha - Z-axis rotation (0-360)
     * @param beta - X-axis rotation (-180 to 180)
     * @param gamma - Y-axis rotation (-90 to 90)
     */
    setTiltInput(alpha: number, beta: number, gamma: number): void;

    /**
     * Feed mouse position into the reactivity system
     * @param x - Normalized X (0-1)
     * @param y - Normalized Y (0-1)
     * @param velocityX - Horizontal velocity
     * @param velocityY - Vertical velocity
     */
    setMouseInput(x: number, y: number, velocityX?: number, velocityY?: number): void;

    /**
     * Trigger a click event in the reactivity system
     * @param intensity - Click intensity (default: 1.0)
     */
    triggerClick(intensity?: number): void;

    /**
     * Feed scroll delta into the reactivity system
     * @param delta - Scroll delta value
     */
    setScrollDelta(delta: number): void;

    /**
     * Feed touch data into the reactivity system
     * @param touches - Active touch points
     * @param pinchScale - Pinch zoom scale (default: 1)
     * @param rotation - Two-finger rotation (default: 0)
     */
    setTouchInput(touches: Touch[], pinchScale?: number, rotation?: number): void;

    // ========================================================================
    // Geometry
    // ========================================================================

    /**
     * Get geometry names for current system (24 entries).
     * Index encoding: core_type * 8 + base_geometry
     */
    getGeometryNames(): GeometryNames;

    // ========================================================================
    // State Management
    // ========================================================================

    /** Export current engine state */
    exportState(): VIB3EngineState;

    /** Import engine state (restores system, parameters, and reactivity) */
    importState(state: Partial<VIB3EngineState>): Promise<void>;

    // ========================================================================
    // Lifecycle
    // ========================================================================

    /** Destroy engine and clean up all resources */
    destroy(): void;
}
