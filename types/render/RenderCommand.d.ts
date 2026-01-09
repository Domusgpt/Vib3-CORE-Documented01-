/**
 * RenderCommand TypeScript Definitions
 * VIB3+ SDK - Render Command Hierarchy
 */

import { RenderState, Color4 } from './RenderState';

/** Command type identifiers */
export const enum CommandType {
    SET_STATE = 'set_state',
    CLEAR = 'clear',
    BIND_SHADER = 'bind_shader',
    BIND_TEXTURE = 'bind_texture',
    BIND_VERTEX_ARRAY = 'bind_vertex_array',
    BIND_RENDER_TARGET = 'bind_render_target',
    SET_UNIFORM = 'set_uniform',
    DRAW = 'draw',
    DRAW_INDEXED = 'draw_indexed',
    DRAW_INSTANCED = 'draw_instanced',
    DRAW_INDEXED_INSTANCED = 'draw_indexed_instanced',
    SET_VIEWPORT = 'set_viewport',
    CUSTOM = 'custom'
}

/** Primitive topology types */
export const enum PrimitiveType {
    POINTS = 'points',
    LINES = 'lines',
    LINE_LOOP = 'line_loop',
    LINE_STRIP = 'line_strip',
    TRIANGLES = 'triangles',
    TRIANGLE_STRIP = 'triangle_strip',
    TRIANGLE_FAN = 'triangle_fan'
}

/** Index buffer element types */
export type IndexType = 'uint16' | 'uint32';

/** Uniform value types */
export type UniformValue =
    | number
    | boolean
    | number[]
    | Float32Array
    | Int32Array;

/** Backend interface for command execution */
export interface RenderBackend {
    clear(command: ClearCommand): void;
    setState(state: RenderState): void;
    bindShader(shader: any): void;
    bindTexture(texture: any, slot: number): void;
    bindVertexArray(vao: any): void;
    bindRenderTarget(target: any): void;
    setUniform(name: string, value: UniformValue, type?: string): void;
    setViewport(x: number, y: number, width: number, height: number): void;
    draw(command: DrawCommand): void;
    drawIndexed(command: DrawIndexedCommand): void;
    drawInstanced(command: DrawInstancedCommand): void;
    drawIndexedInstanced(command: DrawIndexedInstancedCommand): void;
}

/**
 * Base class for all render commands
 */
export declare abstract class RenderCommand {
    readonly id: number;
    readonly type: CommandType;
    priority: number;
    sortKey: number;
    depth: number;
    label: string;

    constructor(type: CommandType);

    /**
     * Set command label for debugging
     */
    setLabel(label: string): this;

    /**
     * Execute this command on a backend
     */
    abstract execute(backend: RenderBackend): void;
}

/** Clear command options */
export interface ClearOptions {
    clearColor?: boolean;
    clearDepth?: boolean;
    clearStencil?: boolean;
    colorValue?: Color4;
    depthValue?: number;
    stencilValue?: number;
}

/**
 * Clear framebuffer command
 */
export declare class ClearCommand extends RenderCommand {
    clearColor: boolean;
    clearDepth: boolean;
    clearStencil: boolean;
    colorValue: Color4;
    depthValue: number;
    stencilValue: number;

    constructor(options?: ClearOptions);

    /**
     * Create color-only clear
     */
    static color(value: Color4): ClearCommand;

    /**
     * Create depth-only clear
     */
    static depth(value?: number): ClearCommand;

    /**
     * Create stencil-only clear
     */
    static stencil(value?: number): ClearCommand;

    execute(backend: RenderBackend): void;
}

/**
 * Set render state command
 */
export declare class SetStateCommand extends RenderCommand {
    state: RenderState;

    constructor(state: RenderState);

    execute(backend: RenderBackend): void;
}

/**
 * Bind shader program command
 */
export declare class BindShaderCommand extends RenderCommand {
    shader: any;

    constructor(shader: any);

    execute(backend: RenderBackend): void;
}

/**
 * Bind texture command
 */
export declare class BindTextureCommand extends RenderCommand {
    texture: any;
    slot: number;

    constructor(texture: any, slot?: number);

    execute(backend: RenderBackend): void;
}

/**
 * Bind vertex array object command
 */
export declare class BindVertexArrayCommand extends RenderCommand {
    vao: any;

    constructor(vao: any);

    execute(backend: RenderBackend): void;
}

/**
 * Bind render target command
 */
export declare class BindRenderTargetCommand extends RenderCommand {
    target: any;

    constructor(target: any);

    execute(backend: RenderBackend): void;
}

/**
 * Set shader uniform command
 */
export declare class SetUniformCommand extends RenderCommand {
    name: string;
    value: UniformValue;
    uniformType: string | null;

    constructor(name: string, value: UniformValue, type?: string);

    execute(backend: RenderBackend): void;
}

/** Draw command options */
export interface DrawOptions {
    primitive?: PrimitiveType;
    vertexCount?: number;
    firstVertex?: number;
    sortKey?: number;
    depth?: number;
}

/**
 * Draw arrays command
 */
export declare class DrawCommand extends RenderCommand {
    primitive: PrimitiveType;
    vertexCount: number;
    firstVertex: number;

    constructor(options?: DrawOptions);

    execute(backend: RenderBackend): void;
}

/** Draw indexed command options */
export interface DrawIndexedOptions extends DrawOptions {
    indexCount?: number;
    firstIndex?: number;
    baseVertex?: number;
    indexType?: IndexType;
}

/**
 * Draw indexed elements command
 */
export declare class DrawIndexedCommand extends RenderCommand {
    primitive: PrimitiveType;
    indexCount: number;
    firstIndex: number;
    baseVertex: number;
    indexType: IndexType;

    constructor(options?: DrawIndexedOptions);

    execute(backend: RenderBackend): void;
}

/** Draw instanced command options */
export interface DrawInstancedOptions extends DrawOptions {
    instanceCount?: number;
    firstInstance?: number;
}

/**
 * Draw instanced arrays command
 */
export declare class DrawInstancedCommand extends RenderCommand {
    primitive: PrimitiveType;
    vertexCount: number;
    firstVertex: number;
    instanceCount: number;
    firstInstance: number;

    constructor(options?: DrawInstancedOptions);

    execute(backend: RenderBackend): void;
}

/** Draw indexed instanced command options */
export interface DrawIndexedInstancedOptions extends DrawIndexedOptions {
    instanceCount?: number;
    firstInstance?: number;
}

/**
 * Draw indexed instanced elements command
 */
export declare class DrawIndexedInstancedCommand extends RenderCommand {
    primitive: PrimitiveType;
    indexCount: number;
    firstIndex: number;
    baseVertex: number;
    indexType: IndexType;
    instanceCount: number;
    firstInstance: number;

    constructor(options?: DrawIndexedInstancedOptions);

    execute(backend: RenderBackend): void;
}

/**
 * Set viewport command
 */
export declare class SetViewportCommand extends RenderCommand {
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(x: number, y: number, width: number, height: number);

    execute(backend: RenderBackend): void;
}

/** Custom command callback */
export type CustomCommandCallback = (backend: RenderBackend) => void;

/**
 * Custom command for arbitrary GPU operations
 */
export declare class CustomCommand extends RenderCommand {
    callback: CustomCommandCallback;

    constructor(callback: CustomCommandCallback);

    execute(backend: RenderBackend): void;
}
