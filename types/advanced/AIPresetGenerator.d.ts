/**
 * AIPresetGenerator TypeScript Definitions
 * VIB3+ SDK - Text-to-Preset via LLM + Mutation/Crossbreeding
 */

/** VIB3 preset object */
export interface VIB3Preset {
    name?: string;
    system?: string;
    geometry?: number;
    hue?: number;
    saturation?: number;
    intensity?: number;
    speed?: number;
    gridDensity?: number;
    morphFactor?: number;
    chaos?: number;
    dimension?: number;
    rot4dXY?: number;
    rot4dXZ?: number;
    rot4dYZ?: number;
    rot4dXW?: number;
    rot4dYW?: number;
    rot4dZW?: number;
    [key: string]: any;
}

/** Parameter range constraint */
export interface ParamRange {
    min: number;
    max: number;
    step?: number;
}

/** Theme names available for random generation */
export type ThemeName = string;

/**
 * AI-powered preset generator.
 * Generates presets from text descriptions, mutates existing presets,
 * and crossbreeds two presets to produce offspring.
 */
export declare class AIPresetGenerator {
    /** Parameter range constraints */
    static readonly PARAM_RANGES: Record<string, ParamRange>;

    /** Style vocabulary for text-to-preset mapping */
    static readonly STYLE_VOCABULARY: Record<string, Record<string, number>>;

    /** Named theme presets */
    static readonly THEMES: Record<string, VIB3Preset>;

    constructor(engine?: any);

    /** Generate a preset from a text description */
    generateFromText(description: string): Promise<VIB3Preset>;

    /** Generate a random preset, optionally within a theme */
    generateRandom(theme?: ThemeName): VIB3Preset;

    /** Mutate a preset by a given intensity (0-1) */
    mutate(preset: VIB3Preset, intensity?: number): VIB3Preset;

    /** Crossbreed two presets with an optional bias (0=all A, 1=all B) */
    crossbreed(preset1: VIB3Preset, preset2: VIB3Preset, bias?: number): VIB3Preset;

    /** Set the MCP endpoint for LLM-powered generation */
    setMCPEndpoint(endpoint: string): void;

    /** Get generation history */
    getHistory(): VIB3Preset[];

    /** Clear generation history */
    clearHistory(): void;

    /** Export a preset as a serializable object */
    exportPreset(preset: VIB3Preset): Record<string, any>;

    /** Import a preset from serialized data */
    importPreset(data: Record<string, any>): VIB3Preset | null;
}
