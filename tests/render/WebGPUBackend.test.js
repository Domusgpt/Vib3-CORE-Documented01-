/**
 * WebGPU Backend Tests
 * Tests for the WebGPU rendering backend: exports, constants, helper functions,
 * and backend class structure.
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';

// ========================================================================
// Setup WebGPU globals (browser-only APIs that don't exist in Node)
// ========================================================================

const GPUBufferUsage = {
    MAP_READ: 0x0001,
    MAP_WRITE: 0x0002,
    COPY_SRC: 0x0004,
    COPY_DST: 0x0008,
    INDEX: 0x0010,
    VERTEX: 0x0020,
    UNIFORM: 0x0040,
    STORAGE: 0x0080,
    INDIRECT: 0x0100,
    QUERY_RESOLVE: 0x0200,
};

const GPUShaderStage = {
    VERTEX: 0x1,
    FRAGMENT: 0x2,
    COMPUTE: 0x4,
};

const GPUTextureUsage = {
    COPY_SRC: 0x01,
    COPY_DST: 0x02,
    TEXTURE_BINDING: 0x04,
    STORAGE_BINDING: 0x08,
    RENDER_ATTACHMENT: 0x10,
};

// Install WebGPU globals before imports
globalThis.GPUBufferUsage = GPUBufferUsage;
globalThis.GPUShaderStage = GPUShaderStage;
globalThis.GPUTextureUsage = GPUTextureUsage;

// Now import after globals are set
const {
    WebGPUBackend,
    WebGPUFeatures,
    WGSLShaderLib,
    isWebGPUSupported,
    getWebGPUFeatures,
    createWebGPUBackend,
    createWebGPUWithFallback
} = await import('../../src/render/backends/WebGPUBackend.js');

// ========================================================================
// Mock Helpers
// ========================================================================

function createMockDevice() {
    const device = {
        createBuffer: vi.fn(() => ({
            size: 256,
            mapAsync: vi.fn(),
            getMappedRange: vi.fn(() => new ArrayBuffer(256)),
            unmap: vi.fn(),
            destroy: vi.fn()
        })),
        createShaderModule: vi.fn(() => ({
            getCompilationInfo: vi.fn(async () => ({ messages: [] }))
        })),
        createRenderPipeline: vi.fn(() => ({})),
        createPipelineLayout: vi.fn(() => ({})),
        createBindGroup: vi.fn(() => ({})),
        createBindGroupLayout: vi.fn(() => ({})),
        createCommandEncoder: vi.fn(() => ({
            beginRenderPass: vi.fn(() => ({
                setPipeline: vi.fn(),
                setBindGroup: vi.fn(),
                setVertexBuffer: vi.fn(),
                draw: vi.fn(),
                end: vi.fn()
            })),
            finish: vi.fn(() => ({}))
        })),
        createTexture: vi.fn(() => ({
            createView: vi.fn(() => ({})),
            destroy: vi.fn()
        })),
        createSampler: vi.fn(() => ({})),
        queue: {
            submit: vi.fn(),
            writeBuffer: vi.fn()
        },
        lost: new Promise(() => {}),
        destroy: vi.fn(),
        limits: {
            maxBufferSize: 268435456,
            maxUniformBufferBindingSize: 65536
        }
    };
    return device;
}

function createMockContext() {
    return {
        configure: vi.fn(),
        getCurrentTexture: vi.fn(() => ({
            createView: vi.fn(() => ({})),
            width: 800,
            height: 600,
            destroy: vi.fn()
        })),
        unconfigure: vi.fn()
    };
}

function createMockCanvas(width = 800, height = 600) {
    return {
        width,
        height,
        clientWidth: width,
        clientHeight: height,
        style: {},
        getContext: vi.fn((type) => {
            if (type === 'webgpu') return createMockContext();
            return null;
        })
    };
}

function createMockAdapter(features = []) {
    return {
        requestDevice: vi.fn(async () => createMockDevice()),
        features: new Set(features),
        info: {
            vendor: 'test-vendor',
            architecture: 'test-arch',
            device: 'test-device',
            description: 'Test GPU'
        }
    };
}

function createBackend(overrides = {}) {
    const mockDevice = createMockDevice();
    const mockContext = createMockContext();
    const mockCanvas = createMockCanvas();

    return new WebGPUBackend({
        canvas: overrides.canvas || mockCanvas,
        device: overrides.device || mockDevice,
        context: overrides.context || mockContext,
        format: overrides.format || 'bgra8unorm',
        adapter: 'adapter' in overrides ? overrides.adapter : createMockAdapter()
    }, overrides.options || { debug: false });
}

// ========================================================================
// Constants & Exports
// ========================================================================

describe('WebGPUBackend Exports', () => {
    it('should export WebGPUBackend class', () => {
        expect(WebGPUBackend).toBeDefined();
        expect(typeof WebGPUBackend).toBe('function');
    });

    it('should export WebGPUFeatures constants', () => {
        expect(WebGPUFeatures).toBeDefined();
        expect(WebGPUFeatures.TIMESTAMP_QUERY).toBe('timestamp-query');
        expect(WebGPUFeatures.INDIRECT_FIRST_INSTANCE).toBe('indirect-first-instance');
        expect(WebGPUFeatures.SHADER_F16).toBe('shader-f16');
        expect(WebGPUFeatures.DEPTH_CLIP_CONTROL).toBe('depth-clip-control');
        expect(WebGPUFeatures.DEPTH32_STENCIL8).toBe('depth32float-stencil8');
        expect(WebGPUFeatures.TEXTURE_COMPRESSION_BC).toBe('texture-compression-bc');
        expect(WebGPUFeatures.RG11B10_UFLOAT_RENDERABLE).toBe('rg11b10ufloat-renderable');
        expect(WebGPUFeatures.BGRA8_UNORM_STORAGE).toBe('bgra8unorm-storage');
    });

    it('should export helper functions', () => {
        expect(typeof isWebGPUSupported).toBe('function');
        expect(typeof getWebGPUFeatures).toBe('function');
        expect(typeof createWebGPUBackend).toBe('function');
        expect(typeof createWebGPUWithFallback).toBe('function');
    });
});

// ========================================================================
// WGSLShaderLib
// ========================================================================

describe('WGSLShaderLib', () => {
    it('should contain uniformStruct with VIB3 uniforms struct', () => {
        expect(WGSLShaderLib.uniformStruct).toBeDefined();
        expect(typeof WGSLShaderLib.uniformStruct).toBe('string');
        expect(WGSLShaderLib.uniformStruct).toContain('struct VIB3Uniforms');
        expect(WGSLShaderLib.uniformStruct).toContain('time');
        expect(WGSLShaderLib.uniformStruct).toContain('resolution');
        expect(WGSLShaderLib.uniformStruct).toContain('geometry');
    });

    it('should contain rotation4D WGSL functions', () => {
        expect(WGSLShaderLib.rotation4D).toBeDefined();
        expect(typeof WGSLShaderLib.rotation4D).toBe('string');
        // Should define rotation functions for 6 planes
        expect(WGSLShaderLib.rotation4D).toContain('apply6DRotation');
    });

    it('should contain fullscreenVertex shader', () => {
        expect(WGSLShaderLib.fullscreenVertex).toBeDefined();
        expect(typeof WGSLShaderLib.fullscreenVertex).toBe('string');
        expect(WGSLShaderLib.fullscreenVertex).toContain('@vertex');
        expect(WGSLShaderLib.fullscreenVertex).toContain('vertex_index');
    });
});

// ========================================================================
// Feature Detection Functions
// ========================================================================

describe('isWebGPUSupported', () => {
    let savedNavigator;

    beforeAll(() => {
        savedNavigator = globalThis.navigator;
    });

    afterAll(() => {
        Object.defineProperty(globalThis, 'navigator', {
            value: savedNavigator,
            configurable: true,
            writable: true
        });
    });

    it('should return false when navigator.gpu is missing', () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {},
            configurable: true,
            writable: true
        });
        expect(isWebGPUSupported()).toBe(false);
    });

    it('should return true when navigator.gpu exists', () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: { gpu: {} },
            configurable: true,
            writable: true
        });
        expect(isWebGPUSupported()).toBe(true);
    });
});

describe('getWebGPUFeatures', () => {
    let savedNavigator;

    beforeAll(() => {
        savedNavigator = globalThis.navigator;
    });

    afterAll(() => {
        Object.defineProperty(globalThis, 'navigator', {
            value: savedNavigator,
            configurable: true,
            writable: true
        });
    });

    it('should return null when WebGPU is not supported', async () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {},
            configurable: true,
            writable: true
        });
        const result = await getWebGPUFeatures();
        expect(result).toBeNull();
    });

    it('should return features when adapter is available', async () => {
        const featureSet = new Set(['timestamp-query']);
        Object.defineProperty(globalThis, 'navigator', {
            value: {
                gpu: {
                    requestAdapter: vi.fn(async () => ({
                        features: featureSet
                    }))
                }
            },
            configurable: true,
            writable: true
        });

        const result = await getWebGPUFeatures();
        expect(result).toEqual(featureSet);
    });

    it('should return null when adapter request fails', async () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {
                gpu: {
                    requestAdapter: vi.fn(async () => null)
                }
            },
            configurable: true,
            writable: true
        });

        const result = await getWebGPUFeatures();
        expect(result).toBeNull();
    });
});

// ========================================================================
// createWebGPUBackend
// ========================================================================

describe('createWebGPUBackend', () => {
    let savedNavigator;

    beforeAll(() => {
        savedNavigator = globalThis.navigator;
    });

    afterAll(() => {
        Object.defineProperty(globalThis, 'navigator', {
            value: savedNavigator,
            configurable: true,
            writable: true
        });
    });

    it('should return null when canvas is null', async () => {
        const result = await createWebGPUBackend(null);
        expect(result).toBeNull();
    });

    it('should return null when WebGPU is not supported', async () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {},
            configurable: true,
            writable: true
        });
        const canvas = createMockCanvas();
        const result = await createWebGPUBackend(canvas);
        expect(result).toBeNull();
    });

    it('should return null when WebGPU context unavailable', async () => {
        const canvas = createMockCanvas();
        canvas.getContext = vi.fn(() => null);

        Object.defineProperty(globalThis, 'navigator', {
            value: {
                gpu: {
                    requestAdapter: vi.fn(async () => createMockAdapter()),
                    getPreferredCanvasFormat: vi.fn(() => 'bgra8unorm')
                }
            },
            configurable: true,
            writable: true
        });

        const result = await createWebGPUBackend(canvas);
        expect(result).toBeNull();
    });
});

// ========================================================================
// createWebGPUWithFallback
// ========================================================================

describe('createWebGPUWithFallback', () => {
    let savedNavigator;

    beforeAll(() => {
        savedNavigator = globalThis.navigator;
    });

    afterAll(() => {
        Object.defineProperty(globalThis, 'navigator', {
            value: savedNavigator,
            configurable: true,
            writable: true
        });
    });

    it('should return null backend when WebGPU is not available', async () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {},
            configurable: true,
            writable: true
        });
        const canvas = createMockCanvas();
        const result = await createWebGPUWithFallback(canvas);
        expect(result).toEqual({ backend: null, type: null });
    });
});

// ========================================================================
// WebGPUBackend Class
// ========================================================================

describe('WebGPUBackend Class', () => {
    it('should store canvas, device, context, and format', () => {
        const backend = createBackend();
        expect(backend.canvas).toBeDefined();
        expect(backend.device).toBeDefined();
        expect(backend.context).toBeDefined();
        expect(backend.format).toBe('bgra8unorm');
    });

    describe('hasFeature', () => {
        it('should return false for features not enabled', () => {
            const backend = createBackend();
            expect(backend.hasFeature('timestamp-query')).toBe(false);
        });

        it('should return true for enabled features', () => {
            const backend = createBackend({ options: { features: ['timestamp-query'] } });
            expect(backend.hasFeature('timestamp-query')).toBe(true);
        });
    });

    describe('getGPUInfo', () => {
        it('should return adapter info when available', () => {
            const backend = createBackend();
            const info = backend.getGPUInfo();
            expect(info.vendor).toBe('test-vendor');
            expect(info.architecture).toBe('test-arch');
            expect(info.device).toBe('test-device');
        });

        it('should return unknown when no adapter', () => {
            const backend = createBackend({ adapter: null });
            const info = backend.getGPUInfo();
            expect(info.vendor).toBe('unknown');
        });
    });

    describe('getStats', () => {
        it('should return stats object', () => {
            const backend = createBackend();
            const stats = backend.getStats();
            expect(stats).toBeDefined();
            expect(typeof stats.frames).toBe('number');
            expect(typeof stats.drawCalls).toBe('number');
        });
    });

    describe('resize', () => {
        it('should reconfigure context on resize', () => {
            const backend = createBackend();
            backend.resize(1920, 1080);
            expect(backend.context.configure).toHaveBeenCalled();
        });
    });

    describe('compileShader', () => {
        it('should compile WGSL shader module', () => {
            const backend = createBackend();
            const result = backend.compileShader(
                'test-shader',
                '@vertex fn main() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }'
            );
            expect(backend.device.createShaderModule).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('createCustomUniformBuffer', () => {
        it('should create a named uniform buffer', () => {
            const backend = createBackend();
            backend.createCustomUniformBuffer('test-buffer', 256);
            const entry = backend.getCustomUniformBuffer('test-buffer');
            expect(entry).toBeDefined();
            expect(entry.buffer).toBeDefined();
            expect(entry.bindGroup).toBeDefined();
            expect(entry.layout).toBeDefined();
        });

        it('should return null for non-existent buffer', () => {
            const backend = createBackend();
            expect(backend.getCustomUniformBuffer('nonexistent')).toBeFalsy();
        });
    });

    describe('updateCustomUniforms', () => {
        it('should write data to the custom uniform buffer', () => {
            const backend = createBackend();
            backend.createCustomUniformBuffer('my-uniforms', 256);
            const data = new Float32Array(64);
            data[0] = 1.5;
            backend.updateCustomUniforms('my-uniforms', data);
            expect(backend.device.queue.writeBuffer).toHaveBeenCalled();
        });
    });

    describe('createTexture', () => {
        it('should create a texture via the device', () => {
            const backend = createBackend();
            backend.createTexture('test-tex', {
                size: [256, 256],
                format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
            });
            expect(backend.device.createTexture).toHaveBeenCalled();
        });
    });

    describe('createSampler', () => {
        it('should create a sampler via the device', () => {
            const backend = createBackend();
            backend.createSampler('test-sampler', {});
            expect(backend.device.createSampler).toHaveBeenCalled();
        });
    });

    describe('dispose', () => {
        it('should clean up without throwing', () => {
            const backend = createBackend();
            backend.createCustomUniformBuffer('buf1', 256);
            expect(() => backend.dispose()).not.toThrow();
        });

        it('should destroy the default uniform buffer', () => {
            const backend = createBackend();
            // The backend creates a default uniform buffer during init
            const uniformBuffer = backend._uniformBuffer;
            backend.dispose();
            // Uniform buffer should be destroyed
            expect(uniformBuffer.destroy).toHaveBeenCalled();
        });
    });
});
