/**
 * VIB3+ WebGPU Compute Pipeline
 * GPU-accelerated particle systems and audio FFT processing.
 *
 * Provides two compute pipelines:
 *  1. Particle Physics -- 65536 particles influenced by 4D geometry fields,
 *     audio reactivity, and user parameters.
 *  2. Audio FFT -- Transforms time-domain audio samples into frequency-domain
 *     bands (bass, mid, high, plus configurable sub-bands).
 *
 * Both pipelines are fully self-contained WGSL compute shaders dispatched
 * through a single WebGPU device.
 *
 * @module advanced/WebGPUCompute
 */

// ---------------------------------------------------------------------------
//  WGSL Shader Sources
// ---------------------------------------------------------------------------

/**
 * WGSL compute shader for particle physics simulation.
 *
 * Each particle has: position (vec4), velocity (vec4), life (f32), phase (f32).
 * Stride per particle = 10 floats = 40 bytes.
 *
 * The shader applies 4D rotation fields, gravity toward geometry attractors,
 * audio-driven turbulence, and damping per-frame.
 */
const PARTICLE_COMPUTE_WGSL = /* wgsl */ `

struct Params {
    time:        f32,
    deltaTime:   f32,
    particleCount: u32,
    _pad0:       f32,

    // 6D rotation angles
    rotXY: f32, rotXZ: f32, rotYZ: f32, _pad1: f32,
    rotXW: f32, rotYW: f32, rotZW: f32, _pad2: f32,

    // VIB3 parameters
    geometry:    f32,
    gridDensity: f32,
    morphFactor: f32,
    chaos:       f32,

    speed:       f32,
    hue:         f32,
    intensity:   f32,
    dimension:   f32,

    // Audio
    bass:        f32,
    mid:         f32,
    high:        f32,
    _pad3:       f32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<f32>;
@group(0) @binding(1) var<uniform> params: Params;

// ---- Rotation helpers (4D) ----

fn rotateXY(p: vec4<f32>, a: f32) -> vec4<f32> {
    let c = cos(a); let s = sin(a);
    return vec4<f32>(p.x * c - p.y * s, p.x * s + p.y * c, p.z, p.w);
}

fn rotateXZ(p: vec4<f32>, a: f32) -> vec4<f32> {
    let c = cos(a); let s = sin(a);
    return vec4<f32>(p.x * c - p.z * s, p.y, p.x * s + p.z * c, p.w);
}

fn rotateYZ(p: vec4<f32>, a: f32) -> vec4<f32> {
    let c = cos(a); let s = sin(a);
    return vec4<f32>(p.x, p.y * c - p.z * s, p.y * s + p.z * c, p.w);
}

fn rotateXW(p: vec4<f32>, a: f32) -> vec4<f32> {
    let c = cos(a); let s = sin(a);
    return vec4<f32>(p.x * c - p.w * s, p.y, p.z, p.x * s + p.w * c);
}

fn rotateYW(p: vec4<f32>, a: f32) -> vec4<f32> {
    let c = cos(a); let s = sin(a);
    return vec4<f32>(p.x, p.y * c - p.w * s, p.z, p.y * s + p.w * c);
}

fn rotateZW(p: vec4<f32>, a: f32) -> vec4<f32> {
    let c = cos(a); let s = sin(a);
    return vec4<f32>(p.x, p.y, p.z * c - p.w * s, p.z * s + p.w * c);
}

fn rotate4D(p: vec4<f32>) -> vec4<f32> {
    var q = p;
    q = rotateXY(q, params.rotXY);
    q = rotateXZ(q, params.rotXZ);
    q = rotateYZ(q, params.rotYZ);
    q = rotateXW(q, params.rotXW);
    q = rotateYW(q, params.rotYW);
    q = rotateZW(q, params.rotZW);
    return q;
}

// ---- Pseudo-random (hash-based) ----

fn hash(n: f32) -> f32 {
    return fract(sin(n) * 43758.5453123);
}

fn hash3(p: vec3<f32>) -> vec3<f32> {
    let q = vec3<f32>(
        dot(p, vec3<f32>(127.1, 311.7, 74.7)),
        dot(p, vec3<f32>(269.5, 183.3, 246.1)),
        dot(p, vec3<f32>(113.5, 271.9, 124.6))
    );
    return fract(sin(q) * 43758.5453123);
}

// ---- Geometry attractor field ----

fn geometryAttractor(pos: vec4<f32>, geom: f32, t: f32) -> vec4<f32> {
    let gi = u32(geom) % 8u;
    var target = vec4<f32>(0.0);

    switch gi {
        case 0u: { // Tetrahedron vertices
            let phase = t * 0.5;
            target = vec4<f32>(
                sin(phase + pos.x * 3.14159),
                cos(phase + pos.y * 3.14159),
                sin(phase * 0.7 + pos.z * 3.14159),
                cos(phase * 0.3)
            ) * 0.5;
        }
        case 1u: { // Hypercube lattice
            target = vec4<f32>(
                round(pos.x * 2.0) * 0.5,
                round(pos.y * 2.0) * 0.5,
                round(pos.z * 2.0) * 0.5,
                round(pos.w * 2.0) * 0.5
            );
        }
        case 2u: { // Sphere surface
            let len = max(length(pos), 0.001);
            target = pos / len * 0.6;
        }
        case 3u: { // Torus
            let R = 0.5; let r_minor = 0.2;
            let angle1 = atan2(pos.y, pos.x);
            let ringCenter = vec2<f32>(cos(angle1), sin(angle1)) * R;
            let toCenter = vec2<f32>(pos.x - ringCenter.x, pos.y - ringCenter.y);
            let angle2 = atan2(pos.z, length(toCenter));
            target = vec4<f32>(
                (R + r_minor * cos(angle2)) * cos(angle1),
                (R + r_minor * cos(angle2)) * sin(angle1),
                r_minor * sin(angle2),
                pos.w * 0.5
            );
        }
        case 4u: { // Klein bottle (figure-8 immersion)
            let u_angle = atan2(pos.y, pos.x);
            let v_angle = atan2(pos.w, pos.z);
            target = vec4<f32>(
                (2.0 + cos(v_angle)) * cos(u_angle),
                (2.0 + cos(v_angle)) * sin(u_angle),
                sin(v_angle) * cos(u_angle * 0.5),
                sin(v_angle) * sin(u_angle * 0.5)
            ) * 0.25;
        }
        case 5u: { // Fractal (Menger-like attractor)
            var fp = pos;
            for (var i = 0u; i < 3u; i++) {
                fp = abs(fp) * 2.0 - vec4<f32>(1.0);
            }
            target = fp * 0.15;
        }
        case 6u: { // Wave
            target = vec4<f32>(
                pos.x,
                sin(pos.x * 6.28 + t) * 0.3,
                pos.z,
                cos(pos.z * 6.28 + t * 0.7) * 0.3
            );
        }
        case 7u: { // Crystal (octahedral)
            let absSum = abs(pos.x) + abs(pos.y) + abs(pos.z) + abs(pos.w);
            let scale = select(0.6 / absSum, 1.0, absSum < 0.001);
            target = pos * scale;
        }
        default: {
            target = vec4<f32>(0.0);
        }
    }

    return target;
}

// ---- Main compute ----

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = gid.x;
    if (idx >= params.particleCount) { return; }

    let stride = 10u; // floats per particle
    let base = idx * stride;

    // Read particle state
    var pos = vec4<f32>(particles[base + 0u], particles[base + 1u],
                        particles[base + 2u], particles[base + 3u]);
    var vel = vec4<f32>(particles[base + 4u], particles[base + 5u],
                        particles[base + 6u], particles[base + 7u]);
    var life  = particles[base + 8u];
    var phase = particles[base + 9u];

    let dt = params.deltaTime * params.speed;
    let t  = params.time;
    let fi = f32(idx);

    // ---- Respawn dead particles ----
    if (life <= 0.0) {
        let seed = hash3(vec3<f32>(fi, t, fi * 0.37));
        pos = vec4<f32>(
            (seed.x - 0.5) * 2.0,
            (seed.y - 0.5) * 2.0,
            (seed.z - 0.5) * 2.0,
            (hash(fi + t) - 0.5) * 2.0
        );
        vel = vec4<f32>(0.0);
        life = 2.0 + hash(fi * 7.13 + t) * 4.0;
        phase = hash(fi * 3.17 + t) * 6.28318;
    }

    // ---- 4D rotation field ----
    let rotatedTarget = rotate4D(pos);
    let rotForce = (rotatedTarget - pos) * 0.5;

    // ---- Geometry attractor ----
    let attractor = geometryAttractor(pos, params.geometry, t);
    let attractForce = (attractor - pos) * (0.3 + params.morphFactor * 0.5);

    // ---- Audio turbulence ----
    let audioForce = vec4<f32>(
        sin(phase + t * 3.0) * params.bass * 0.8,
        cos(phase + t * 2.5) * params.mid * 0.6,
        sin(phase * 1.3 + t * 1.8) * params.high * 0.7,
        cos(phase * 0.7 + t) * (params.bass + params.mid) * 0.3
    );

    // ---- Chaos / noise ----
    let chaosNoise = vec4<f32>(
        hash(fi + t * 100.0) - 0.5,
        hash(fi * 2.0 + t * 100.0) - 0.5,
        hash(fi * 3.0 + t * 100.0) - 0.5,
        hash(fi * 4.0 + t * 100.0) - 0.5
    ) * params.chaos * 2.0;

    // ---- Grid density influence (repulsion from neighbors approximation) ----
    let densityRepel = -pos * (params.gridDensity * 0.001);

    // ---- Integrate ----
    let totalForce = rotForce + attractForce + audioForce + chaosNoise + densityRepel;
    vel = vel + totalForce * dt;

    // Damping
    let damping = 0.96 - params.chaos * 0.1;
    vel = vel * damping;

    // Clamp velocity
    let maxSpeed = 2.0 + params.speed;
    let speed = length(vel);
    if (speed > maxSpeed) {
        vel = vel * (maxSpeed / speed);
    }

    pos = pos + vel * dt;

    // Boundary wrap
    pos = (fract((pos + vec4<f32>(2.0)) / 4.0) - vec4<f32>(0.5)) * 4.0;

    // Life decay
    life = life - dt;
    phase = phase + dt * 1.5;

    // ---- Write back ----
    particles[base + 0u] = pos.x;
    particles[base + 1u] = pos.y;
    particles[base + 2u] = pos.z;
    particles[base + 3u] = pos.w;
    particles[base + 4u] = vel.x;
    particles[base + 5u] = vel.y;
    particles[base + 6u] = vel.z;
    particles[base + 7u] = vel.w;
    particles[base + 8u] = life;
    particles[base + 9u] = phase;
}
`;

/**
 * WGSL compute shader for audio FFT processing.
 *
 * Performs a radix-2 Cooley-Tukey FFT on 1024 samples,
 * then bins the magnitudes into frequency bands.
 */
const FFT_COMPUTE_WGSL = /* wgsl */ `

// -- Bindings --
// binding 0: input time-domain audio (1024 f32 samples, read)
// binding 1: working buffer for FFT (2048 f32: 1024 real + 1024 imag, read_write)
// binding 2: output frequency bands (32 f32, read_write)
// binding 3: FFT params uniform

struct FFTParams {
    sampleCount: u32,
    bandCount:   u32,
    sampleRate:  f32,
    _pad:        f32,
};

@group(0) @binding(0) var<storage, read>       audioInput:  array<f32>;
@group(0) @binding(1) var<storage, read_write>  fftWork:     array<f32>;
@group(0) @binding(2) var<storage, read_write>  bands:       array<f32>;
@group(0) @binding(3) var<uniform>              fftParams:   FFTParams;

// ---- Bit-reversal permutation ----
fn bitReverse(x: u32, bits: u32) -> u32 {
    var v = x;
    var r = 0u;
    for (var i = 0u; i < bits; i++) {
        r = (r << 1u) | (v & 1u);
        v = v >> 1u;
    }
    return r;
}

// ---- Pass 1: Bit-reverse copy + Hann window ----
@compute @workgroup_size(256)
fn fftBitReverse(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = gid.x;
    let N = fftParams.sampleCount;
    if (idx >= N) { return; }

    let bits = u32(log2(f32(N)));
    let target = bitReverse(idx, bits);

    // Apply Hann window
    let n = f32(idx);
    let Nf = f32(N);
    let window = 0.5 * (1.0 - cos(6.28318530718 * n / (Nf - 1.0)));
    let sample = audioInput[idx] * window;

    // Bit-reversed copy: real in [0..N), imag in [N..2N)
    fftWork[target]     = sample;
    fftWork[target + N] = 0.0;
}

// ---- Pass 2..log2(N): Butterfly operations ----
// We dispatch this multiple times from JS, once per FFT stage,
// passing the stage via push constant emulation in the work buffer layout.

// For simplicity and correctness, we encode a full iterative FFT in a
// single dispatch with a serial loop per invocation over its assigned
// butterflies across all stages. Each invocation handles one butterfly
// within the current stage dispatched from JS.

// In practice we use a staged approach: JS dispatches log2(N) times.
// Each dispatch operates on one stage. The stage index is encoded at
// fftWork[2*N] (a reserved slot written by JS before each dispatch).

@compute @workgroup_size(256)
fn fftButterfly(@builtin(global_invocation_id) gid: vec3<u32>) {
    let N = fftParams.sampleCount;
    let idx = gid.x;

    // Stage encoded at the reserved slot
    let stage = u32(fftWork[2u * N]);
    let halfLen = 1u << stage;                    // half the sub-DFT length
    let fullLen = halfLen << 1u;                   // full sub-DFT length
    let numButterflies = N / 2u;

    if (idx >= numButterflies) { return; }

    // Determine which butterfly within which sub-DFT
    let subDFT = idx / halfLen;
    let j      = idx % halfLen;
    let base   = subDFT * fullLen;

    let evenIdx = base + j;
    let oddIdx  = base + j + halfLen;

    // Twiddle factor: W_N^(j * N/fullLen)
    let angle = -6.28318530718 * f32(j) / f32(fullLen);
    let tw_re = cos(angle);
    let tw_im = sin(angle);

    // Read even and odd
    let e_re = fftWork[evenIdx];
    let e_im = fftWork[evenIdx + N];
    let o_re = fftWork[oddIdx];
    let o_im = fftWork[oddIdx + N];

    // Twiddle multiply
    let t_re = o_re * tw_re - o_im * tw_im;
    let t_im = o_re * tw_im + o_im * tw_re;

    // Butterfly
    fftWork[evenIdx]     = e_re + t_re;
    fftWork[evenIdx + N] = e_im + t_im;
    fftWork[oddIdx]      = e_re - t_re;
    fftWork[oddIdx + N]  = e_im - t_im;
}

// ---- Pass final: Compute magnitude bands ----
@compute @workgroup_size(32)
fn fftBands(@builtin(global_invocation_id) gid: vec3<u32>) {
    let bandIdx = gid.x;
    let bandCount = fftParams.bandCount;
    if (bandIdx >= bandCount) { return; }

    let N = fftParams.sampleCount;
    let halfN = N / 2u;  // Nyquist

    // Map bands logarithmically across spectrum
    let lo = f32(bandIdx) / f32(bandCount);
    let hi = f32(bandIdx + 1u) / f32(bandCount);

    // Logarithmic frequency mapping
    let freqLo = u32(pow(f32(halfN), lo));
    let freqHi = max(u32(pow(f32(halfN), hi)), freqLo + 1u);

    var mag = 0.0;
    var count = 0.0;
    for (var k = freqLo; k < freqHi && k < halfN; k++) {
        let re = fftWork[k];
        let im = fftWork[k + N];
        mag += sqrt(re * re + im * im);
        count += 1.0;
    }

    if (count > 0.0) {
        mag = mag / count;
    }

    // Normalize (approximate, assumes input in [-1, 1])
    mag = mag / f32(N) * 2.0;

    bands[bandIdx] = mag;
}
`;

// ---------------------------------------------------------------------------
//  Exports
// ---------------------------------------------------------------------------

export class WebGPUComputePipeline {
    constructor() {
        /** @type {GPUDevice|null} */
        this.device = null;

        /** @type {GPUAdapter|null} */
        this.adapter = null;

        // -- Particle resources --
        /** @type {GPUComputePipeline|null} */
        this.particlePipeline = null;

        /** @type {GPUBuffer|null} */
        this.particleBuffer = null;

        /** @type {GPUBuffer|null} */
        this.particleParamsBuffer = null;

        /** @type {GPUBuffer|null} */
        this.particleReadBuffer = null;

        /** @type {GPUBindGroup|null} */
        this.particleBindGroup = null;

        /** @type {number} */
        this.particleCount = 65536;

        /** @type {number} Floats per particle (pos4 + vel4 + life + phase) */
        this.particleStride = 10;

        // -- FFT resources --
        /** @type {GPUComputePipeline|null} FFT bit-reverse pipeline */
        this.fftBitReversePipeline = null;

        /** @type {GPUComputePipeline|null} FFT butterfly pipeline */
        this.fftButterflyPipeline = null;

        /** @type {GPUComputePipeline|null} FFT band computation pipeline */
        this.fftBandsPipeline = null;

        /** @type {GPUBuffer|null} */
        this.fftInputBuffer = null;

        /** @type {GPUBuffer|null} */
        this.fftWorkBuffer = null;

        /** @type {GPUBuffer|null} */
        this.fftBandsBuffer = null;

        /** @type {GPUBuffer|null} */
        this.fftParamsBuffer = null;

        /** @type {GPUBuffer|null} */
        this.fftReadBuffer = null;

        /** @type {GPUBindGroup|null} */
        this.fftBindGroup = null;

        /** @type {number} */
        this.fftSize = 1024;

        /** @type {number} */
        this.bandCount = 32;

        /** @type {boolean} */
        this._initialized = false;
    }

    // -----------------------------------------------------------------------
    //  Initialization
    // -----------------------------------------------------------------------

    /**
     * Initialize WebGPU adapter, device, and both compute pipelines.
     * @returns {Promise<void>}
     * @throws {Error} If WebGPU is unavailable
     */
    async initialize() {
        if (this._initialized) return;

        if (!navigator.gpu) {
            throw new Error('WebGPU is not supported in this browser.');
        }

        this.adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });

        if (!this.adapter) {
            throw new Error('Failed to obtain WebGPU adapter.');
        }

        this.device = await this.adapter.requestDevice({
            requiredLimits: {
                maxStorageBufferBindingSize: this.adapter.limits.maxStorageBufferBindingSize,
                maxComputeWorkgroupsPerDimension: this.adapter.limits.maxComputeWorkgroupsPerDimension
            }
        });

        this.device.lost.then((info) => {
            console.error('WebGPU device lost:', info.message);
            this._initialized = false;
        });

        this._createParticlePipeline();
        this._createFFTPipeline();

        this._initialized = true;
    }

    // -----------------------------------------------------------------------
    //  Particle System
    // -----------------------------------------------------------------------

    /**
     * Return the WGSL source for the particle compute shader.
     * @returns {string}
     */
    createParticleComputeShader() {
        return PARTICLE_COMPUTE_WGSL;
    }

    /**
     * Build particle compute pipeline and allocate GPU buffers.
     * @private
     */
    _createParticlePipeline() {
        const device = this.device;
        const totalFloats = this.particleCount * this.particleStride;
        const bufferSize = totalFloats * 4; // bytes

        // Particle storage buffer
        this.particleBuffer = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });

        // Initialize particles with random positions
        {
            const data = new Float32Array(this.particleBuffer.getMappedRange());
            for (let i = 0; i < this.particleCount; i++) {
                const base = i * this.particleStride;
                // Position
                data[base + 0] = (Math.random() - 0.5) * 2.0;
                data[base + 1] = (Math.random() - 0.5) * 2.0;
                data[base + 2] = (Math.random() - 0.5) * 2.0;
                data[base + 3] = (Math.random() - 0.5) * 2.0;
                // Velocity
                data[base + 4] = 0;
                data[base + 5] = 0;
                data[base + 6] = 0;
                data[base + 7] = 0;
                // Life
                data[base + 8] = 2.0 + Math.random() * 4.0;
                // Phase
                data[base + 9] = Math.random() * Math.PI * 2.0;
            }
            this.particleBuffer.unmap();
        }

        // Params uniform buffer (must be 16-byte aligned, total struct = 96 bytes)
        const paramsSize = 128; // Rounded up for alignment
        this.particleParamsBuffer = device.createBuffer({
            size: paramsSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // Readback staging buffer
        this.particleReadBuffer = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        // Shader module
        const shaderModule = device.createShaderModule({
            label: 'VIB3 Particle Compute',
            code: PARTICLE_COMPUTE_WGSL
        });

        // Bind group layout
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'uniform' }
                }
            ]
        });

        // Pipeline
        this.particlePipeline = device.createComputePipeline({
            label: 'VIB3 Particle Pipeline',
            layout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            }),
            compute: {
                module: shaderModule,
                entryPoint: 'main'
            }
        });

        // Bind group
        this.particleBindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.particleBuffer } },
                { binding: 1, resource: { buffer: this.particleParamsBuffer } }
            ]
        });
    }

    /**
     * Dispatch the particle compute shader to update all particle positions.
     *
     * @param {Object} params - VIB3 parameter state
     * @param {number} params.time - Current time in seconds
     * @param {number} params.deltaTime - Frame delta in seconds
     * @param {number} [params.rotXY=0] - XY rotation (radians)
     * @param {number} [params.rotXZ=0] - XZ rotation
     * @param {number} [params.rotYZ=0] - YZ rotation
     * @param {number} [params.rotXW=0] - XW rotation
     * @param {number} [params.rotYW=0] - YW rotation
     * @param {number} [params.rotZW=0] - ZW rotation
     * @param {number} [params.geometry=0] - Geometry index (0-23)
     * @param {number} [params.gridDensity=20] - Grid density
     * @param {number} [params.morphFactor=0] - Morph factor
     * @param {number} [params.chaos=0] - Chaos amount
     * @param {number} [params.speed=1] - Animation speed
     * @param {number} [params.hue=180] - Color hue
     * @param {number} [params.intensity=0.5] - Intensity
     * @param {number} [params.dimension=4.0] - Projection dimension
     * @param {number} [params.bass=0] - Audio bass level
     * @param {number} [params.mid=0] - Audio mid level
     * @param {number} [params.high=0] - Audio high level
     */
    updateParticles(params) {
        if (!this._initialized || !this.device) return;

        // Pack params into Float32Array matching the Params struct layout
        const data = new Float32Array(32); // 128 bytes / 4
        data[0]  = params.time || 0;
        data[1]  = params.deltaTime || 0.016;
        // u32 particleCount at byte offset 8 -- use DataView
        const dv = new DataView(data.buffer);
        dv.setUint32(8, this.particleCount, true);
        data[3]  = 0; // _pad0

        data[4]  = params.rotXY || 0;
        data[5]  = params.rotXZ || 0;
        data[6]  = params.rotYZ || 0;
        data[7]  = 0; // _pad1

        data[8]  = params.rotXW || 0;
        data[9]  = params.rotYW || 0;
        data[10] = params.rotZW || 0;
        data[11] = 0; // _pad2

        data[12] = params.geometry || 0;
        data[13] = params.gridDensity || 20;
        data[14] = params.morphFactor || 0;
        data[15] = params.chaos || 0;

        data[16] = params.speed || 1;
        data[17] = params.hue || 180;
        data[18] = params.intensity || 0.5;
        data[19] = params.dimension || 4.0;

        data[20] = params.bass || 0;
        data[21] = params.mid || 0;
        data[22] = params.high || 0;
        data[23] = 0; // _pad3

        this.device.queue.writeBuffer(this.particleParamsBuffer, 0, data);

        // Dispatch
        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.particlePipeline);
        pass.setBindGroup(0, this.particleBindGroup);

        const workgroupSize = 256;
        const workgroupCount = Math.ceil(this.particleCount / workgroupSize);
        pass.dispatchWorkgroups(workgroupCount);
        pass.end();

        this.device.queue.submit([encoder.finish()]);
    }

    /**
     * Read back particle data from the GPU.
     * Returns a Float32Array of all particle data (position, velocity, life, phase).
     *
     * @returns {Promise<Float32Array>} Particle data array
     */
    async getParticleData() {
        if (!this._initialized || !this.device) {
            return new Float32Array(0);
        }

        const totalBytes = this.particleCount * this.particleStride * 4;

        const encoder = this.device.createCommandEncoder();
        encoder.copyBufferToBuffer(
            this.particleBuffer, 0,
            this.particleReadBuffer, 0,
            totalBytes
        );
        this.device.queue.submit([encoder.finish()]);

        await this.particleReadBuffer.mapAsync(GPUMapMode.READ);
        const data = new Float32Array(this.particleReadBuffer.getMappedRange().slice(0));
        this.particleReadBuffer.unmap();

        return data;
    }

    /**
     * Get the GPU particle buffer directly for use in a render pipeline
     * (zero-copy path).
     * @returns {GPUBuffer|null}
     */
    getParticleBuffer() {
        return this.particleBuffer;
    }

    // -----------------------------------------------------------------------
    //  Audio FFT
    // -----------------------------------------------------------------------

    /**
     * Return the WGSL source for the FFT compute shader.
     * @returns {string}
     */
    createFFTComputeShader() {
        return FFT_COMPUTE_WGSL;
    }

    /**
     * Build FFT compute pipelines and allocate GPU buffers.
     * @private
     */
    _createFFTPipeline() {
        const device = this.device;
        const N = this.fftSize;

        // Input buffer (time-domain samples)
        this.fftInputBuffer = device.createBuffer({
            size: N * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        // Work buffer: N real + N imag + 1 stage index = (2N + 1) floats
        const workSize = (2 * N + 4) * 4; // +4 for alignment
        this.fftWorkBuffer = device.createBuffer({
            size: workSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        // Output bands buffer
        this.fftBandsBuffer = device.createBuffer({
            size: this.bandCount * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        // Read buffer for bands
        this.fftReadBuffer = device.createBuffer({
            size: this.bandCount * 4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        // Params uniform
        this.fftParamsBuffer = device.createBuffer({
            size: 16, // FFTParams struct
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // Write FFT params
        const fftParamsData = new ArrayBuffer(16);
        const fftParamsDV = new DataView(fftParamsData);
        fftParamsDV.setUint32(0, N, true);           // sampleCount
        fftParamsDV.setUint32(4, this.bandCount, true); // bandCount
        fftParamsDV.setFloat32(8, 44100.0, true);    // sampleRate
        fftParamsDV.setFloat32(12, 0.0, true);       // _pad
        device.queue.writeBuffer(this.fftParamsBuffer, 0, fftParamsData);

        // Shader module
        const shaderModule = device.createShaderModule({
            label: 'VIB3 FFT Compute',
            code: FFT_COMPUTE_WGSL
        });

        // Bind group layout (shared for all 3 entry points)
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
            ]
        });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        // Three pipelines for three entry points
        this.fftBitReversePipeline = device.createComputePipeline({
            label: 'VIB3 FFT BitReverse',
            layout: pipelineLayout,
            compute: { module: shaderModule, entryPoint: 'fftBitReverse' }
        });

        this.fftButterflyPipeline = device.createComputePipeline({
            label: 'VIB3 FFT Butterfly',
            layout: pipelineLayout,
            compute: { module: shaderModule, entryPoint: 'fftButterfly' }
        });

        this.fftBandsPipeline = device.createComputePipeline({
            label: 'VIB3 FFT Bands',
            layout: pipelineLayout,
            compute: { module: shaderModule, entryPoint: 'fftBands' }
        });

        // Bind group
        this.fftBindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.fftInputBuffer } },
                { binding: 1, resource: { buffer: this.fftWorkBuffer } },
                { binding: 2, resource: { buffer: this.fftBandsBuffer } },
                { binding: 3, resource: { buffer: this.fftParamsBuffer } }
            ]
        });
    }

    /**
     * Process time-domain audio data through the GPU FFT pipeline.
     *
     * @param {Float32Array} audioData - Time-domain audio samples (length should equal fftSize)
     * @returns {Promise<{bands: Float32Array, bass: number, mid: number, high: number}>}
     */
    async processAudioFFT(audioData) {
        if (!this._initialized || !this.device) {
            return { bands: new Float32Array(this.bandCount), bass: 0, mid: 0, high: 0 };
        }

        const N = this.fftSize;

        // Pad or truncate input to fftSize
        let input = audioData;
        if (audioData.length !== N) {
            input = new Float32Array(N);
            input.set(audioData.subarray(0, Math.min(audioData.length, N)));
        }

        // Upload audio data
        this.device.queue.writeBuffer(this.fftInputBuffer, 0, input);

        const encoder = this.device.createCommandEncoder();

        // Pass 1: Bit-reverse copy with windowing
        {
            const pass = encoder.beginComputePass();
            pass.setPipeline(this.fftBitReversePipeline);
            pass.setBindGroup(0, this.fftBindGroup);
            pass.dispatchWorkgroups(Math.ceil(N / 256));
            pass.end();
        }

        // Pass 2..log2(N): Butterfly stages
        const numStages = Math.log2(N);
        for (let stage = 0; stage < numStages; stage++) {
            // Write stage index into the reserved slot in fftWorkBuffer
            const stageData = new Float32Array([stage]);
            this.device.queue.writeBuffer(this.fftWorkBuffer, 2 * N * 4, stageData);

            // Submit the pending commands so the stage index write is visible
            this.device.queue.submit([encoder.finish()]);

            const stageEncoder = this.device.createCommandEncoder();
            const pass = stageEncoder.beginComputePass();
            pass.setPipeline(this.fftButterflyPipeline);
            pass.setBindGroup(0, this.fftBindGroup);
            pass.dispatchWorkgroups(Math.ceil(N / 2 / 256));
            pass.end();

            // Use stageEncoder for next iteration or final steps
            if (stage < numStages - 1) {
                this.device.queue.submit([stageEncoder.finish()]);
            } else {
                // Last stage -- continue to band computation
                const bandsPass = stageEncoder.beginComputePass();
                bandsPass.setPipeline(this.fftBandsPipeline);
                bandsPass.setBindGroup(0, this.fftBindGroup);
                bandsPass.dispatchWorkgroups(Math.ceil(this.bandCount / 32));
                bandsPass.end();

                // Copy bands to readback buffer
                stageEncoder.copyBufferToBuffer(
                    this.fftBandsBuffer, 0,
                    this.fftReadBuffer, 0,
                    this.bandCount * 4
                );

                this.device.queue.submit([stageEncoder.finish()]);
            }
        }

        // Read back bands
        await this.fftReadBuffer.mapAsync(GPUMapMode.READ);
        const bandsData = new Float32Array(this.fftReadBuffer.getMappedRange().slice(0));
        this.fftReadBuffer.unmap();

        // Derive bass / mid / high from bands
        // bass: bands 0-7, mid: bands 8-19, high: bands 20-31
        const bassEnd = Math.floor(this.bandCount * 0.25);
        const midEnd = Math.floor(this.bandCount * 0.625);

        let bass = 0, mid = 0, high = 0;
        for (let i = 0; i < this.bandCount; i++) {
            if (i < bassEnd) {
                bass += bandsData[i];
            } else if (i < midEnd) {
                mid += bandsData[i];
            } else {
                high += bandsData[i];
            }
        }

        bass /= bassEnd || 1;
        mid /= (midEnd - bassEnd) || 1;
        high /= (this.bandCount - midEnd) || 1;

        return { bands: bandsData, bass, mid, high };
    }

    // -----------------------------------------------------------------------
    //  Cleanup
    // -----------------------------------------------------------------------

    /**
     * Release all GPU resources.
     */
    dispose() {
        const buffers = [
            this.particleBuffer,
            this.particleParamsBuffer,
            this.particleReadBuffer,
            this.fftInputBuffer,
            this.fftWorkBuffer,
            this.fftBandsBuffer,
            this.fftParamsBuffer,
            this.fftReadBuffer
        ];

        for (const buf of buffers) {
            if (buf) {
                try {
                    buf.destroy();
                } catch (_e) {
                    // Buffer may already be destroyed
                }
            }
        }

        this.particleBuffer = null;
        this.particleParamsBuffer = null;
        this.particleReadBuffer = null;
        this.fftInputBuffer = null;
        this.fftWorkBuffer = null;
        this.fftBandsBuffer = null;
        this.fftParamsBuffer = null;
        this.fftReadBuffer = null;

        this.particlePipeline = null;
        this.fftBitReversePipeline = null;
        this.fftButterflyPipeline = null;
        this.fftBandsPipeline = null;

        this.particleBindGroup = null;
        this.fftBindGroup = null;

        this.device = null;
        this.adapter = null;
        this._initialized = false;
    }
}
