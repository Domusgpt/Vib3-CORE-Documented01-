/**
 * UnifiedRenderBridge TypeScript Definitions
 * VIB3+ SDK - WebGL/WebGPU Abstraction Bridge
 */

import { WebGPUBackend } from './WebGPUBackend';

/** Backend type identifier */
export type BackendType = 'webgl' | 'webgpu';

/** Shader source bundle for dual-backend compilation */
export interface ShaderSources {
    /** GLSL vertex shader source */
    glslVertex: string;
    /** GLSL fragment shader source */
    glslFragment: string;
    /** WGSL fragment shader source (optional, required for WebGPU) */
    wgslFragment?: string;
}

/** Render options for fullscreen quad rendering */
export interface BridgeRenderOptions {
    /** Clear color as RGBA 0-1 */
    clearColor?: [number, number, number, number];
    /** Whether to clear before drawing (default: true) */
    clear?: boolean;
}

/** VIB3+ uniform values accepted by setUniforms */
export interface VIB3Uniforms {
    u_time?: number;
    u_resolution?: [number, number];
    u_geometry?: number;
    u_rot4dXY?: number;
    u_rot4dXZ?: number;
    u_rot4dYZ?: number;
    u_rot4dXW?: number;
    u_rot4dYW?: number;
    u_rot4dZW?: number;
    u_dimension?: number;
    u_gridDensity?: number;
    u_morphFactor?: number;
    u_chaos?: number;
    u_speed?: number;
    u_hue?: number;
    u_intensity?: number;
    u_saturation?: number;
    u_mouseIntensity?: number;
    u_clickIntensity?: number;
    u_bass?: number;
    u_mid?: number;
    u_high?: number;
    u_layerScale?: number;
    u_layerOpacity?: number;
    u_layerColor?: [number, number, number];
    u_densityMult?: number;
    u_speedMult?: number;
    [key: string]: number | number[] | boolean | undefined;
}

/** Bridge creation options */
export interface BridgeCreateOptions {
    /** Try WebGPU first (default: true) */
    preferWebGPU?: boolean;
    /** Enable debug logging */
    debug?: boolean;
}

/**
 * Pack VIB3+ parameters into a Float32Array for WebGPU uniform buffer.
 * Layout matches VIB3Uniforms struct in WGSL (256 bytes).
 */
export declare function packVIB3Uniforms(uniforms: VIB3Uniforms): Float32Array;

/**
 * UnifiedRenderBridge - Connects VIB3+ visualization systems to WebGL/WebGPU backends.
 *
 * All three VIB3+ visualization systems (Quantum, Faceted, Holographic) use the same
 * rendering pattern: procedural fragment shaders on a fullscreen quad. This bridge
 * abstracts that pattern so systems can render identically on either backend.
 */
export declare class UnifiedRenderBridge {
    readonly canvas: HTMLCanvasElement;
    readonly backendType: BackendType;
    readonly backend: WebGLRenderingContext | WebGL2RenderingContext | WebGPUBackend;

    constructor(
        canvas: HTMLCanvasElement,
        backendType: BackendType,
        backend: WebGLRenderingContext | WebGL2RenderingContext | WebGPUBackend
    );

    /**
     * Create a UnifiedRenderBridge with automatic backend selection.
     * Tries WebGPU first (if preferred), falls back to WebGL.
     */
    static create(
        canvas: HTMLCanvasElement,
        options?: BridgeCreateOptions
    ): Promise<UnifiedRenderBridge>;

    /** Get the active backend type */
    getBackendType(): BackendType;

    /** Check if the bridge is initialized */
    readonly initialized: boolean;

    /**
     * Compile a shader program for a named visualization.
     * For WebGL: compiles GLSL vertex + fragment shaders.
     * For WebGPU: compiles WGSL fragment shader with fullscreen pipeline.
     */
    compileShader(name: string, sources: ShaderSources): boolean;

    /**
     * Set uniforms for the next render call.
     * Accepts a flat object with uniform names as keys.
     */
    setUniforms(uniforms: VIB3Uniforms): void;

    /**
     * Render a fullscreen quad using the named shader program.
     */
    render(name: string, options?: BridgeRenderOptions): void;

    /**
     * Resize the rendering surface.
     */
    resize(width: number, height: number, pixelRatio?: number): void;

    /**
     * Get the raw WebGL context or WebGPU backend for advanced usage.
     */
    getRawBackend(): WebGLRenderingContext | WebGL2RenderingContext | WebGPUBackend;

    /** Dispose of all resources */
    dispose(): void;
}

/** Check if WebGPU is available in the current environment */
export declare function canUseWebGPU(): boolean;

export { WGSLShaderLib } from './WebGPUBackend';
