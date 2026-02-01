/**
 * ThreeJsPackage TypeScript Definitions
 * VIB3+ SDK - Three.js ShaderMaterial Integration
 */

import { SystemName } from '../core/VIB3Engine';

/** Options for getShaderMaterial */
export interface ShaderMaterialOptions {
    system?: SystemName;
    transparent?: boolean;
    depthWrite?: boolean;
    depthTest?: boolean;
    width?: number;
    height?: number;
    initialParams?: Record<string, number>;
}

/** Three.js uniform value wrapper */
export interface UniformValue {
    value: number | number[] | Float32Array;
}

/** Returned shader material config (compatible with THREE.ShaderMaterial) */
export interface ShaderMaterialConfig {
    vertexShader: string;
    fragmentShader: string;
    uniforms: Record<string, UniformValue>;
    transparent: boolean;
    depthWrite: boolean;
    depthTest: boolean;

    /** Update time uniform (call each frame with elapsed ms) */
    update(timeMs: number): void;

    /** Set a single parameter */
    setParameter(name: string, value: number): void;

    /** Set multiple parameters */
    setParameters(params: Record<string, number>): void;

    /** Update resolution uniforms */
    setResolution(w: number, h: number): void;

    /** Update audio uniforms */
    setAudio(bass: number, mid: number, high: number): void;
}

/**
 * Static generator for Three.js ShaderMaterial configurations.
 * Returns objects compatible with `new THREE.ShaderMaterial(config)`.
 */
export declare class Vib3ThreeJsPackage {
    /** Get a complete ShaderMaterial config for a system */
    static getShaderMaterial(options?: ShaderMaterialOptions): ShaderMaterialConfig;

    /** Get the vertex shader source */
    static getVertexShader(): string;

    /** Get the fragment shader source for a given system */
    static getFragmentShader(system?: SystemName): string;
}
