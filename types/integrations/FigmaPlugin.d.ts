/**
 * FigmaPlugin TypeScript Definitions
 * VIB3+ SDK - Figma Plugin Generator
 */

/** Figma plugin manifest options */
export interface FigmaManifestOptions {
    name?: string;
    id?: string;
    description?: string;
}

/** Figma plugin manifest */
export interface FigmaManifest {
    name: string;
    id: string;
    api: string;
    main: string;
    ui: string;
    editorType: string[];
    [key: string]: any;
}

/** Plugin code generation options */
export interface FigmaCodeOptions {
    uiWidth?: number;
    uiHeight?: number;
}

/**
 * Static generator for Figma plugin packages.
 * Produces manifest, plugin code, and UI HTML for a VIB3+ Figma plugin.
 */
export declare class Vib3FigmaPlugin {
    /** Generate the plugin manifest.json */
    static generatePluginManifest(options?: FigmaManifestOptions): FigmaManifest;

    /** Generate the plugin code.js */
    static generatePluginCode(options?: FigmaCodeOptions): string;

    /** Generate the plugin UI HTML */
    static generatePluginUI(): string;

    /** Generate the complete plugin package */
    static generatePackage(): Record<string, any>;
}
