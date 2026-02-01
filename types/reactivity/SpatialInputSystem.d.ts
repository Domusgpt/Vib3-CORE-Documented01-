/**
 * SpatialInputSystem TypeScript Definitions
 * VIB3+ SDK - Universal Spatial Input System
 */

import { ParameterUpdateFn } from '../reactivity/index';

/** Spatial input source types */
export declare const SOURCE_TYPES: {
    readonly deviceTilt: 'deviceTilt';
    readonly mousePosition: 'mousePosition';
    readonly gyroscope: 'gyroscope';
    readonly gamepad: 'gamepad';
    readonly perspective: 'perspective';
    readonly programmatic: 'programmatic';
    readonly audio: 'audio';
    readonly midi: 'midi';
};

export type SourceType = typeof SOURCE_TYPES[keyof typeof SOURCE_TYPES];

/** Spatial axis names */
export declare const SPATIAL_AXES: readonly [
    'pitch', 'yaw', 'roll', 'x', 'y', 'z', 'intensity', 'velocity'
];

export type SpatialAxis = typeof SPATIAL_AXES[number];

/** Spatial state object */
export interface SpatialState {
    pitch: number;
    yaw: number;
    roll: number;
    x: number;
    y: number;
    z: number;
    intensity: number;
    velocity: number;
}

/** Constructor options */
export interface SpatialInputOptions {
    sensitivity?: number;
    smoothing?: number;
    onParameterUpdate?: ParameterUpdateFn;
    autoRegisterGlobals?: boolean;
}

/** Source entry info */
export interface SourceInfo {
    name: string;
    type: SourceType;
    active: boolean;
}

/** Mapping entry */
export interface MappingEntry {
    axis: string;
    target: string;
    scale?: number;
    clampRange?: [number, number];
    blendMode?: string;
}

/** Profile definition */
export interface ProfileDef {
    name: string;
    mappings: MappingEntry[];
    meta?: Record<string, any>;
}

/** Built-in profile names */
export type BuiltinProfile =
    | 'cardTilt'
    | 'wearablePerspective'
    | 'gameAsset'
    | 'vjAudioSpatial'
    | 'uiElement'
    | 'immersiveXR';

/** SpatialInputSystem event names */
export type SpatialEvent =
    | 'sourceAdded'
    | 'sourceRemoved'
    | 'mappingChanged'
    | 'mappingRemoved'
    | 'mappingsCleared'
    | 'profileLoaded'
    | 'profileCreated'
    | 'enabled'
    | 'disabled'
    | 'dramaticModeChanged'
    | 'configImported'
    | 'midiInput';

/**
 * Universal spatial input mapping system.
 * Decouples "card tilting" from physical device orientation.
 * Any input source maps to a normalized spatial state, which maps to visualization parameters.
 */
export declare class SpatialInputSystem {
    readonly sources: Map<string, any>;
    readonly mappings: Map<string, any>;
    readonly profiles: Map<string, ProfileDef>;
    sensitivity: number;
    smoothingFactor: number;
    dramaticMode: boolean;
    enabled: boolean;
    activeProfile: string | null;
    spatialState: SpatialState;
    smoothedState: SpatialState;

    constructor(options?: SpatialInputOptions);

    // Source management
    addSource(name: string, type: SourceType, config?: Record<string, any>): boolean;
    removeSource(name: string): boolean;
    hasSource(name: string): boolean;
    listSources(): SourceInfo[];

    // Mapping management
    setMapping(axis: string, target: string, scale?: number, clampRange?: [number, number], blendMode?: string): boolean;
    removeMapping(axis: string, target: string): boolean;
    clearMappings(): void;
    listMappings(): MappingEntry[];

    // Profile management
    loadProfile(name: string | BuiltinProfile): boolean;
    createProfile(name: string, mappings: MappingEntry[], meta?: Record<string, any>): boolean;
    removeProfile(name: string): boolean;
    listProfiles(): string[];
    getProfile(name: string): ProfileDef | null;

    // Custom targets
    addCustomTarget(name: string): void;
    removeCustomTarget(name: string): void;

    // Enable/disable
    enable(): void;
    disable(): void;
    isEnabled(): boolean;

    // Configuration
    setSensitivity(value: number): void;
    setSmoothing(value: number): void;
    setAxisSmoothing(axis: SpatialAxis, value: number): void;
    setDramaticMode(enabled: boolean): void;
    setParameterUpdateFn(fn: ParameterUpdateFn): void;

    // Input
    feedInput(sourceType: SourceType, data: Record<string, any>): void;

    // State
    getState(): SpatialState;
    getRawState(): SpatialState;

    // Serialization
    exportConfig(): Record<string, any>;
    importConfig(config: Record<string, any>): boolean;

    // Frame processing
    processFrame(deltaTime: number): void;

    // Events
    on(event: SpatialEvent, callback: (...args: any[]) => void): void;
    off(event: SpatialEvent, callback: (...args: any[]) => void): void;

    // Lifecycle
    destroy(): void;
}

/** Factory function */
export declare function createSpatialInputSystem(options?: SpatialInputOptions): SpatialInputSystem;
