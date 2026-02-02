/**
 * WebXRRenderer TypeScript Definitions
 * VIB3+ SDK - WebXR VR/AR Renderer with 6DOF
 */

/** XR session mode */
export type XRMode = 'immersive-vr' | 'immersive-ar' | 'inline';

/** XR support check result */
export interface XRSupportResult {
    available: boolean;
    vr: boolean;
    ar: boolean;
    inline: boolean;
}

/** 6DOF pose data extracted from XR frame */
export interface SixDOFPose {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number; w: number };
    linearVelocity?: { x: number; y: number; z: number };
    angularVelocity?: { x: number; y: number; z: number };
}

/** Tracking-to-parameter mapping */
export interface TrackingMapping {
    [trackingAxis: string]: {
        param: string;
        scale?: number;
        offset?: number;
    };
}

/** WebXR frame callback */
export type XRFrameCallback = (frame: any, pose: SixDOFPose | null) => void;

/** WebXRRenderer event names */
export type WebXREvent = 'sessionStart' | 'sessionEnd' | 'frameUpdate' | 'inputSourcesChange';

/**
 * WebXR VR/AR renderer with 6DOF spatial extraction.
 * Maps head pose to VIB3+ visualization parameters.
 */
export declare class WebXRRenderer {
    readonly isImmersive: boolean;
    readonly mode: XRMode;
    xrSession: any | null;

    constructor(engine: any);

    /** Check WebXR API support */
    checkSupport(): Promise<XRSupportResult>;

    /** Start an XR session */
    startSession(mode?: XRMode): Promise<any>;

    /** End the current XR session */
    endSession(): Promise<void>;

    /** Check if a session is active */
    isSessionActive(): boolean;

    /** Extract head pose from an XR frame */
    extractHeadPose(frame: any): SixDOFPose | null;

    /** Set how XR tracking maps to visualization parameters */
    setTrackingToParameterMapping(mapping?: TrackingMapping): void;

    /** XR frame callback (called internally each frame) */
    onXRFrame(time: number, frame: any): void;

    /** Set a custom frame callback */
    setFrameCallback(fn: XRFrameCallback): void;

    /** Dispose and end session */
    dispose(): void;
}
