/**
 * Advanced Module TypeScript Definitions
 * VIB3+ SDK - WebXR, WebGPU Compute, MIDI, AI Presets, Offscreen Worker
 */

export {
    WebXRRenderer,
    XRMode,
    XRSupportResult,
    SixDOFPose,
    TrackingMapping,
    XRFrameCallback,
    WebXREvent
} from './WebXRRenderer';

export {
    WebGPUCompute,
    ParticleParams
} from './WebGPUCompute';

export {
    MIDIController,
    CCMapping,
    CCMappingOptions,
    NoteMapping,
    MIDIInputInfo,
    MIDIMappingState,
    LearnCallback
} from './MIDIController';

export {
    AIPresetGenerator,
    VIB3Preset,
    ParamRange,
    ThemeName
} from './AIPresetGenerator';

export {
    OffscreenCanvasManager,
    WorkerMessage,
    WorkerMessageType,
    WorkerInitMessage,
    WorkerParamsMessage,
    WorkerSwitchMessage,
    WorkerResizeMessage
} from './OffscreenWorker';
