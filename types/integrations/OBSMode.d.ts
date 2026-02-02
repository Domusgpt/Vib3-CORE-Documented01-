/**
 * OBSMode TypeScript Definitions
 * VIB3+ SDK - OBS Browser Source Integration
 */

/** OBS capture mode */
export type CaptureMode = 'browser-source' | 'window-capture';

/** OBS mode constructor options */
export interface OBSModeOptions {
    captureMode?: CaptureMode;
    hideUI?: boolean;
    autoResize?: boolean;
}

/** OBS browser source config */
export interface OBSBrowserSourceConfig {
    url: string;
    width: number;
    height: number;
    fps: number;
    custom_css?: string;
    [key: string]: any;
}

/** Recommended OBS settings */
export interface OBSRecommendedSettings {
    browserSource: Record<string, any>;
    windowCapture: Record<string, any>;
    [key: string]: any;
}

/**
 * OBS integration mode with transparent background support.
 * Enables VIB3+ as a browser source overlay in OBS.
 */
export declare class Vib3OBSMode {
    readonly transparentMode: boolean;
    readonly captureMode: CaptureMode;
    readonly hideUI: boolean;
    readonly autoResize: boolean;

    constructor(engine: any, options?: OBSModeOptions);

    /** Generate a browser source URL with embedded parameters */
    static generateBrowserSourceURL(params?: Record<string, any>): string;

    /** Generate an OBS launch command */
    static generateLaunchCommand(params?: Record<string, any>): string;

    /** Enable OBS mode (transparent bg, hide UI) */
    enable(): boolean;

    /** Disable OBS mode */
    disable(): boolean;

    /** Check if transparent mode is active */
    isTransparent(): boolean;

    /** Hide all non-canvas UI elements */
    hideUIElements(): void;

    /** Show all UI elements */
    showUIElements(): void;

    /** Generate OBS browser source JSON config */
    configureBrowserSource(options?: Record<string, any>): OBSBrowserSourceConfig;

    /** Get recommended OBS settings documentation */
    getRecommendedSettings(): OBSRecommendedSettings;

    /** Dispose and restore original state */
    dispose(): void;
}
