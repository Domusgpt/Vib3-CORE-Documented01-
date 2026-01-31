/**
 * @vib3/sdk — Adaptive SDK TypeScript Definitions
 * VIB3+ 4D Visualization Engine v2.0.0
 *
 * Barrel re-export for all typed modules.
 *
 * Currently typed modules:
 *   - core/VIB3Engine (engine, systems, parameters, state)
 *   - reactivity (ReactivityManager, ReactivityConfig, all input types)
 *   - render (WebGL/WebGPU backends, ShaderProgram, RenderState, CommandBuffer, etc.)
 *
 * TODO: Add types for v2.0.0 modules:
 *   - creative/* (ColorPresetsSystem, TransitionAnimator, PostProcessingPipeline, ParameterTimeline)
 *   - integrations/* (Vib3React, Vib3Vue, Vib3Svelte, FigmaPlugin, ThreeJsPackage, TouchDesignerExport, OBSMode)
 *   - advanced/* (WebXRRenderer, WebGPUCompute, MIDIController, AIPresetGenerator, OffscreenWorker)
 *   - reactivity/SpatialInputSystem
 *   - agent/mcp (MCPServer, tools)
 */

// Core engine
export {
    VIB3Engine,
    VIB3EngineOptions,
    VIB3EngineState,
    SystemName,
    BackendType,
    GeometryNames
} from './core/VIB3Engine';

// Reactivity system
export {
    ReactivityManager,
    ReactivityConfig,
    ReactivityConfigData,
    ReactivityEvent,
    ValidationResult,
    AudioConfig,
    AudioBandConfig,
    AudioTarget,
    AudioBand,
    TiltConfig,
    TiltAxisMapping,
    InteractionConfig,
    MouseInteractionConfig,
    ClickInteractionConfig,
    ScrollInteractionConfig,
    TouchInteractionConfig,
    MouseMode,
    ClickMode,
    ScrollMode,
    BlendMode,
    TargetableParameter,
    ParameterUpdateFn,
    InputState,
    AudioInputState,
    TiltInputState,
    MouseInputState,
    ClickInputState,
    ScrollInputState,
    TouchInputState,
    TARGETABLE_PARAMETERS,
    AUDIO_BANDS,
    BLEND_MODES,
    INTERACTION_MODES,
    DEFAULT_REACTIVITY_CONFIG
} from './reactivity/index';

// Render system
export {
    RenderContext,
    RenderContextOptions,
    AsyncRenderContextOptions,
    createRenderContext,
    createRenderContextAsync,
    RenderPresets,
    Shader4D,
    Shader4DOptions
} from './render/index';
