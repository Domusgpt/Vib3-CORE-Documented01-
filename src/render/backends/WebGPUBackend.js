/**
 * WebGPUBackend - WebGPU rendering backend for VIB3+ engine
 *
 * Features:
 * - Device/context initialization with feature detection
 * - Canvas configuration + resize handling
 * - Shader pipeline management (custom WGSL compilation)
 * - Uniform buffer handling (custom layouts)
 * - Fullscreen quad procedural rendering (core VIB3+ pattern)
 * - Multi-pipeline support with named pipelines
 * - Texture creation and binding
 * - Render state management
 */

import { RenderResourceRegistry } from '../RenderResourceRegistry.js';

/**
 * Default vertex shader for geometry rendering
 */
const DEFAULT_VERTEX_SHADER = /* wgsl */`
struct Uniforms {
    modelMatrix: mat4x4<f32>,
    viewMatrix: mat4x4<f32>,
    projectionMatrix: mat4x4<f32>,
    time: f32,
    dimension: f32,
    _padding: vec2<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec4<f32>,
    @location(1) color: vec4<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) worldPos: vec3<f32>,
};

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    // Apply 4D to 3D projection based on dimension parameter
    let w = input.position.w;
    let projectionFactor = 1.0 / (uniforms.dimension - w);
    let projected = vec4<f32>(
        input.position.x * projectionFactor,
        input.position.y * projectionFactor,
        input.position.z * projectionFactor,
        1.0
    );

    // Apply model-view-projection
    let worldPos = uniforms.modelMatrix * projected;
    let viewPos = uniforms.viewMatrix * worldPos;
    output.position = uniforms.projectionMatrix * viewPos;
    output.worldPos = worldPos.xyz;
    output.color = input.color;

    return output;
}
`;

/**
 * Default fragment shader for geometry rendering
 */
const DEFAULT_FRAGMENT_SHADER = /* wgsl */`
struct FragmentInput {
    @location(0) color: vec4<f32>,
    @location(1) worldPos: vec3<f32>,
};

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    // Add subtle depth-based shading
    let depth = clamp(length(input.worldPos) * 0.2, 0.0, 1.0);
    let shaded = input.color.rgb * (1.0 - depth * 0.3);

    return vec4<f32>(shaded, input.color.a);
}
`;

/**
 * Fullscreen quad vertex shader for procedural rendering.
 * Generates a fullscreen triangle (3 vertices, no vertex buffer needed).
 */
const FULLSCREEN_VERTEX_SHADER = /* wgsl */`
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var output: VertexOutput;

    // Generate fullscreen triangle (covers entire screen with 3 vertices)
    // Uses the oversized triangle technique - no vertex buffer needed
    let x = f32(i32(vertexIndex & 1u) * 4 - 1);
    let y = f32(i32(vertexIndex >> 1u) * 4 - 1);
    output.position = vec4<f32>(x, y, 0.0, 1.0);
    output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);

    return output;
}
`;

/**
 * VIB3+ standard uniform struct for procedural shaders (WGSL).
 * Matches the GLSL uniforms used in Quantum/Faceted/Holographic systems.
 */
const VIB3_UNIFORM_STRUCT = /* wgsl */`
struct VIB3Uniforms {
    // Time and resolution
    time: f32,
    _pad0: f32,
    resolution: vec2<f32>,

    // Geometry selection (0-23)
    geometry: f32,

    // 6D Rotation (radians)
    rot4dXY: f32,
    rot4dXZ: f32,
    rot4dYZ: f32,
    rot4dXW: f32,
    rot4dYW: f32,
    rot4dZW: f32,

    // Visual parameters
    dimension: f32,
    gridDensity: f32,
    morphFactor: f32,
    chaos: f32,
    speed: f32,
    hue: f32,
    intensity: f32,
    saturation: f32,

    // Reactivity
    mouseIntensity: f32,
    clickIntensity: f32,
    bass: f32,
    mid: f32,
    high: f32,

    // Layer parameters (for holographic multi-layer)
    layerScale: f32,
    layerOpacity: f32,
    _pad1: f32,
    layerColor: vec3<f32>,
    densityMult: f32,
    speedMult: f32,
    _pad2: vec3<f32>,
};
`;

/**
 * VIB3+ 4D rotation functions in WGSL
 */
const VIB3_ROTATION_WGSL = /* wgsl */`
fn rotateXY(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, -s, 0.0, 0.0),
        vec4<f32>(s, c, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 1.0, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0)
    );
}

fn rotateXZ(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, 0.0, -s, 0.0),
        vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(s, 0.0, c, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0)
    );
}

fn rotateYZ(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0),
        vec4<f32>(0.0, c, -s, 0.0),
        vec4<f32>(0.0, s, c, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0)
    );
}

fn rotateXW(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, 0.0, 0.0, -s),
        vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 1.0, 0.0),
        vec4<f32>(s, 0.0, 0.0, c)
    );
}

fn rotateYW(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0),
        vec4<f32>(0.0, c, 0.0, -s),
        vec4<f32>(0.0, 0.0, 1.0, 0.0),
        vec4<f32>(0.0, s, 0.0, c)
    );
}

fn rotateZW(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0),
        vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, c, -s),
        vec4<f32>(0.0, 0.0, s, c)
    );
}

fn apply6DRotation(pos: vec4<f32>, u: VIB3Uniforms) -> vec4<f32> {
    var p = pos;
    p = rotateXY(u.rot4dXY) * p;
    p = rotateXZ(u.rot4dXZ) * p;
    p = rotateYZ(u.rot4dYZ) * p;
    p = rotateXW(u.rot4dXW) * p;
    p = rotateYW(u.rot4dYW) * p;
    p = rotateZW(u.rot4dZW) * p;
    return p;
}
`;

/**
 * WebGPU feature flags
 */
export const WebGPUFeatures = {
    TIMESTAMP_QUERY: 'timestamp-query',
    INDIRECT_FIRST_INSTANCE: 'indirect-first-instance',
    SHADER_F16: 'shader-f16',
    DEPTH_CLIP_CONTROL: 'depth-clip-control',
    DEPTH32_STENCIL8: 'depth32float-stencil8',
    TEXTURE_COMPRESSION_BC: 'texture-compression-bc',
    RG11B10_UFLOAT_RENDERABLE: 'rg11b10ufloat-renderable',
    BGRA8_UNORM_STORAGE: 'bgra8unorm-storage'
};

/**
 * WGSL shader library for VIB3+ systems
 */
export const WGSLShaderLib = {
    uniformStruct: VIB3_UNIFORM_STRUCT,
    rotation4D: VIB3_ROTATION_WGSL,
    fullscreenVertex: FULLSCREEN_VERTEX_SHADER
};

export class WebGPUBackend {
    /**
     * @param {object} params
     * @param {HTMLCanvasElement} params.canvas
     * @param {GPUDevice} params.device
     * @param {GPUCanvasContext} params.context
     * @param {GPUTextureFormat} params.format
     * @param {GPUAdapter} [params.adapter]
     * @param {object} [options]
     */
    constructor({ canvas, device, context, format, adapter }, options = {}) {
        this.canvas = canvas;
        this.device = device;
        this.context = context;
        this.format = format;
        this.adapter = adapter || null;

        this.debug = options.debug || false;
        this.depthEnabled = options.depth !== false;
        this._resources = options.resourceRegistry || new RenderResourceRegistry();

        /** @type {GPUTexture|null} */
        this._depthTexture = null;

        /** @type {Map<string, GPURenderPipeline>} */
        this._pipelines = new Map();

        /** @type {Map<string, GPUShaderModule>} */
        this._shaderModules = new Map();

        /** @type {GPUBuffer|null} - Default geometry uniform buffer */
        this._uniformBuffer = null;

        /** @type {GPUBindGroup|null} */
        this._uniformBindGroup = null;

        /** @type {GPUBindGroupLayout|null} */
        this._uniformBindGroupLayout = null;

        /** @type {Map<string, {buffer: GPUBuffer, bindGroup: GPUBindGroup, layout: GPUBindGroupLayout}>} */
        this._customUniformBuffers = new Map();

        /** @type {Map<string, GPUTexture>} */
        this._textures = new Map();

        /** @type {Map<string, GPUSampler>} */
        this._samplers = new Map();

        /** @type {Set<string>} */
        this._enabledFeatures = new Set(options.features || []);

        this._stats = {
            frames: 0,
            commandEncoders: 0,
            drawCalls: 0,
            triangles: 0,
            pipelineChanges: 0
        };

        // Initialize uniform buffer
        this._initUniformBuffer();

        // Create default pipeline
        this._createDefaultPipeline();

        this.resize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height);
    }

    // ========================================================================
    // Feature Detection
    // ========================================================================

    /**
     * Check if a feature is supported
     * @param {string} feature
     * @returns {boolean}
     */
    hasFeature(feature) {
        return this._enabledFeatures.has(feature);
    }

    /**
     * Get GPU info
     * @returns {object}
     */
    getGPUInfo() {
        if (!this.adapter) return { vendor: 'unknown', architecture: 'unknown' };

        return {
            vendor: this.adapter.info?.vendor || 'unknown',
            architecture: this.adapter.info?.architecture || 'unknown',
            device: this.adapter.info?.device || 'unknown',
            description: this.adapter.info?.description || 'unknown',
            features: Array.from(this._enabledFeatures)
        };
    }

    // ========================================================================
    // Uniform Buffer Management
    // ========================================================================

    /**
     * Initialize default uniform buffer (geometry rendering)
     * @private
     */
    _initUniformBuffer() {
        const uniformBufferSize = 256;

        this._uniformBuffer = this.device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this._resources.register('buffer', this._uniformBuffer);

        this._uniformBindGroupLayout = this.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: 'uniform' }
            }]
        });

        this._uniformBindGroup = this.device.createBindGroup({
            layout: this._uniformBindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: this._uniformBuffer }
            }]
        });
    }

    /**
     * Create a custom uniform buffer with its own bind group.
     * Used for VIB3+ procedural shader uniforms.
     * @param {string} name - Unique name for the buffer
     * @param {number} size - Buffer size in bytes (will be aligned to 256)
     * @param {number} [visibility] - Shader stage visibility
     * @returns {{buffer: GPUBuffer, bindGroup: GPUBindGroup, layout: GPUBindGroupLayout}}
     */
    createCustomUniformBuffer(name, size, visibility) {
        const vis = visibility ??
            (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT);

        // Align to 256 bytes for WebGPU requirements
        const alignedSize = Math.ceil(size / 256) * 256;

        const buffer = this.device.createBuffer({
            size: alignedSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this._resources.register('buffer', buffer);

        const layout = this.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: vis,
                buffer: { type: 'uniform' }
            }]
        });

        const bindGroup = this.device.createBindGroup({
            layout,
            entries: [{
                binding: 0,
                resource: { buffer }
            }]
        });

        const entry = { buffer, bindGroup, layout };
        this._customUniformBuffers.set(name, entry);
        return entry;
    }

    /**
     * Update a custom uniform buffer with Float32Array data
     * @param {string} name - Buffer name
     * @param {Float32Array} data - Data to write
     */
    updateCustomUniforms(name, data) {
        const entry = this._customUniformBuffers.get(name);
        if (!entry) {
            if (this.debug) {
                console.warn(`Custom uniform buffer "${name}" not found`);
            }
            return;
        }
        this.device.queue.writeBuffer(entry.buffer, 0, data);
    }

    /**
     * Get a custom uniform buffer entry
     * @param {string} name
     * @returns {{buffer: GPUBuffer, bindGroup: GPUBindGroup, layout: GPUBindGroupLayout}|undefined}
     */
    getCustomUniformBuffer(name) {
        return this._customUniformBuffers.get(name);
    }

    /**
     * Update default uniform buffer with current state
     * @param {object} uniforms
     */
    updateUniforms(uniforms) {
        const data = new Float32Array(64); // 256 bytes / 4

        const model = uniforms.modelMatrix || [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
        data.set(model, 0);

        const view = uniforms.viewMatrix || [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-3,1];
        data.set(view, 16);

        const proj = uniforms.projectionMatrix || this._createProjectionMatrix();
        data.set(proj, 32);

        data[48] = uniforms.time || 0;
        data[49] = uniforms.dimension || 3.5;

        this.device.queue.writeBuffer(this._uniformBuffer, 0, data);
    }

    /**
     * Create perspective projection matrix
     * @private
     */
    _createProjectionMatrix() {
        const fov = Math.PI / 4;
        const aspect = this.canvas.width / this.canvas.height;
        const near = 0.1;
        const far = 100;

        const f = 1.0 / Math.tan(fov / 2);
        const rangeInv = 1 / (near - far);

        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ];
    }

    // ========================================================================
    // Shader & Pipeline Management
    // ========================================================================

    /**
     * Compile a WGSL shader module from source code
     * @param {string} name - Unique shader name
     * @param {string} code - WGSL source code
     * @returns {GPUShaderModule}
     */
    compileShader(name, code) {
        const module = this.device.createShaderModule({
            code,
            label: name
        });
        this._shaderModules.set(name, module);
        return module;
    }

    /**
     * Get or create shader module
     * @param {string} name
     * @param {string} code
     * @returns {GPUShaderModule}
     */
    _getOrCreateShaderModule(name, code) {
        if (this._shaderModules.has(name)) {
            return this._shaderModules.get(name);
        }
        return this.compileShader(name, code);
    }

    /**
     * Create a fullscreen quad pipeline for procedural fragment rendering.
     * This is the core rendering pattern for all VIB3+ visualization systems.
     *
     * @param {string} name - Pipeline name
     * @param {string} fragmentCode - WGSL fragment shader code
     * @param {object} [options]
     * @param {string} [options.vertexCode] - Custom vertex shader (defaults to fullscreen quad)
     * @param {GPUBindGroupLayout[]} [options.bindGroupLayouts] - Custom bind group layouts
     * @param {object} [options.blend] - Custom blend state
     * @param {boolean} [options.depth] - Enable depth testing
     * @returns {GPURenderPipeline}
     */
    createFullscreenPipeline(name, fragmentCode, options = {}) {
        const vertexCode = options.vertexCode || FULLSCREEN_VERTEX_SHADER;
        const vertexModule = this._getOrCreateShaderModule(
            `${name}-vertex`, vertexCode
        );
        const fragmentModule = this._getOrCreateShaderModule(
            `${name}-fragment`, fragmentCode
        );

        // Use provided layouts or default to the standard uniform layout
        const bindGroupLayouts = options.bindGroupLayouts ||
            [this._uniformBindGroupLayout];

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts
        });

        const blend = options.blend || {
            color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
            },
            alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
            }
        };

        const useDepth = options.depth !== undefined ? options.depth : false;

        const pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: vertexModule,
                entryPoint: 'main',
                // No vertex buffers - fullscreen triangle uses vertex_index
            },
            fragment: {
                module: fragmentModule,
                entryPoint: 'main',
                targets: [{
                    format: this.format,
                    blend
                }]
            },
            primitive: {
                topology: 'triangle-list'
            },
            depthStencil: useDepth ? {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            } : undefined
        });

        this._pipelines.set(name, pipeline);
        return pipeline;
    }

    /**
     * Create a custom render pipeline with vertex buffers (for geometry rendering)
     * @param {string} name - Pipeline name
     * @param {object} desc - Pipeline descriptor
     * @param {string} desc.vertexCode - WGSL vertex shader
     * @param {string} desc.fragmentCode - WGSL fragment shader
     * @param {GPUVertexBufferLayout[]} [desc.vertexBuffers] - Vertex buffer layouts
     * @param {GPUBindGroupLayout[]} [desc.bindGroupLayouts]
     * @param {object} [desc.blend]
     * @param {string} [desc.topology]
     * @param {boolean} [desc.depth]
     * @returns {GPURenderPipeline}
     */
    createPipeline(name, desc) {
        const vertexModule = this._getOrCreateShaderModule(
            `${name}-vertex`, desc.vertexCode
        );
        const fragmentModule = this._getOrCreateShaderModule(
            `${name}-fragment`, desc.fragmentCode
        );

        const bindGroupLayouts = desc.bindGroupLayouts ||
            [this._uniformBindGroupLayout];

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts
        });

        const blend = desc.blend || {
            color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
            },
            alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
            }
        };

        const pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: vertexModule,
                entryPoint: 'main',
                buffers: desc.vertexBuffers || [{
                    arrayStride: 32,
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x4' },
                        { shaderLocation: 1, offset: 16, format: 'float32x4' }
                    ]
                }]
            },
            fragment: {
                module: fragmentModule,
                entryPoint: 'main',
                targets: [{
                    format: this.format,
                    blend
                }]
            },
            primitive: {
                topology: desc.topology || 'triangle-list',
                cullMode: desc.cullMode || 'none',
                frontFace: 'ccw'
            },
            depthStencil: (desc.depth !== false && this.depthEnabled) ? {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            } : undefined
        });

        this._pipelines.set(name, pipeline);
        return pipeline;
    }

    /**
     * Get a named pipeline
     * @param {string} name
     * @returns {GPURenderPipeline|undefined}
     */
    getPipeline(name) {
        return this._pipelines.get(name);
    }

    /**
     * Create default rendering pipeline
     * @private
     */
    _createDefaultPipeline() {
        const vertexModule = this._getOrCreateShaderModule('default-vertex', DEFAULT_VERTEX_SHADER);
        const fragmentModule = this._getOrCreateShaderModule('default-fragment', DEFAULT_FRAGMENT_SHADER);

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this._uniformBindGroupLayout]
        });

        const pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: vertexModule,
                entryPoint: 'main',
                buffers: [{
                    arrayStride: 32,
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x4' },
                        { shaderLocation: 1, offset: 16, format: 'float32x4' }
                    ]
                }]
            },
            fragment: {
                module: fragmentModule,
                entryPoint: 'main',
                targets: [{
                    format: this.format,
                    blend: {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        }
                    }
                }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back',
                frontFace: 'ccw'
            },
            depthStencil: this.depthEnabled ? {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            } : undefined
        });

        this._pipelines.set('default', pipeline);
    }

    // ========================================================================
    // Texture Management
    // ========================================================================

    /**
     * Create a 2D texture
     * @param {string} name
     * @param {object} desc
     * @param {number} desc.width
     * @param {number} desc.height
     * @param {string} [desc.format]
     * @param {number} [desc.usage]
     * @returns {GPUTexture}
     */
    createTexture(name, desc) {
        const texture = this.device.createTexture({
            size: { width: desc.width, height: desc.height },
            format: desc.format || 'rgba8unorm',
            usage: desc.usage || (
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT
            )
        });

        this._resources.register('texture', texture);
        this._textures.set(name, texture);
        return texture;
    }

    /**
     * Create a sampler
     * @param {string} name
     * @param {object} [desc]
     * @returns {GPUSampler}
     */
    createSampler(name, desc = {}) {
        const sampler = this.device.createSampler({
            magFilter: desc.magFilter || 'linear',
            minFilter: desc.minFilter || 'linear',
            mipmapFilter: desc.mipmapFilter || 'linear',
            addressModeU: desc.addressModeU || 'clamp-to-edge',
            addressModeV: desc.addressModeV || 'clamp-to-edge'
        });

        this._samplers.set(name, sampler);
        return sampler;
    }

    /**
     * Get a texture by name
     * @param {string} name
     * @returns {GPUTexture|undefined}
     */
    getTexture(name) {
        return this._textures.get(name);
    }

    /**
     * Get a sampler by name
     * @param {string} name
     * @returns {GPUSampler|undefined}
     */
    getSampler(name) {
        return this._samplers.get(name);
    }

    // ========================================================================
    // Canvas / Resize
    // ========================================================================

    /**
     * Resize the canvas and recreate depth resources if enabled.
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        const clampedWidth = Math.max(1, Math.floor(width));
        const clampedHeight = Math.max(1, Math.floor(height));

        this.canvas.width = clampedWidth;
        this.canvas.height = clampedHeight;

        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: 'premultiplied'
        });

        if (this.depthEnabled) {
            this._destroyDepthTexture();
            this._depthTexture = this.device.createTexture({
                size: { width: clampedWidth, height: clampedHeight, depthOrArrayLayers: 1 },
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
            this._resources.register('texture', this._depthTexture);
        }
    }

    // ========================================================================
    // Buffer Creation
    // ========================================================================

    /**
     * Create a vertex buffer from geometry data
     * @param {Float32Array} data - Interleaved vertex data
     * @returns {GPUBuffer}
     */
    createVertexBuffer(data) {
        const buffer = this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        new Float32Array(buffer.getMappedRange()).set(data);
        buffer.unmap();

        this._resources.register('buffer', buffer);
        return buffer;
    }

    /**
     * Create an index buffer
     * @param {Uint16Array|Uint32Array} data
     * @returns {GPUBuffer}
     */
    createIndexBuffer(data) {
        const buffer = this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        if (data instanceof Uint16Array) {
            new Uint16Array(buffer.getMappedRange()).set(data);
        } else {
            new Uint32Array(buffer.getMappedRange()).set(data);
        }
        buffer.unmap();

        this._resources.register('buffer', buffer);
        return buffer;
    }

    // ========================================================================
    // Rendering - Fullscreen Quad (VIB3+ Procedural)
    // ========================================================================

    /**
     * Render a fullscreen quad using a named pipeline.
     * This is the primary rendering method for VIB3+ procedural visualization.
     *
     * @param {object} options
     * @param {string} options.pipeline - Pipeline name (created via createFullscreenPipeline)
     * @param {GPUBindGroup[]} [options.bindGroups] - Bind groups to set
     * @param {number[]} [options.clearColor] - RGBA clear color (0-1)
     * @param {boolean} [options.clear] - Whether to clear (default true)
     */
    renderFullscreenQuad(options) {
        const {
            pipeline: pipelineName,
            bindGroups = [],
            clearColor = [0, 0, 0, 1],
            clear = true
        } = options;

        const pipeline = this._pipelines.get(pipelineName);
        if (!pipeline) {
            if (this.debug) {
                console.warn(`Pipeline "${pipelineName}" not found`);
            }
            return;
        }

        const encoder = this.device.createCommandEncoder();
        this._stats.commandEncoders += 1;

        const colorView = this.context.getCurrentTexture().createView();

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: colorView,
                clearValue: {
                    r: clearColor[0],
                    g: clearColor[1],
                    b: clearColor[2],
                    a: clearColor[3]
                },
                loadOp: clear ? 'clear' : 'load',
                storeOp: 'store'
            }]
        });

        pass.setPipeline(pipeline);
        this._stats.pipelineChanges += 1;

        // Set bind groups
        for (let i = 0; i < bindGroups.length; i++) {
            pass.setBindGroup(i, bindGroups[i]);
        }

        // Draw fullscreen triangle (3 vertices, no vertex buffer)
        pass.draw(3);
        this._stats.drawCalls += 1;

        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this._stats.frames += 1;
    }

    // ========================================================================
    // Rendering - Geometry
    // ========================================================================

    /**
     * Render a single frame (clear-only pass by default).
     * @param {object} [options]
     * @param {number[]} [options.clearColor] - RGBA in 0-1
     */
    renderFrame(options = {}) {
        const clearColor = options.clearColor || [0, 0, 0, 1];
        const encoder = this.device.createCommandEncoder();
        this._stats.commandEncoders += 1;

        const colorView = this.context.getCurrentTexture().createView();
        const depthAttachment = this.depthEnabled && this._depthTexture
            ? {
                view: this._depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
            : undefined;

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: colorView,
                clearValue: { r: clearColor[0], g: clearColor[1], b: clearColor[2], a: clearColor[3] },
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: depthAttachment
        });
        pass.end();

        this.device.queue.submit([encoder.finish()]);
        this._stats.frames += 1;
    }

    /**
     * Render geometry with the default pipeline
     * @param {object} options
     * @param {GPUBuffer} options.vertexBuffer
     * @param {GPUBuffer} [options.indexBuffer]
     * @param {number} options.vertexCount
     * @param {number} [options.indexCount]
     * @param {object} [options.uniforms]
     * @param {number[]} [options.clearColor]
     */
    renderGeometry(options) {
        const {
            vertexBuffer,
            indexBuffer,
            vertexCount,
            indexCount,
            uniforms = {},
            clearColor = [0, 0, 0, 1]
        } = options;

        this.updateUniforms(uniforms);

        const encoder = this.device.createCommandEncoder();
        this._stats.commandEncoders += 1;

        const colorView = this.context.getCurrentTexture().createView();
        const depthAttachment = this.depthEnabled && this._depthTexture
            ? {
                view: this._depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
            : undefined;

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: colorView,
                clearValue: { r: clearColor[0], g: clearColor[1], b: clearColor[2], a: clearColor[3] },
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: depthAttachment
        });

        const pipeline = this._pipelines.get('default');
        pass.setPipeline(pipeline);
        this._stats.pipelineChanges += 1;

        pass.setBindGroup(0, this._uniformBindGroup);
        pass.setVertexBuffer(0, vertexBuffer);

        if (indexBuffer && indexCount) {
            pass.setIndexBuffer(indexBuffer, 'uint16');
            pass.drawIndexed(indexCount);
            this._stats.triangles += indexCount / 3;
        } else {
            pass.draw(vertexCount);
            this._stats.triangles += vertexCount / 3;
        }

        this._stats.drawCalls += 1;

        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this._stats.frames += 1;
    }

    /**
     * Render using a named pipeline with arbitrary vertex/index buffers
     * @param {object} options
     * @param {string} options.pipeline - Pipeline name
     * @param {GPUBuffer} options.vertexBuffer
     * @param {GPUBuffer} [options.indexBuffer]
     * @param {number} options.vertexCount
     * @param {number} [options.indexCount]
     * @param {GPUBindGroup[]} [options.bindGroups]
     * @param {number[]} [options.clearColor]
     * @param {boolean} [options.clear]
     */
    renderWithPipeline(options) {
        const {
            pipeline: pipelineName,
            vertexBuffer,
            indexBuffer,
            vertexCount,
            indexCount,
            bindGroups = [],
            clearColor = [0, 0, 0, 1],
            clear = true
        } = options;

        const pipeline = this._pipelines.get(pipelineName);
        if (!pipeline) {
            if (this.debug) {
                console.warn(`Pipeline "${pipelineName}" not found`);
            }
            return;
        }

        const encoder = this.device.createCommandEncoder();
        this._stats.commandEncoders += 1;

        const colorView = this.context.getCurrentTexture().createView();
        const depthAttachment = this.depthEnabled && this._depthTexture
            ? {
                view: this._depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: clear ? 'clear' : 'load',
                depthStoreOp: 'store'
            }
            : undefined;

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: colorView,
                clearValue: { r: clearColor[0], g: clearColor[1], b: clearColor[2], a: clearColor[3] },
                loadOp: clear ? 'clear' : 'load',
                storeOp: 'store'
            }],
            depthStencilAttachment: depthAttachment
        });

        pass.setPipeline(pipeline);
        this._stats.pipelineChanges += 1;

        for (let i = 0; i < bindGroups.length; i++) {
            pass.setBindGroup(i, bindGroups[i]);
        }

        pass.setVertexBuffer(0, vertexBuffer);

        if (indexBuffer && indexCount) {
            pass.setIndexBuffer(indexBuffer, 'uint16');
            pass.drawIndexed(indexCount);
            this._stats.triangles += indexCount / 3;
        } else {
            pass.draw(vertexCount);
            this._stats.triangles += vertexCount / 3;
        }

        this._stats.drawCalls += 1;

        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this._stats.frames += 1;
    }

    // ========================================================================
    // Manual Render Pass Control
    // ========================================================================

    /**
     * Begin a new render pass (for manual control)
     * @param {object} [options]
     * @returns {{encoder: GPUCommandEncoder, pass: GPURenderPassEncoder}}
     */
    beginRenderPass(options = {}) {
        const clearColor = options.clearColor || [0, 0, 0, 1];
        const encoder = this.device.createCommandEncoder();

        const colorView = this.context.getCurrentTexture().createView();
        const depthAttachment = this.depthEnabled && this._depthTexture
            ? {
                view: this._depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: options.loadDepth ? 'load' : 'clear',
                depthStoreOp: 'store'
            }
            : undefined;

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: colorView,
                clearValue: { r: clearColor[0], g: clearColor[1], b: clearColor[2], a: clearColor[3] },
                loadOp: options.loadColor ? 'load' : 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: depthAttachment
        });

        return { encoder, pass };
    }

    /**
     * End a render pass and submit
     * @param {GPUCommandEncoder} encoder
     * @param {GPURenderPassEncoder} pass
     */
    endRenderPass(encoder, pass) {
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        this._stats.frames += 1;
    }

    // ========================================================================
    // Statistics & Cleanup
    // ========================================================================

    /**
     * Return backend statistics.
     */
    getStats() {
        return {
            ...this._stats,
            resources: this._resources.getStats()
        };
    }

    /**
     * Reset per-frame statistics
     */
    resetFrameStats() {
        this._stats.drawCalls = 0;
        this._stats.triangles = 0;
        this._stats.pipelineChanges = 0;
    }

    /**
     * Dispose of GPU resources.
     */
    dispose() {
        this._destroyDepthTexture();

        // Destroy uniform buffers
        if (this._uniformBuffer) {
            this._uniformBuffer.destroy();
            this._uniformBuffer = null;
        }

        // Destroy custom uniform buffers
        for (const [, entry] of this._customUniformBuffers) {
            entry.buffer.destroy();
        }
        this._customUniformBuffers.clear();

        // Destroy textures
        for (const [, texture] of this._textures) {
            texture.destroy();
        }
        this._textures.clear();
        this._samplers.clear();

        // Clear pipelines and shaders
        this._pipelines.clear();
        this._shaderModules.clear();

        this._resources.disposeAll();
    }

    _destroyDepthTexture() {
        if (this._depthTexture) {
            this._resources.release('texture', this._depthTexture);
            this._depthTexture.destroy();
            this._depthTexture = null;
        }
    }
}

/**
 * Check if WebGPU is available
 * @returns {boolean}
 */
export function isWebGPUSupported() {
    return typeof navigator !== 'undefined' && !!navigator.gpu;
}

/**
 * Get available WebGPU features
 * @returns {Promise<Set<string>|null>}
 */
export async function getWebGPUFeatures() {
    if (!isWebGPUSupported()) return null;

    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return null;

        return new Set(adapter.features);
    } catch {
        return null;
    }
}

/**
 * Create a WebGPU backend (async).
 * @param {HTMLCanvasElement} canvas
 * @param {object} [options]
 * @param {string} [options.powerPreference] - 'high-performance' or 'low-power'
 * @param {string[]} [options.requiredFeatures] - Features to request
 * @param {boolean} [options.debug] - Enable debug mode
 * @param {boolean} [options.depth] - Enable depth buffer
 * @returns {Promise<WebGPUBackend|null>}
 */
export async function createWebGPUBackend(canvas, options = {}) {
    if (!canvas || !isWebGPUSupported()) {
        if (options.debug) {
            console.warn('WebGPU not supported');
        }
        return null;
    }

    const context = canvas.getContext('webgpu');
    if (!context) {
        if (options.debug) {
            console.warn('Could not get WebGPU context');
        }
        return null;
    }

    try {
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: options.powerPreference || 'high-performance'
        });

        if (!adapter) {
            if (options.debug) {
                console.warn('Could not get WebGPU adapter');
            }
            return null;
        }

        // Determine which features to request
        const availableFeatures = new Set(adapter.features);
        const requestedFeatures = [];

        const requiredFeatures = options.requiredFeatures || [];
        for (const feature of requiredFeatures) {
            if (availableFeatures.has(feature)) {
                requestedFeatures.push(feature);
            } else if (options.debug) {
                console.warn(`WebGPU feature not available: ${feature}`);
            }
        }

        const optionalFeatures = [
            WebGPUFeatures.TIMESTAMP_QUERY,
            WebGPUFeatures.INDIRECT_FIRST_INSTANCE
        ];

        for (const feature of optionalFeatures) {
            if (availableFeatures.has(feature) && !requestedFeatures.includes(feature)) {
                requestedFeatures.push(feature);
            }
        }

        const device = await adapter.requestDevice({
            requiredFeatures: requestedFeatures.length > 0 ? requestedFeatures : undefined
        });

        device.lost.then((info) => {
            console.error('WebGPU device lost:', info.reason, info.message);
        });

        if (options.debug) {
            device.onuncapturederror = (event) => {
                console.error('WebGPU error:', event.error.message);
            };
        }

        const format = navigator.gpu.getPreferredCanvasFormat();

        if (options.debug) {
            console.log('WebGPU initialized:', {
                vendor: adapter.info?.vendor,
                architecture: adapter.info?.architecture,
                format,
                features: requestedFeatures
            });
        }

        return new WebGPUBackend(
            { canvas, device, context, format, adapter },
            { ...options, features: requestedFeatures }
        );
    } catch (error) {
        if (options.debug) {
            console.error('WebGPU initialization failed:', error);
        }
        return null;
    }
}

/**
 * Create WebGPU backend with fallback to WebGL
 * @param {HTMLCanvasElement} canvas
 * @param {object} [options]
 * @returns {Promise<{backend: WebGPUBackend|null, type: 'webgpu'|'webgl'|null}>}
 */
export async function createWebGPUWithFallback(canvas, options = {}) {
    const webgpuBackend = await createWebGPUBackend(canvas, options);
    if (webgpuBackend) {
        return { backend: webgpuBackend, type: 'webgpu' };
    }

    return { backend: null, type: null };
}

export default WebGPUBackend;
