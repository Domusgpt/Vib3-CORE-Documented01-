/**
 * WebGLBackend TypeScript Definitions
 * VIB3+ SDK - WebGL 2.0 Rendering Backend
 */

import { RenderBackend } from './RenderCommand';
import { RenderState } from './RenderState';

/** WebGL context options */
export interface WebGLContextOptions {
    alpha?: boolean;
    depth?: boolean;
    stencil?: boolean;
    antialias?: boolean;
    premultipliedAlpha?: boolean;
    preserveDrawingBuffer?: boolean;
    powerPreference?: 'default' | 'high-performance' | 'low-power';
    failIfMajorPerformanceCaveat?: boolean;
}

/** Backend options */
export interface WebGLBackendOptions extends WebGLContextOptions {
    debug?: boolean;
}

/** Buffer descriptor */
export interface BufferDescriptor {
    data?: ArrayBufferView;
    size?: number;
    usage?: 'vertex' | 'index';
    dynamic?: boolean;
}

/** GPU buffer handle */
export interface GPUBuffer {
    _handle: WebGLBuffer | null;
    _target: number;
    size: number;
    usage: string;
}

/** WebGL extensions */
export interface WebGLExtensions {
    colorBufferFloat: any;
    floatBlend: any;
    textureFilterAnisotropic: any;
    debugRendererInfo: any;
    loseContext: any;
    parallelShaderCompile: any;
}

/** Backend statistics */
export interface BackendStats {
    drawCalls: number;
    stateChanges: number;
    shaderSwitches: number;
    textureBinds: number;
}

/**
 * WebGL 2.0 rendering backend
 */
export declare class WebGLBackend implements RenderBackend {
    readonly gl: WebGL2RenderingContext;
    readonly debug: boolean;
    readonly extensions: WebGLExtensions;

    constructor(gl: WebGL2RenderingContext, options?: WebGLBackendOptions);

    /**
     * Clear framebuffer
     */
    clear(command: any): void;

    /**
     * Set render state
     */
    setState(state: RenderState): void;

    /**
     * Set viewport
     */
    setViewport(x: number, y: number, width: number, height: number): void;

    /**
     * Bind shader program
     */
    bindShader(shader: any): void;

    /**
     * Set shader uniform
     */
    setUniform(name: string, value: any, type?: string): void;

    /**
     * Bind texture to slot
     */
    bindTexture(texture: any, slot?: number): void;

    /**
     * Bind vertex array object
     */
    bindVertexArray(vao: any): void;

    /**
     * Bind render target (framebuffer)
     */
    bindRenderTarget(target: any): void;

    /**
     * Draw non-indexed primitives
     */
    draw(command: any): void;

    /**
     * Draw indexed primitives
     */
    drawIndexed(command: any): void;

    /**
     * Draw instanced primitives
     */
    drawInstanced(command: any): void;

    /**
     * Draw indexed instanced primitives
     */
    drawIndexedInstanced(command: any): void;

    /**
     * Create a GPU buffer
     */
    createBuffer(descriptor: BufferDescriptor): GPUBuffer;

    /**
     * Update buffer data
     */
    updateBuffer(buffer: GPUBuffer, data: ArrayBufferView, offset?: number): void;

    /**
     * Delete buffer
     */
    deleteBuffer(buffer: GPUBuffer): void;

    /**
     * Get render statistics
     */
    getStats(): BackendStats;

    /**
     * Reset statistics
     */
    resetStats(): void;

    /**
     * Dispose all resources
     */
    dispose(): void;
}

/**
 * Create WebGL 2.0 backend from canvas
 * @returns Backend instance or null if WebGL 2.0 is not supported
 */
export declare function createWebGLBackend(
    canvas: HTMLCanvasElement,
    options?: WebGLBackendOptions
): WebGLBackend | null;
