/**
 * WebGPUCompute TypeScript Definitions
 * VIB3+ SDK - WGSL Particle Simulation & Audio FFT Compute Shaders
 */

/** Particle simulation parameters */
export interface ParticleParams {
    gravity?: number;
    speed?: number;
    turbulence?: number;
    attraction?: number;
    damping?: number;
    [key: string]: number | undefined;
}

/**
 * WebGPU compute shader pipeline for particle simulation and audio FFT.
 * Runs WGSL compute shaders on the GPU for high-performance parallel processing.
 */
export declare class WebGPUCompute {
    /** WGSL particle simulation shader source */
    static readonly PARTICLE_COMPUTE_WGSL: string;

    /** WGSL audio FFT shader source */
    static readonly AUDIO_FFT_COMPUTE_WGSL: string;

    readonly device: any | null;
    readonly particleCount: number;

    constructor(device?: any);

    /** Initialize with a GPUDevice */
    initialize(device: any): Promise<void>;

    /** Create a particle system with N particles */
    createParticleSystem(count?: number): Promise<void>;

    /** Run one simulation step */
    updateParticles(params: ParticleParams, deltaTime: number): Promise<void>;

    /** Read back particle positions from GPU */
    readParticleData(): Promise<Float32Array>;

    /** Run audio FFT compute shader */
    computeAudioFFT(audioBuffer: Float32Array): Float32Array;

    /** Set geometry attractor for particle system */
    setGeometryAttractor(geometry: number): void;

    /** Dispose GPU resources */
    dispose(): void;
}
