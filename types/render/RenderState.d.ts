/**
 * RenderState TypeScript Definitions
 * VIB3+ SDK - Render Abstraction Layer
 */

/** Blend modes for color mixing */
export const enum BlendMode {
    NONE = 'none',
    ALPHA = 'alpha',
    ADDITIVE = 'additive',
    MULTIPLY = 'multiply',
    SCREEN = 'screen',
    PREMULTIPLIED = 'premultiplied'
}

/** Depth comparison functions */
export const enum DepthFunc {
    NEVER = 'never',
    LESS = 'less',
    EQUAL = 'equal',
    LEQUAL = 'lequal',
    GREATER = 'greater',
    NOTEQUAL = 'notequal',
    GEQUAL = 'gequal',
    ALWAYS = 'always'
}

/** Face culling modes */
export const enum CullFace {
    NONE = 'none',
    FRONT = 'front',
    BACK = 'back',
    FRONT_AND_BACK = 'front_and_back'
}

/** Polygon fill modes */
export const enum PolygonMode {
    FILL = 'fill',
    LINE = 'line',
    POINT = 'point'
}

/** Stencil operations */
export const enum StencilOp {
    KEEP = 'keep',
    ZERO = 'zero',
    REPLACE = 'replace',
    INCR = 'incr',
    INCR_WRAP = 'incr_wrap',
    DECR = 'decr',
    DECR_WRAP = 'decr_wrap',
    INVERT = 'invert'
}

/** Blend factor names */
export type BlendFactor =
    | 'zero'
    | 'one'
    | 'src_color'
    | 'one_minus_src_color'
    | 'dst_color'
    | 'one_minus_dst_color'
    | 'src_alpha'
    | 'one_minus_src_alpha'
    | 'dst_alpha'
    | 'one_minus_dst_alpha'
    | 'constant_color'
    | 'one_minus_constant_color'
    | 'constant_alpha'
    | 'one_minus_constant_alpha'
    | 'src_alpha_saturate';

/** RGBA color tuple */
export type Color4 = [number, number, number, number];

/** Boolean mask for color channels */
export type ColorMask = [boolean, boolean, boolean, boolean];

/** Scissor/viewport rectangle */
export type Rect = [number, number, number, number];

/**
 * Blend state configuration
 */
export declare class BlendState {
    enabled: boolean;
    mode: BlendMode;
    srcRGB: BlendFactor;
    dstRGB: BlendFactor;
    srcAlpha: BlendFactor;
    dstAlpha: BlendFactor;
    color: Color4;

    constructor();

    /**
     * Set blend mode preset
     */
    setMode(mode: BlendMode): void;

    /**
     * Set custom blend factors
     */
    setCustom(
        srcRGB: BlendFactor,
        dstRGB: BlendFactor,
        srcAlpha?: BlendFactor,
        dstAlpha?: BlendFactor
    ): void;

    /**
     * Clone this state
     */
    clone(): BlendState;

    /**
     * Check equality with another state
     */
    equals(other: BlendState): boolean;
}

/**
 * Depth test state configuration
 */
export declare class DepthState {
    testEnabled: boolean;
    writeEnabled: boolean;
    func: DepthFunc;
    near: number;
    far: number;

    constructor();

    /**
     * Clone this state
     */
    clone(): DepthState;

    /**
     * Check equality with another state
     */
    equals(other: DepthState): boolean;
}

/**
 * Stencil test state configuration
 */
export declare class StencilState {
    enabled: boolean;
    func: string;
    ref: number;
    mask: number;
    failOp: StencilOp;
    depthFailOp: StencilOp;
    passOp: StencilOp;

    constructor();

    /**
     * Clone this state
     */
    clone(): StencilState;

    /**
     * Check equality with another state
     */
    equals(other: StencilState): boolean;
}

/**
 * Rasterizer state configuration
 */
export declare class RasterizerState {
    cullFace: CullFace;
    frontFaceCCW: boolean;
    polygonMode: PolygonMode;
    scissorEnabled: boolean;
    scissorRect: Rect;
    lineWidth: number;
    depthBiasEnabled: boolean;
    depthBiasFactor: number;
    depthBiasUnits: number;

    constructor();

    /**
     * Clone this state
     */
    clone(): RasterizerState;

    /**
     * Check equality with another state
     */
    equals(other: RasterizerState): boolean;
}

/**
 * Viewport configuration
 */
export declare class Viewport {
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(x?: number, y?: number, width?: number, height?: number);

    /**
     * Get aspect ratio (width / height)
     */
    readonly aspectRatio: number;

    /**
     * Clone this viewport
     */
    clone(): Viewport;

    /**
     * Check equality with another viewport
     */
    equals(other: Viewport): boolean;

    /**
     * Set all values at once
     */
    set(x: number, y: number, width: number, height: number): void;
}

/**
 * Complete render state configuration
 */
export declare class RenderState {
    blend: BlendState;
    depth: DepthState;
    stencil: StencilState;
    rasterizer: RasterizerState;
    viewport: Viewport;
    colorMask: ColorMask;
    clearColor: Color4;
    clearDepth: number;
    clearStencil: number;

    constructor();

    /**
     * Create opaque render state preset
     */
    static opaque(): RenderState;

    /**
     * Create transparent render state preset
     */
    static transparent(): RenderState;

    /**
     * Create additive blend render state preset
     */
    static additive(): RenderState;

    /**
     * Create wireframe render state preset
     */
    static wireframe(): RenderState;

    /**
     * Clone this state
     */
    clone(): RenderState;

    /**
     * Get state difference
     */
    diff(other: RenderState): Partial<RenderState>;

    /**
     * Get sort key for state-based batching
     */
    getSortKey(): number;
}
