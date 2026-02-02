/**
 * ColorPresetsSystem TypeScript Definitions
 * VIB3+ SDK - Themed Color Presets
 */

import { ParameterUpdateFn } from '../reactivity/index';

/** Color preset configuration */
export interface ColorPresetConfig {
    hue: number;
    saturation?: number;
    intensity?: number;
    speed?: number;
    chaos?: number;
    morphFactor?: number;
    gridDensity?: number;
    dimension?: number;
}

/** Preset info with metadata */
export interface PresetInfo {
    name: string;
    config: ColorPresetConfig;
    isCustom: boolean;
}

/** Presets grouped by category */
export type PresetsByCategory = Record<string, PresetInfo[]>;

/** Built-in preset names */
export type BuiltinPresetName =
    | 'Ocean' | 'Lava' | 'Neon' | 'Monochrome' | 'Sunset'
    | 'Aurora' | 'Forest' | 'Candy' | 'Midnight' | 'Coral'
    | 'Arctic' | 'Desert' | 'Toxic' | 'Rose' | 'Storm'
    | 'Ember' | 'Frost' | 'Jungle' | 'Lavender' | 'Chrome'
    | 'Hologram' | 'Blood';

/**
 * 22 themed color presets with group parameter application.
 * Supports custom presets, transitions, and import/export.
 */
export declare class ColorPresetsSystem {
    readonly currentPreset: string | null;

    constructor(parameterUpdateFn: ParameterUpdateFn);

    /** Get all presets (built-in and custom) */
    getPresets(): PresetInfo[];

    /** Get presets grouped by category */
    getPresetsByCategory(): PresetsByCategory;

    /** Get a specific preset config */
    getPreset(name: string): ColorPresetConfig | null;

    /** Get the currently applied preset name */
    getCurrentPreset(): string | null;

    /** Whether a transition is currently active */
    isTransitioning(): boolean;

    /** Apply a preset by name, optionally with smooth transition */
    applyPreset(name: string, transition?: boolean, duration?: number, onComplete?: () => void): boolean;

    /** Apply a raw config, optionally with smooth transition */
    applyConfig(config: ColorPresetConfig, transition?: boolean, duration?: number): void;

    /** Create a custom preset */
    createCustomPreset(name: string, config: ColorPresetConfig): boolean;

    /** Update an existing custom preset */
    updateCustomPreset(name: string, config: ColorPresetConfig): boolean;

    /** Delete a custom preset */
    deleteCustomPreset(name: string): boolean;

    /** Export a preset (or current) as a serializable object */
    exportPreset(name?: string): Record<string, any> | null;

    /** Export all custom presets */
    exportAllCustomPresets(): Record<string, any>;

    /** Import a preset from serialized data */
    importPreset(data: Record<string, any>): boolean;

    /** Cancel an active transition */
    cancelTransition(): void;

    /** Dispose and clean up */
    dispose(): void;
}
