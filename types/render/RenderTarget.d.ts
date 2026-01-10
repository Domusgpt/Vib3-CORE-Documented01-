/**
 * RenderTarget TypeScript Definitions
 * VIB3+ SDK - Framebuffer Abstraction
 */

/** Texture format identifiers */
export const enum TextureFormat {
    // Color formats
    RGBA8 = 'rgba8',
    RGBA16F = 'rgba16f',
    RGBA32F = 'rgba32f',
    RGB8 = 'rgb8',
    RG8 = 'rg8',
    R8 = 'r8',
    // Depth formats
    DEPTH16 = 'depth16',
    DEPTH24 = 'depth24',
    DEPTH32F = 'depth32f',
    // Depth-stencil formats
    DEPTH24_STENCIL8 = 'depth24_stencil8',
    DEPTH32F_STENCIL8 = 'depth32f_stencil8'
}

/** Attachment type identifiers */
export const enum AttachmentType {
    COLOR = 'color',
    DEPTH = 'depth',
    STENCIL = 'stencil',
    DEPTH_STENCIL = 'depth_stencil'
}

/** Texture filter modes */
export const enum FilterMode {
    NEAREST = 'nearest',
    LINEAR = 'linear',
    NEAREST_MIPMAP_NEAREST = 'nearest_mipmap_nearest',
    LINEAR_MIPMAP_NEAREST = 'linear_mipmap_nearest',
    NEAREST_MIPMAP_LINEAR = 'nearest_mipmap_linear',
    LINEAR_MIPMAP_LINEAR = 'linear_mipmap_linear'
}

/** Texture wrap modes */
export const enum WrapMode {
    REPEAT = 'repeat',
    CLAMP_TO_EDGE = 'clamp_to_edge',
    MIRRORED_REPEAT = 'mirrored_repeat'
}

/** Attachment descriptor options */
export interface AttachmentOptions {
    type?: AttachmentType;
    format?: TextureFormat;
    index?: number;
    useTexture?: boolean;
    minFilter?: FilterMode;
    magFilter?: FilterMode;
    wrapS?: WrapMode;
    wrapT?: WrapMode;
    generateMipmaps?: boolean;
    samples?: number;
}

/**
 * Framebuffer attachment descriptor
 */
export declare class AttachmentDescriptor {
    type: AttachmentType;
    format: TextureFormat;
    index: number;
    useTexture: boolean;
    minFilter: FilterMode;
    magFilter: FilterMode;
    wrapS: WrapMode;
    wrapT: WrapMode;
    generateMipmaps: boolean;
    samples: number;

    constructor(options?: AttachmentOptions);

    /**
     * Create color attachment descriptor
     */
    static color(options?: Partial<AttachmentOptions>): AttachmentDescriptor;

    /**
     * Create depth attachment descriptor
     */
    static depth(options?: Partial<AttachmentOptions>): AttachmentDescriptor;

    /**
     * Create depth-stencil attachment descriptor
     */
    static depthStencil(options?: Partial<AttachmentOptions>): AttachmentDescriptor;

    /**
     * Check if this is a depth format
     */
    isDepthFormat(): boolean;
}

/** Render target options */
export interface RenderTargetOptions {
    colorAttachments?: AttachmentDescriptor[];
    depthAttachment?: AttachmentDescriptor | null;
    label?: string;
}

/** Simple render target options */
export interface SimpleRenderTargetOptions {
    format?: TextureFormat;
    depth?: boolean;
    samples?: number;
}

/**
 * Framebuffer / render target abstraction
 */
export declare class RenderTarget {
    readonly id: number;
    width: number;
    height: number;
    colorAttachments: AttachmentDescriptor[];
    depthAttachment: AttachmentDescriptor | null;
    label: string;

    constructor(width: number, height: number, options?: RenderTargetOptions);

    /**
     * Get aspect ratio
     */
    readonly aspectRatio: number;

    /**
     * Check if target has depth attachment
     */
    readonly hasDepth: boolean;

    /**
     * Get number of color attachments
     */
    readonly colorAttachmentCount: number;

    /**
     * Resize the render target
     */
    resize(width: number, height: number): void;

    /**
     * Get the native handle
     */
    getHandle(): any;

    /**
     * Set the native handle
     */
    setHandle(handle: any): void;

    /**
     * Get color texture at index
     */
    getColorTexture(index?: number): any;

    /**
     * Get depth texture
     */
    getDepthTexture(): any;

    /**
     * Dispose resources
     */
    dispose(): void;

    /**
     * Create simple render target
     */
    static create(
        width: number,
        height: number,
        options?: SimpleRenderTargetOptions
    ): RenderTarget;

    /**
     * Create HDR render target
     */
    static createHDR(
        width: number,
        height: number,
        options?: SimpleRenderTargetOptions
    ): RenderTarget;

    /**
     * Create G-buffer for deferred rendering
     */
    static createGBuffer(width: number, height: number): RenderTarget;

    /**
     * Create shadow map
     */
    static createShadowMap(size: number, format?: TextureFormat): RenderTarget;

    /**
     * Create MSAA render target
     */
    static createMSAA(
        width: number,
        height: number,
        samples?: number,
        format?: TextureFormat
    ): RenderTarget;
}

/** Render target pool statistics */
export interface RenderTargetPoolStats {
    pooled: number;
    inUse: number;
    poolCount: number;
}

/**
 * Pool for reusing render targets
 */
export declare class RenderTargetPool {
    constructor();

    /**
     * Acquire a render target from the pool
     */
    acquire(
        width: number,
        height: number,
        format?: TextureFormat,
        hasDepth?: boolean
    ): RenderTarget;

    /**
     * Release a render target back to the pool
     */
    release(target: RenderTarget): void;

    /**
     * Clear and dispose all pooled targets
     */
    clear(): void;

    /**
     * Get pool statistics
     */
    getStats(): RenderTargetPoolStats;
}

/**
 * Global render target pool instance
 */
export declare const renderTargetPool: RenderTargetPool;
