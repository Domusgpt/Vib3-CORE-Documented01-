/**
 * @vib3code/sdk — Adaptive SDK TypeScript Definitions
 * VIB3+ 4D Visualization Engine v2.0.0
 *
 * Barrel re-export for all typed modules.
 *
 * Typed modules:
 *   - core/VIB3Engine (engine, systems, parameters, state)
 *   - core/ErrorReporter (opt-in error capture)
 *   - reactivity (ReactivityManager, ReactivityConfig, all input types)
 *   - reactivity/SpatialInputSystem (universal spatial input)
 *   - render (WebGL/WebGPU backends, ShaderProgram, RenderState, CommandBuffer)
 *   - creative (ColorPresets, TransitionAnimator, PostProcessing, Timeline)
 *   - integrations (React, Vue, Svelte, Figma, Three.js, TouchDesigner, OBS)
 *   - advanced (WebXR, WebGPU Compute, MIDI, AI Presets, OffscreenWorker)
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

// Core - Error Reporter
export {
    ErrorReporter,
    ErrorReporterOptions,
    ErrorReport
} from './core/ErrorReporter';

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

// Spatial Input System
export {
    SpatialInputSystem,
    createSpatialInputSystem,
    SpatialInputOptions,
    SpatialState,
    SpatialAxis,
    SourceType,
    SourceInfo,
    MappingEntry,
    ProfileDef,
    BuiltinProfile,
    SpatialEvent,
    SOURCE_TYPES,
    SPATIAL_AXES
} from './reactivity/SpatialInputSystem';

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

// Creative tooling
export {
    ColorPresetsSystem,
    ColorPresetConfig,
    PresetInfo,
    PresetsByCategory,
    BuiltinPresetName,
    TransitionAnimator,
    EasingName,
    SequenceStep,
    PostProcessingPipeline,
    BuiltinEffectName,
    PresetChainName,
    EffectParamDef,
    EffectDetail,
    PresetChainInfo,
    PipelineState,
    ParameterTimeline,
    LoopMode,
    Keyframe,
    TimelineState
} from './creative/index';

// Platform integrations
export {
    Vib3ReactWrapper,
    Vib3CanvasProps,
    UseVib3Return,
    GeneratedPackage,
    Vib3VueWrapper,
    Vib3VueProps,
    UseVib3ComposableReturn,
    Vib3SvelteWrapper,
    Vib3SvelteProps,
    Vib3Store,
    Vib3StoreValue,
    Vib3FigmaPlugin,
    FigmaManifest,
    FigmaManifestOptions,
    FigmaCodeOptions,
    Vib3ThreeJsPackage,
    ShaderMaterialConfig,
    ShaderMaterialOptions,
    UniformValue,
    Vib3TouchDesignerExport,
    GLSLTOPOptions,
    TDUniformMapping,
    Vib3OBSMode,
    CaptureMode,
    OBSModeOptions,
    OBSBrowserSourceConfig,
    OBSRecommendedSettings
} from './integrations/index';

// Advanced features
export {
    WebXRRenderer,
    XRMode,
    XRSupportResult,
    SixDOFPose,
    TrackingMapping,
    XRFrameCallback,
    WebXREvent,
    WebGPUCompute,
    ParticleParams,
    MIDIController,
    CCMapping,
    CCMappingOptions,
    NoteMapping,
    MIDIInputInfo,
    MIDIMappingState,
    LearnCallback,
    AIPresetGenerator,
    VIB3Preset,
    ParamRange,
    ThemeName,
    OffscreenCanvasManager,
    WorkerMessage,
    WorkerMessageType,
    WorkerInitMessage,
    WorkerParamsMessage,
    WorkerSwitchMessage,
    WorkerResizeMessage
} from './advanced/index';
