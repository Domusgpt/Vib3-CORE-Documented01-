/**
 * Reactivity Module TypeScript Definitions
 * VIB3+ SDK - Audio/Tilt/Interaction Reactivity System
 */

// ============================================================================
// Constants
// ============================================================================

/** Valid parameter names that can be targeted by reactivity */
export declare const TARGETABLE_PARAMETERS: readonly [
    'rot4dXY', 'rot4dXZ', 'rot4dYZ',
    'rot4dXW', 'rot4dYW', 'rot4dZW',
    'gridDensity', 'morphFactor', 'chaos', 'speed',
    'hue', 'intensity', 'saturation', 'dimension',
    'geometry'
];

/** Targetable parameter name type */
export type TargetableParameter = typeof TARGETABLE_PARAMETERS[number];

/** Audio band names */
export declare const AUDIO_BANDS: readonly ['bass', 'mid', 'high'];
export type AudioBand = typeof AUDIO_BANDS[number];

/** Reactivity blend modes */
export declare const BLEND_MODES: readonly ['add', 'multiply', 'replace', 'max', 'min'];
export type BlendMode = typeof BLEND_MODES[number];

/** Interaction modes for different input types */
export declare const INTERACTION_MODES: {
    readonly mouse: readonly ['rotation', 'velocity', 'shimmer', 'attract', 'repel', 'none'];
    readonly click: readonly ['burst', 'blast', 'ripple', 'pulse', 'none'];
    readonly scroll: readonly ['cycle', 'wave', 'sweep', 'zoom', 'morph', 'none'];
};

export type MouseMode = typeof INTERACTION_MODES.mouse[number];
export type ClickMode = typeof INTERACTION_MODES.click[number];
export type ScrollMode = typeof INTERACTION_MODES.scroll[number];

// ============================================================================
// Config Interfaces
// ============================================================================

/** Audio band target mapping */
export interface AudioTarget {
    param: TargetableParameter;
    weight: number;
    mode: BlendMode;
}

/** Audio band configuration */
export interface AudioBandConfig {
    enabled: boolean;
    sensitivity: number;
    frequencyRange: [number, number];
    targets: AudioTarget[];
}

/** Audio reactivity configuration */
export interface AudioConfig {
    enabled: boolean;
    globalSensitivity: number;
    smoothing: number;
    bands: {
        bass: AudioBandConfig;
        mid: AudioBandConfig;
        high: AudioBandConfig;
    };
}

/** Tilt axis mapping */
export interface TiltAxisMapping {
    target: TargetableParameter;
    scale: number;
    clamp: [number, number];
}

/** Tilt reactivity configuration */
export interface TiltConfig {
    enabled: boolean;
    sensitivity: number;
    smoothing: number;
    dramaticMode: boolean;
    calibrated: boolean;
    calibrationOffset: { alpha: number; beta: number; gamma: number };
    mappings: {
        alpha: TiltAxisMapping;
        beta: TiltAxisMapping;
        gamma: TiltAxisMapping;
    };
    dramaticMappings: {
        alpha: TiltAxisMapping;
        beta: TiltAxisMapping;
        gamma: TiltAxisMapping;
    };
}

/** Mouse interaction configuration */
export interface MouseInteractionConfig {
    enabled: boolean;
    mode: MouseMode;
    sensitivity: number;
    smoothing: number;
    targets: TargetableParameter[];
    invertX: boolean;
    invertY: boolean;
}

/** Click interaction configuration */
export interface ClickInteractionConfig {
    enabled: boolean;
    mode: ClickMode;
    intensity: number;
    decay: number;
    target: TargetableParameter;
    maxValue: number;
}

/** Scroll interaction configuration */
export interface ScrollInteractionConfig {
    enabled: boolean;
    mode: ScrollMode;
    sensitivity: number;
    target: TargetableParameter;
    wrap: boolean;
    step: number;
}

/** Touch interaction configuration */
export interface TouchInteractionConfig {
    enabled: boolean;
    multiTouchEnabled: boolean;
    pinchZoom: {
        enabled: boolean;
        target: TargetableParameter;
        sensitivity: number;
    };
    twoFingerRotate: {
        enabled: boolean;
        target: TargetableParameter;
        sensitivity: number;
    };
    swipeGestures: boolean;
}

/** Interaction reactivity configuration */
export interface InteractionConfig {
    enabled: boolean;
    mouse: MouseInteractionConfig;
    click: ClickInteractionConfig;
    scroll: ScrollInteractionConfig;
    touch: TouchInteractionConfig;
}

/** Complete reactivity configuration object */
export interface ReactivityConfigData {
    version: string;
    audio: AudioConfig;
    tilt: TiltConfig;
    interaction: InteractionConfig;
}

/** Default reactivity configuration */
export declare const DEFAULT_REACTIVITY_CONFIG: ReactivityConfigData;

/** Validation result from config validation */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

// ============================================================================
// ReactivityConfig
// ============================================================================

/**
 * ReactivityConfig class
 * Manages, validates, and serializes reactivity configuration.
 * Exported with VIB3Package for portable behavior.
 */
export declare class ReactivityConfig {
    constructor(config?: Partial<ReactivityConfigData> | null);

    /** Get full config (deep copy) */
    getConfig(): ReactivityConfigData;

    /** Get audio config (deep copy) */
    getAudioConfig(): AudioConfig;

    /** Get tilt config (deep copy) */
    getTiltConfig(): TiltConfig;

    /** Get interaction config (deep copy) */
    getInteractionConfig(): InteractionConfig;

    /** Merge partial config into current config */
    merge(partialConfig: Partial<ReactivityConfigData>): this;

    /** Validate the configuration */
    validate(): ValidationResult;

    /** Enable/disable audio reactivity */
    setAudioEnabled(enabled: boolean): this;

    /** Set audio band configuration */
    setAudioBand(band: AudioBand, config: Partial<AudioBandConfig>): this;

    /** Add a target to an audio band */
    addAudioTarget(
        band: AudioBand,
        param: TargetableParameter,
        weight?: number,
        mode?: BlendMode
    ): this;

    /** Clear all targets from an audio band */
    clearAudioTargets(band: AudioBand): this;

    /** Enable/disable tilt reactivity */
    setTiltEnabled(enabled: boolean): this;

    /** Set tilt dramatic mode */
    setTiltDramaticMode(enabled: boolean): this;

    /** Set tilt sensitivity (0.1-10) */
    setTiltSensitivity(sensitivity: number): this;

    /** Set tilt axis mapping */
    setTiltMapping(
        axis: 'alpha' | 'beta' | 'gamma',
        target: TargetableParameter,
        scale: number,
        clamp?: [number, number]
    ): this;

    /** Enable/disable interaction */
    setInteractionEnabled(enabled: boolean): this;

    /** Set mouse interaction mode */
    setMouseMode(mode: MouseMode, options?: Partial<MouseInteractionConfig>): this;

    /** Set click interaction mode */
    setClickMode(mode: ClickMode, options?: Partial<ClickInteractionConfig>): this;

    /** Set scroll interaction mode */
    setScrollMode(mode: ScrollMode, options?: Partial<ScrollInteractionConfig>): this;

    /** Export to JSON string */
    toJSON(): string;

    /** Import from JSON string or object */
    static fromJSON(json: string | ReactivityConfigData): ReactivityConfig;

    /** Export minimal config (only non-default values) */
    toMinimalJSON(): string;

    /** Create a copy */
    clone(): ReactivityConfig;

    /** Reset to defaults */
    reset(): this;
}

// ============================================================================
// ReactivityManager
// ============================================================================

/** Audio input state */
export interface AudioInputState {
    bass: number;
    mid: number;
    high: number;
    energy: number;
}

/** Tilt input state */
export interface TiltInputState {
    alpha: number;
    beta: number;
    gamma: number;
}

/** Mouse input state */
export interface MouseInputState {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
}

/** Click input state */
export interface ClickInputState {
    intensity: number;
    lastTime: number;
}

/** Scroll input state */
export interface ScrollInputState {
    delta: number;
    accumulated: number;
}

/** Touch input state */
export interface TouchInputState {
    touches: Touch[];
    pinchScale: number;
    rotation: number;
}

/** Complete input state */
export interface InputState {
    audio: AudioInputState;
    tilt: TiltInputState;
    mouse: MouseInputState;
    click: ClickInputState;
    scroll: ScrollInputState;
    touch: TouchInputState;
}

/** Parameter update callback function */
export type ParameterUpdateFn = (name: string, value: number) => void;

/** ReactivityManager event names */
export type ReactivityEvent = 'configChanged' | 'started' | 'stopped';

/**
 * ReactivityManager - Coordinates all reactivity systems.
 *
 * Central hub that:
 * 1. Receives input from audio, tilt, and interaction sources
 * 2. Applies configured mappings from ReactivityConfig
 * 3. Updates visualization parameters through the parameter system
 */
export declare class ReactivityManager {
    /** Whether reactivity processing is active */
    readonly isActive: boolean;

    /** Current input state */
    readonly inputState: InputState;

    /** Base parameter values (before reactivity applied) */
    readonly baseParameters: Record<string, number>;

    constructor(parameterUpdateFn?: ParameterUpdateFn | null);

    /** Set the parameter update function */
    setParameterUpdateFunction(fn: ParameterUpdateFn): void;

    /** Load a ReactivityConfig */
    loadConfig(config: ReactivityConfig | Partial<ReactivityConfigData>): ValidationResult;

    /** Get current config (deep copy) */
    getConfig(): ReactivityConfigData;

    /** Start the reactivity processing loop */
    start(): void;

    /** Stop the reactivity processing loop */
    stop(): void;

    /** Update audio input values */
    setAudioInput(bass: number, mid: number, high: number, energy?: number | null): void;

    /** Update tilt input values */
    setTiltInput(alpha: number, beta: number, gamma: number): void;

    /** Update mouse input values */
    setMouseInput(x: number, y: number, velocityX?: number, velocityY?: number): void;

    /** Trigger a click event */
    triggerClick(intensity?: number): void;

    /** Update scroll delta */
    setScrollDelta(delta: number): void;

    /** Update touch input */
    setTouchInput(touches: Touch[], pinchScale?: number, rotation?: number): void;

    /** Set base parameter value (before reactivity) */
    setBaseParameter(param: string, value: number): void;

    /** Set all base parameters */
    setBaseParameters(params: Record<string, number>): void;

    /** Add event listener */
    on(event: ReactivityEvent, callback: (data?: any) => void): void;

    /** Remove event listener */
    off(event: ReactivityEvent, callback: (data?: any) => void): void;

    /** Destroy and cleanup */
    destroy(): void;
}
