/**
 * WebGPU Backend TypeScript Definitions
 * VIB3+ SDK - WebGPU Rendering Backend
 */

/** WebGPU feature flag identifiers */
export declare const WebGPUFeatures: {
    readonly TIMESTAMP_QUERY: 'timestamp-query';
    readonly INDIRECT_FIRST_INSTANCE: 'indirect-first-instance';
    readonly SHADER_F16: 'shader-f16';
    readonly DEPTH_CLIP_CONTROL: 'depth-clip-control';
    readonly DEPTH32_STENCIL8: 'depth32float-stencil8';
    readonly TEXTURE_COMPRESSION_BC: 'texture-compression-bc';
    readonly RG11B10_UFLOAT_RENDERABLE: 'rg11b10ufloat-renderable';
    readonly BGRA8_UNORM_STORAGE: 'bgra8unorm-storage';
};

/** WGSL shader library for VIB3+ systems */
export declare const WGSLShaderLib: {
    /** VIB3Uniforms struct definition in WGSL */
    readonly uniformStruct: string;
    /** 6D rotation functions in WGSL */
    readonly rotation4D: string;
    /** Fullscreen vertex shader (oversized triangle technique) */
    readonly fullscreenVertex: string;
};

/** WebGPU backend constructor parameters */
export interface WebGPUBackendParams {
    canvas: HTMLCanvasElement;
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;
    adapter?: GPUAdapter;
}

/** WebGPU backend options */
export interface WebGPUBackendOptions {
    debug?: boolean;
    depth?: boolean;
    features?: string[];
    resourceRegistry?: any;
}

/** GPU info returned by backend */
export interface GPUInfo {
    vendor: string;
    architecture: string;
    device: string;
    description: string;
    features: string[];
}

/** Backend rendering statistics */
export interface WebGPUStats {
    frames: number;
    commandEncoders: number;
    drawCalls: number;
    triangles: number;
    pipelineChanges: number;
}

/** Custom uniform buffer entry */
export interface CustomUniformEntry {
    buffer: GPUBuffer;
    bindGroup: GPUBindGroup;
    layout: GPUBindGroupLayout;
}

/** Fullscreen quad render options */
export interface FullscreenRenderOptions {
    pipeline?: string;
    bindGroups?: GPUBindGroup[];
    clearColor?: [number, number, number, number];
    clear?: boolean;
}

/** Texture descriptor */
export interface TextureDescriptor {
    size: [number, number] | [number, number, number];
    format: GPUTextureFormat;
    usage: number;
}

/**
 * WebGPU rendering backend for VIB3+ engine
 */
export declare class WebGPUBackend {
    readonly canvas: HTMLCanvasElement;
    readonly device: GPUDevice;
    readonly context: GPUCanvasContext;
    readonly format: GPUTextureFormat;
    readonly adapter: GPUAdapter | null;
    readonly debug: boolean;

    constructor(params: WebGPUBackendParams, options?: WebGPUBackendOptions);

    /** Check if a GPU feature is enabled */
    hasFeature(feature: string): boolean;

    /** Get GPU adapter info */
    getGPUInfo(): GPUInfo;

    /** Get rendering statistics */
    getStats(): WebGPUStats;

    /** Reset rendering statistics */
    resetStats(): void;

    /** Resize the rendering surface */
    resize(width: number, height: number): void;

    /** Compile a WGSL shader module */
    compileShader(name: string, code: string): GPUShaderModule;

    /** Create a custom uniform buffer with its own bind group */
    createCustomUniformBuffer(
        name: string,
        size: number,
        visibility?: number
    ): CustomUniformEntry;

    /** Get a previously created custom uniform buffer */
    getCustomUniformBuffer(name: string): CustomUniformEntry | undefined;

    /** Update custom uniform buffer data */
    updateCustomUniforms(name: string, data: Float32Array): void;

    /** Create a fullscreen pipeline for procedural rendering */
    createFullscreenPipeline(
        name: string,
        fragmentCode: string,
        options?: { bindGroupLayouts?: GPUBindGroupLayout[] }
    ): GPURenderPipeline;

    /** Create a named render pipeline */
    createPipeline(name: string, descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;

    /** Render a fullscreen quad */
    renderFullscreenQuad(options?: FullscreenRenderOptions): void;

    /** Render using a named pipeline */
    renderWithPipeline(options: {
        pipeline: string;
        bindGroups?: GPUBindGroup[];
        vertexBuffers?: GPUBuffer[];
        vertexCount?: number;
        indexBuffer?: GPUBuffer;
        indexCount?: number;
    }): void;

    /** Create a 2D texture */
    createTexture(name: string, descriptor: TextureDescriptor): GPUTexture;

    /** Create a sampler */
    createSampler(name: string, descriptor?: GPUSamplerDescriptor): GPUSampler;

    /** Update default uniform buffer */
    updateUniforms(data: Float32Array): void;

    /** Dispose all resources */
    dispose(): void;
}

/** Check if WebGPU is available in the current environment */
export declare function isWebGPUSupported(): boolean;

/** Get available WebGPU features */
export declare function getWebGPUFeatures(): Promise<Set<string> | null>;

/** Create a WebGPU backend (async) */
export declare function createWebGPUBackend(
    canvas: HTMLCanvasElement,
    options?: {
        powerPreference?: 'high-performance' | 'low-power';
        requiredFeatures?: string[];
        debug?: boolean;
        depth?: boolean;
    }
): Promise<WebGPUBackend | null>;

/** Create WebGPU backend with fallback info */
export declare function createWebGPUWithFallback(
    canvas: HTMLCanvasElement,
    options?: Parameters<typeof createWebGPUBackend>[1]
): Promise<{ backend: WebGPUBackend | null; type: 'webgpu' | null }>;
