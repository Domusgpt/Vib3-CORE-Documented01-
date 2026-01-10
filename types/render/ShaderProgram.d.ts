/**
 * ShaderProgram TypeScript Definitions
 * VIB3+ SDK - Shader Compilation Abstraction
 */

/** Shader stage identifiers */
export const enum ShaderStage {
    VERTEX = 'vertex',
    FRAGMENT = 'fragment',
    COMPUTE = 'compute'
}

/** Uniform type identifiers */
export const enum UniformType {
    FLOAT = 'float',
    INT = 'int',
    BOOL = 'bool',
    VEC2 = 'vec2',
    VEC3 = 'vec3',
    VEC4 = 'vec4',
    IVEC2 = 'ivec2',
    IVEC3 = 'ivec3',
    IVEC4 = 'ivec4',
    MAT2 = 'mat2',
    MAT3 = 'mat3',
    MAT4 = 'mat4',
    SAMPLER_2D = 'sampler2D',
    SAMPLER_CUBE = 'samplerCube',
    SAMPLER_3D = 'sampler3D'
}

/** Uniform value types */
export type UniformValue =
    | number
    | boolean
    | number[]
    | Float32Array
    | Int32Array;

/** Preprocessor defines map */
export interface ShaderDefines {
    [key: string]: number | string | boolean;
}

/** Shader source options */
export interface ShaderSourceOptions {
    entryPoint?: string;
    defines?: ShaderDefines;
    includes?: string[];
}

/**
 * Shader source with preprocessing support
 */
export declare class ShaderSource {
    readonly stage: ShaderStage;
    readonly code: string;
    readonly entryPoint: string;
    readonly defines: ShaderDefines;
    readonly includes: string[];

    constructor(
        stage: ShaderStage,
        code: string,
        options?: ShaderSourceOptions
    );

    /**
     * Get processed code with defines injected
     */
    getProcessedCode(): string;
}

/**
 * Uniform descriptor
 */
export declare class UniformDescriptor {
    readonly name: string;
    readonly type: UniformType;
    readonly defaultValue: UniformValue | null;
    readonly arraySize: number;
    location: any;

    constructor(
        name: string,
        type: UniformType,
        defaultValue?: UniformValue | null
    );
}

/**
 * Vertex attribute descriptor
 */
export declare class AttributeDescriptor {
    readonly name: string;
    readonly location: number;
    readonly type: string;

    constructor(name: string, location: number, type?: string);
}

/** Uniform descriptor input */
export interface UniformInput {
    name: string;
    type: UniformType;
    defaultValue?: UniformValue;
}

/** Attribute descriptor input */
export interface AttributeInput {
    name: string;
    location: number;
    type?: string;
}

/** Shader program options */
export interface ShaderProgramOptions {
    name?: string;
    vertex: string;
    fragment: string;
    defines?: ShaderDefines;
    uniforms?: UniformInput[];
    attributes?: AttributeInput[];
}

/**
 * Shader program abstraction
 */
export declare class ShaderProgram {
    readonly id: number;
    readonly name: string;
    readonly vertexSource: ShaderSource;
    readonly fragmentSource: ShaderSource;
    readonly uniforms: UniformDescriptor[];
    readonly attributes: AttributeDescriptor[];
    error: string | null;

    constructor(options: ShaderProgramOptions);

    /**
     * Check if shader is compiled
     */
    readonly isCompiled: boolean;

    /**
     * Get uniform by name
     */
    getUniform(name: string): UniformDescriptor | undefined;

    /**
     * Get attribute by name
     */
    getAttribute(name: string): AttributeDescriptor | undefined;

    /**
     * Add a uniform descriptor
     */
    addUniform(
        name: string,
        type: UniformType,
        defaultValue?: UniformValue
    ): void;

    /**
     * Add an attribute descriptor
     */
    addAttribute(name: string, location: number, type?: string): void;

    /**
     * Set uniform value (returns true if value changed)
     */
    setUniformValue(name: string, value: UniformValue): boolean;

    /**
     * Get cached uniform value
     */
    getUniformValue(name: string): UniformValue | undefined;

    /**
     * Clear uniform value cache
     */
    clearUniformCache(): void;

    /**
     * Get native handle
     */
    getHandle(): any;

    /**
     * Set native handle
     */
    setHandle(handle: any): void;

    /**
     * Set compilation error
     */
    setError(error: string): void;

    /**
     * Clone shader program
     */
    clone(): ShaderProgram;

    /**
     * Dispose resources
     */
    dispose(): void;
}

/**
 * 4D shader code library
 */
export declare const ShaderLib: {
    /**
     * GLSL functions for 6-plane 4D rotation
     * Includes: rotateXY, rotateXZ, rotateYZ, rotateXW, rotateYW, rotateZW, rotate4D
     */
    readonly rotation4D: string;

    /**
     * GLSL functions for 4D projection
     * Includes: projectPerspective, projectStereographic, projectOrthographic
     */
    readonly projection4D: string;

    /**
     * Basic 4D vertex shader template
     */
    readonly vertex4D: string;

    /**
     * Basic 4D fragment shader with W-fog
     */
    readonly fragment4D: string;
};

/**
 * Cache for compiled shaders
 */
export declare class ShaderCache {
    /**
     * Number of cached shaders
     */
    readonly size: number;

    constructor();

    /**
     * Get or create shader by key
     */
    getOrCreate(key: string, factory: () => ShaderProgram): ShaderProgram;

    /**
     * Get shader by key
     */
    get(key: string): ShaderProgram | undefined;

    /**
     * Set shader by key
     */
    set(key: string, shader: ShaderProgram): void;

    /**
     * Check if shader exists
     */
    has(key: string): boolean;

    /**
     * Clear cache and dispose all shaders
     */
    clear(): void;
}

/**
 * Global shader cache instance
 */
export declare const shaderCache: ShaderCache;
