/**
 * PostProcessingPipeline TypeScript Definitions
 * VIB3+ SDK - Composable Post-Processing Effects
 */

/** Built-in effect names */
export type BuiltinEffectName =
    | 'bloom' | 'blur' | 'hueRotate' | 'invert' | 'sharpen'
    | 'chromaticAberration' | 'filmGrain' | 'vignette' | 'scanlines'
    | 'glitch' | 'pixelate' | 'kaleidoscope' | 'mirror' | 'posterize';

/** Preset chain names */
export type PresetChainName =
    | 'Retro CRT' | 'Holographic' | 'Glitch Art' | 'Clean'
    | 'Cinematic' | 'Psychedelic' | 'Lo-Fi';

/** Effect parameter definition */
export interface EffectParamDef {
    min: number;
    max: number;
    default: number;
    step?: number;
}

/** Effect detail info */
export interface EffectDetail {
    name: string;
    enabled: boolean;
    type: string;
    params: Record<string, number>;
    paramDefs: Record<string, EffectParamDef>;
}

/** Preset chain info */
export interface PresetChainInfo {
    name: PresetChainName;
    description: string;
}

/** Serialized pipeline state */
export interface PipelineState {
    chain: string[];
    effects: Record<string, Record<string, number>>;
    enabled: boolean;
}

/**
 * 14 composable post-processing effects with 7 preset chains.
 * Effects are applied in chain order via CSS filters and canvas overlays.
 */
export declare class PostProcessingPipeline {
    readonly enabled: boolean;

    constructor(targetElement: HTMLElement);

    /** Add an effect to the chain */
    addEffect(name: BuiltinEffectName | string, params?: Record<string, number>): boolean;

    /** Remove an effect from the chain */
    removeEffect(name: string): boolean;

    /** Toggle an effect on/off */
    toggleEffect(name: string): boolean | false;

    /** Set a single parameter on an effect */
    setEffectParam(effectName: string, param: string, value: number): boolean;

    /** Set multiple parameters on an effect */
    setEffectParams(effectName: string, params: Record<string, number>): void;

    /** Reorder the effect chain */
    reorder(newOrder: string[]): void;

    /** Apply all active effects */
    apply(): void;

    /** Clear all effects */
    clear(): void;

    /** Load a preset chain by name */
    loadPresetChain(name: PresetChainName): boolean;

    /** Get all available preset chains */
    getPresetChains(): PresetChainInfo[];

    /** Get the active preset chain name, or null */
    getActivePresetChain(): string | null;

    /** Get all effects with their current state */
    getEffects(): EffectDetail[];

    /** Get the current chain order */
    getChain(): string[];

    /** Get detail for a specific effect */
    getEffect(name: string): EffectDetail | null;

    /** Export pipeline state */
    exportState(): PipelineState;

    /** Import pipeline state */
    importState(data: PipelineState): boolean;

    /** Enable/disable the entire pipeline */
    setEnabled(enabled: boolean): void;

    /** Dispose and clean up */
    dispose(): void;
}
