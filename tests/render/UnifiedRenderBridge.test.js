/**
 * UnifiedRenderBridge Tests
 * Tests for the bridge that connects VIB3+ visualization systems to WebGL/WebGPU backends.
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';

// Set up WebGPU globals before any imports that reference them
globalThis.GPUBufferUsage = {
    UNIFORM: 0x0040, COPY_DST: 0x0008, COPY_SRC: 0x0004,
    VERTEX: 0x0020, INDEX: 0x0010, STORAGE: 0x0080,
    MAP_READ: 0x0001, MAP_WRITE: 0x0002, INDIRECT: 0x0100, QUERY_RESOLVE: 0x0200
};
globalThis.GPUShaderStage = { VERTEX: 0x1, FRAGMENT: 0x2, COMPUTE: 0x4 };
globalThis.GPUTextureUsage = {
    COPY_SRC: 0x01, COPY_DST: 0x02, TEXTURE_BINDING: 0x04,
    STORAGE_BINDING: 0x08, RENDER_ATTACHMENT: 0x10
};

const {
    UnifiedRenderBridge,
    canUseWebGPU,
    WGSLShaderLib
} = await import('../../src/render/UnifiedRenderBridge.js');

// ========================================================================
// Mock Helpers
// ========================================================================

function createMockGL() {
    const gl = {
        viewport: vi.fn(),
        createShader: vi.fn(() => ({})),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => true),
        createProgram: vi.fn(() => ({})),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn((program, pname) => {
            if (pname === 35714) return true;  // LINK_STATUS
            if (pname === 35718) return 3;     // ACTIVE_UNIFORMS
            return true;
        }),
        getActiveUniform: vi.fn((program, index) => {
            const uniforms = [
                { name: 'u_time', type: 5126, size: 1 },
                { name: 'u_resolution', type: 35664, size: 1 },
                { name: 'u_geometry', type: 5126, size: 1 }
            ];
            return uniforms[index] || null;
        }),
        getUniformLocation: vi.fn((program, name) => name),
        useProgram: vi.fn(),
        deleteProgram: vi.fn(),
        deleteShader: vi.fn(),
        deleteBuffer: vi.fn(),
        getExtension: vi.fn(() => ({ loseContext: vi.fn() })),
        enable: vi.fn(),
        blendFunc: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        uniform1f: vi.fn(),
        uniform1i: vi.fn(),
        uniform2fv: vi.fn(),
        uniform3fv: vi.fn(),
        uniform4fv: vi.fn(),
        uniform1fv: vi.fn(),
        getAttribLocation: vi.fn(() => 0),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        drawArrays: vi.fn(),
        createBuffer: vi.fn(() => ({})),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        VERTEX_SHADER: 35633,
        FRAGMENT_SHADER: 35632,
        COMPILE_STATUS: 35713,
        LINK_STATUS: 35714,
        ACTIVE_UNIFORMS: 35718,
        ARRAY_BUFFER: 34962,
        STATIC_DRAW: 35044,
        FLOAT: 5126,
        TRIANGLES: 4,
        BLEND: 3042,
        SRC_ALPHA: 770,
        ONE_MINUS_SRC_ALPHA: 771,
        COLOR_BUFFER_BIT: 16384
    };
    return gl;
}

function createMockCanvas() {
    const mockGL = createMockGL();
    return {
        width: 800,
        height: 600,
        clientWidth: 800,
        clientHeight: 600,
        style: {},
        getContext: vi.fn((type) => {
            if (type === 'webgl2' || type === 'webgl') return mockGL;
            return null;
        }),
        _mockGL: mockGL
    };
}

/**
 * Helper: create a WebGL bridge via the static factory, with navigator mocked.
 */
async function createWebGLBridge() {
    Object.defineProperty(globalThis, 'navigator', {
        value: {},
        configurable: true,
        writable: true
    });
    const canvas = createMockCanvas();
    const bridge = await UnifiedRenderBridge.create(canvas);
    return { bridge, canvas, gl: bridge.backend };
}

// ========================================================================
// Exports
// ========================================================================

describe('UnifiedRenderBridge Exports', () => {
    it('should export UnifiedRenderBridge class', () => {
        expect(UnifiedRenderBridge).toBeDefined();
        expect(typeof UnifiedRenderBridge).toBe('function');
    });

    it('should export canUseWebGPU function', () => {
        expect(typeof canUseWebGPU).toBe('function');
    });

    it('should re-export WGSLShaderLib', () => {
        expect(WGSLShaderLib).toBeDefined();
        expect(WGSLShaderLib.uniformStruct).toBeDefined();
        expect(WGSLShaderLib.rotation4D).toBeDefined();
        expect(WGSLShaderLib.fullscreenVertex).toBeDefined();
    });
});

// ========================================================================
// canUseWebGPU
// ========================================================================

describe('canUseWebGPU', () => {
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

    it('should return false when WebGPU is not available', () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {},
            configurable: true,
            writable: true
        });
        expect(canUseWebGPU()).toBe(false);
    });

    it('should return true when WebGPU is available', () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: { gpu: {} },
            configurable: true,
            writable: true
        });
        expect(canUseWebGPU()).toBe(true);
    });
});

// ========================================================================
// Constructor
// ========================================================================

describe('UnifiedRenderBridge Constructor', () => {
    it('should store canvas, backend type, and backend', () => {
        const canvas = createMockCanvas();
        const gl = createMockGL();
        const bridge = new UnifiedRenderBridge(canvas, 'webgl', gl);

        expect(bridge.canvas).toBe(canvas);
        expect(bridge.backendType).toBe('webgl');
        expect(bridge.backend).toBe(gl);
    });

    it('should default to not initialized', () => {
        const bridge = new UnifiedRenderBridge(createMockCanvas(), 'webgl', createMockGL());
        expect(bridge.initialized).toBe(false);
    });

    it('should initialize empty program/pipeline maps', () => {
        const bridge = new UnifiedRenderBridge(createMockCanvas(), 'webgl', createMockGL());
        expect(bridge._glPrograms.size).toBe(0);
        expect(bridge._gpuPipelineBuffers.size).toBe(0);
    });
});

// ========================================================================
// Static create (WebGL fallback path)
// ========================================================================

describe('UnifiedRenderBridge.create', () => {
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

    it('should create a WebGL bridge when WebGPU is not available', async () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {},
            configurable: true,
            writable: true
        });
        const canvas = createMockCanvas();
        const bridge = await UnifiedRenderBridge.create(canvas, { preferWebGPU: true });

        expect(bridge).toBeInstanceOf(UnifiedRenderBridge);
        expect(bridge.backendType).toBe('webgl');
        expect(bridge.initialized).toBe(true);
    });

    it('should create a WebGL bridge when preferWebGPU is false', async () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {},
            configurable: true,
            writable: true
        });
        const canvas = createMockCanvas();
        const bridge = await UnifiedRenderBridge.create(canvas, { preferWebGPU: false });

        expect(bridge.backendType).toBe('webgl');
        expect(bridge.initialized).toBe(true);
    });

    it('should throw when neither WebGPU nor WebGL is available', async () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {},
            configurable: true,
            writable: true
        });
        const canvas = createMockCanvas();
        canvas.getContext = vi.fn(() => null);

        await expect(
            UnifiedRenderBridge.create(canvas)
        ).rejects.toThrow('Neither WebGPU nor WebGL is available');
    });

    it('should initialize the WebGL quad buffer on creation', async () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {},
            configurable: true,
            writable: true
        });
        const canvas = createMockCanvas();
        const bridge = await UnifiedRenderBridge.create(canvas);

        expect(bridge._glQuadBuffer).toBeDefined();
        expect(bridge._glQuadBuffer).not.toBeNull();
    });
});

// ========================================================================
// getBackendType
// ========================================================================

describe('getBackendType', () => {
    it('should return the backend type string', () => {
        const bridge = new UnifiedRenderBridge(createMockCanvas(), 'webgl', createMockGL());
        expect(bridge.getBackendType()).toBe('webgl');
    });
});

// ========================================================================
// Shader Compilation (WebGL path)
// ========================================================================

describe('compileShader (WebGL)', () => {
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

    it('should compile GLSL vertex + fragment shaders', async () => {
        const { bridge } = await createWebGLBridge();

        const success = bridge.compileShader('test', {
            glslVertex: 'void main() { gl_Position = vec4(0.0); }',
            glslFragment: 'void main() { gl_FragColor = vec4(1.0); }'
        });

        expect(success).toBe(true);
        expect(bridge._glPrograms.has('test')).toBe(true);
    });

    it('should store uniform locations after compilation', async () => {
        const { bridge } = await createWebGLBridge();

        bridge.compileShader('test', {
            glslVertex: 'void main() {}',
            glslFragment: 'void main() {}'
        });

        const entry = bridge._glPrograms.get('test');
        expect(entry.uniformLocations).toBeDefined();
        expect(entry.uniformLocations.size).toBeGreaterThan(0);
    });

    it('should handle shader compilation failure', async () => {
        const { bridge } = await createWebGLBridge();
        const gl = bridge.backend;
        gl.getShaderParameter = vi.fn(() => false);
        gl.getShaderInfoLog = vi.fn(() => 'Compile error');

        const success = bridge.compileShader('fail', {
            glslVertex: 'invalid',
            glslFragment: 'invalid'
        });

        expect(success).toBe(false);
    });

    it('should handle program link failure', async () => {
        const { bridge } = await createWebGLBridge();
        const gl = bridge.backend;
        gl.getProgramParameter = vi.fn(() => false);
        gl.getProgramInfoLog = vi.fn(() => 'Link error');

        const success = bridge.compileShader('link-fail', {
            glslVertex: 'void main() {}',
            glslFragment: 'void main() {}'
        });

        expect(success).toBe(false);
    });

    it('should replace existing shader program', async () => {
        const { bridge } = await createWebGLBridge();

        bridge.compileShader('replace-me', {
            glslVertex: 'void main() {}',
            glslFragment: 'void main() {}'
        });

        bridge.compileShader('replace-me', {
            glslVertex: 'void main() {}',
            glslFragment: 'void main() {}'
        });

        expect(bridge.backend.deleteProgram).toHaveBeenCalled();
    });
});

// ========================================================================
// setUniforms
// ========================================================================

describe('setUniforms', () => {
    it('should store pending uniforms', () => {
        const bridge = new UnifiedRenderBridge(createMockCanvas(), 'webgl', createMockGL());
        bridge.setUniforms({ u_time: 1.5, u_resolution: [800, 600] });
        expect(bridge._pendingUniforms).toEqual({ u_time: 1.5, u_resolution: [800, 600] });
    });

    it('should overwrite previous pending uniforms', () => {
        const bridge = new UnifiedRenderBridge(createMockCanvas(), 'webgl', createMockGL());
        bridge.setUniforms({ u_time: 1.0 });
        bridge.setUniforms({ u_time: 2.0 });
        expect(bridge._pendingUniforms.u_time).toBe(2.0);
    });
});

// ========================================================================
// render (WebGL path)
// ========================================================================

describe('render (WebGL)', () => {
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

    it('should do nothing when shader name is not found', async () => {
        const { bridge, gl } = await createWebGLBridge();
        bridge.render('nonexistent');
        expect(gl.useProgram).not.toHaveBeenCalled();
    });

    it('should render a fullscreen quad with compiled shader', async () => {
        const { bridge, gl } = await createWebGLBridge();

        bridge.compileShader('myshader', {
            glslVertex: 'void main() {}',
            glslFragment: 'void main() {}'
        });

        bridge.setUniforms({ u_time: 1.5, u_geometry: 0 });
        bridge.render('myshader');

        expect(gl.useProgram).toHaveBeenCalled();
        expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, 6);
    });

    it('should apply float uniforms', async () => {
        const { bridge, gl } = await createWebGLBridge();

        bridge.compileShader('test', {
            glslVertex: 'void main() {}',
            glslFragment: 'void main() {}'
        });

        bridge.setUniforms({ u_time: 2.5 });
        bridge.render('test');

        expect(gl.uniform1f).toHaveBeenCalled();
    });

    it('should apply vec2 array uniforms', async () => {
        const { bridge, gl } = await createWebGLBridge();

        bridge.compileShader('test', {
            glslVertex: 'void main() {}',
            glslFragment: 'void main() {}'
        });

        bridge.setUniforms({ u_resolution: [800, 600] });
        bridge.render('test');

        expect(gl.uniform2fv).toHaveBeenCalled();
    });

    it('should clear by default', async () => {
        const { bridge, gl } = await createWebGLBridge();

        bridge.compileShader('test', {
            glslVertex: 'void main() {}',
            glslFragment: 'void main() {}'
        });

        bridge.render('test');
        expect(gl.clearColor).toHaveBeenCalled();
        expect(gl.clear).toHaveBeenCalled();
    });

    it('should not clear when clear=false', async () => {
        const { bridge, gl } = await createWebGLBridge();

        bridge.compileShader('test', {
            glslVertex: 'void main() {}',
            glslFragment: 'void main() {}'
        });

        bridge.render('test', { clear: false });
        expect(gl.clearColor).not.toHaveBeenCalled();
    });

    it('should use custom clear color', async () => {
        const { bridge, gl } = await createWebGLBridge();

        bridge.compileShader('test', {
            glslVertex: 'void main() {}',
            glslFragment: 'void main() {}'
        });

        bridge.render('test', { clearColor: [0.1, 0.2, 0.3, 1.0] });
        expect(gl.clearColor).toHaveBeenCalledWith(0.1, 0.2, 0.3, 1.0);
    });
});

// ========================================================================
// resize
// ========================================================================

describe('resize', () => {
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

    it('should update canvas dimensions (WebGL)', async () => {
        const { bridge, canvas } = await createWebGLBridge();

        bridge.resize(1920, 1080);
        expect(canvas.width).toBe(1920);
        expect(canvas.height).toBe(1080);
    });

    it('should apply pixel ratio', async () => {
        const { bridge, canvas } = await createWebGLBridge();

        bridge.resize(800, 600, 2);
        expect(canvas.width).toBe(1600);
        expect(canvas.height).toBe(1200);
    });

    it('should call gl.viewport for WebGL', async () => {
        const { bridge, gl } = await createWebGLBridge();

        bridge.resize(1024, 768);
        expect(gl.viewport).toHaveBeenCalledWith(0, 0, 1024, 768);
    });
});

// ========================================================================
// getRawBackend
// ========================================================================

describe('getRawBackend', () => {
    it('should return the raw WebGL context', () => {
        const gl = createMockGL();
        const bridge = new UnifiedRenderBridge(createMockCanvas(), 'webgl', gl);
        expect(bridge.getRawBackend()).toBe(gl);
    });
});

// ========================================================================
// dispose
// ========================================================================

describe('dispose', () => {
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

    it('should clean up WebGL resources', async () => {
        const { bridge } = await createWebGLBridge();

        bridge.compileShader('test', {
            glslVertex: 'void main() {}',
            glslFragment: 'void main() {}'
        });

        bridge.dispose();

        expect(bridge.initialized).toBe(false);
        expect(bridge._glPrograms.size).toBe(0);
        expect(bridge._glQuadBuffer).toBeNull();
        expect(bridge._pendingUniforms).toBeNull();
    });

    it('should lose WebGL context on dispose', async () => {
        const { bridge, gl } = await createWebGLBridge();

        bridge.dispose();

        expect(gl.getExtension).toHaveBeenCalledWith('WEBGL_lose_context');
    });

    it('should delete all compiled programs', async () => {
        const { bridge, gl } = await createWebGLBridge();

        bridge.compileShader('a', { glslVertex: 'void main() {}', glslFragment: 'void main() {}' });
        bridge.compileShader('b', { glslVertex: 'void main() {}', glslFragment: 'void main() {}' });

        bridge.dispose();

        expect(gl.deleteProgram).toHaveBeenCalled();
    });
});

// ========================================================================
// Full Integration Flow (WebGL)
// ========================================================================

describe('Full WebGL rendering flow', () => {
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

    it('should create, compile, set uniforms, render, and dispose without errors', async () => {
        const { bridge, canvas, gl } = await createWebGLBridge();

        expect(bridge.initialized).toBe(true);
        expect(bridge.getBackendType()).toBe('webgl');

        // Compile shader
        const compiled = bridge.compileShader('faceted', {
            glslVertex: `
                attribute vec2 a_position;
                void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
            `,
            glslFragment: `
                precision mediump float;
                uniform float u_time;
                void main() { gl_FragColor = vec4(u_time, 0.0, 0.0, 1.0); }
            `
        });
        expect(compiled).toBe(true);

        // Set uniforms
        bridge.setUniforms({
            u_time: 1.5,
            u_resolution: [800, 600],
            u_geometry: 0,
            u_rot4dXY: 0.5,
            u_rot4dXZ: 0.3,
            u_rot4dYZ: 0.2,
            u_rot4dXW: 0.1,
            u_rot4dYW: 0.4,
            u_rot4dZW: 0.6
        });

        // Render
        bridge.render('faceted');
        expect(gl.drawArrays).toHaveBeenCalled();

        // Resize
        bridge.resize(1920, 1080);
        expect(canvas.width).toBe(1920);

        // Dispose
        bridge.dispose();
        expect(bridge.initialized).toBe(false);
    });
});
