/**
 * Render Module TypeScript Definitions
 * VIB3+ SDK - Complete Rendering Abstraction (WebGL + WebGPU)
 */

// Re-export all render types
export * from './RenderState';
export * from './RenderCommand';
export * from './CommandBuffer';
export * from './RenderTarget';
export * from './ShaderProgram';
export * from './WebGLBackend';
export * from './WebGPUBackend';
export * from './UnifiedRenderBridge';

import { RenderState, BlendMode, CullFace } from './RenderState';
import { CommandBuffer, CommandBufferOptions } from './CommandBuffer';
import { RenderTarget, RenderTargetOptions } from './RenderTarget';
import { ShaderProgram, ShaderProgramOptions, ShaderLib } from './ShaderProgram';
import { WebGLBackend, WebGLBackendOptions } from './WebGLBackend';
import { WebGPUBackend } from './WebGPUBackend';
import { UnifiedRenderBridge, BackendType } from './UnifiedRenderBridge';

/** Render context options */
export interface RenderContextOptions extends WebGLBackendOptions {}

/** Complete render context */
export interface RenderContext {
    backend: WebGLBackend;
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;

    /**
     * Create a new command buffer
     */
    createCommandBuffer(options?: CommandBufferOptions): CommandBuffer;

    /**
     * Create a new render target
     */
    createRenderTarget(
        width: number,
        height: number,
        options?: RenderTargetOptions
    ): RenderTarget;

    /**
     * Create a new shader program
     */
    createShader(options: ShaderProgramOptions): ShaderProgram;

    /**
     * Dispose all resources
     */
    dispose(): void;
}

/**
 * Create a complete rendering context
 * @returns Render context or null if WebGL 2.0 is not supported
 */
export declare function createRenderContext(
    canvas: HTMLCanvasElement,
    options?: RenderContextOptions
): RenderContext | null;

/**
 * Preset render states for common use cases
 */
export declare const RenderPresets: {
    /** Default opaque rendering */
    opaque(): RenderState;

    /** Alpha-blended transparent rendering */
    transparent(): RenderState;

    /** Additive blending for effects */
    additive(): RenderState;

    /** Wireframe rendering */
    wireframe(): RenderState;

    /** 4D geometry with W-depth sorting */
    geometry4D(): RenderState;

    /** Transparent 4D with back-to-front sorting */
    transparent4D(): RenderState;
};

/** Shader generation options */
export interface Shader4DOptions {
    color?: boolean;
    normal?: boolean;
    lighting?: boolean;
    wFog?: boolean;
}

/**
 * Common shader snippets for 4D rendering
 */
export declare const Shader4D: {
    /** All rotation functions for 6 planes */
    readonly rotation: string;

    /** Projection functions (perspective, stereographic, orthographic) */
    readonly projection: string;

    /** Basic 4D vertex shader template */
    readonly basicVertex: string;

    /** Basic fragment shader with W-fog */
    readonly basicFragment: string;

    /**
     * Generate complete vertex shader for 4D geometry
     */
    generateVertexShader(options?: Shader4DOptions): string;

    /**
     * Generate complete fragment shader for 4D geometry
     */
    generateFragmentShader(options?: Shader4DOptions): string;
};

/** Async render context options (supports WebGPU bridge) */
export interface AsyncRenderContextOptions extends RenderContextOptions {
    /** Prefer WebGPU backend via UnifiedRenderBridge */
    preferWebGPU?: boolean;
    /** Use bridge mode ('bridge' | 'webgl' | 'webgpu') */
    backend?: 'bridge' | 'webgl' | 'webgpu';
}

/**
 * Create a rendering context asynchronously.
 * Supports WebGPU via UnifiedRenderBridge when preferWebGPU or backend='bridge' is set.
 * Falls back to WebGL context if WebGPU is unavailable.
 */
export declare function createRenderContextAsync(
    canvas: HTMLCanvasElement,
    options?: AsyncRenderContextOptions
): Promise<RenderContext | UnifiedRenderBridge | null>;
