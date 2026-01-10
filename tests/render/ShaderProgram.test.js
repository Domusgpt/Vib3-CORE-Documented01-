/**
 * ShaderProgram Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    ShaderStage,
    UniformType,
    UniformDescriptor,
    AttributeDescriptor,
    ShaderSource,
    ShaderProgram,
    ShaderLib,
    ShaderCache,
    shaderCache
} from '../../src/render/ShaderProgram.js';

describe('ShaderStage', () => {
    it('has all shader stages', () => {
        expect(ShaderStage.VERTEX).toBe('vertex');
        expect(ShaderStage.FRAGMENT).toBe('fragment');
        expect(ShaderStage.COMPUTE).toBe('compute');
    });
});

describe('UniformType', () => {
    it('has scalar types', () => {
        expect(UniformType.FLOAT).toBe('float');
        expect(UniformType.INT).toBe('int');
        expect(UniformType.BOOL).toBe('bool');
    });

    it('has vector types', () => {
        expect(UniformType.VEC2).toBe('vec2');
        expect(UniformType.VEC3).toBe('vec3');
        expect(UniformType.VEC4).toBe('vec4');
        expect(UniformType.IVEC2).toBe('ivec2');
        expect(UniformType.IVEC3).toBe('ivec3');
        expect(UniformType.IVEC4).toBe('ivec4');
    });

    it('has matrix types', () => {
        expect(UniformType.MAT2).toBe('mat2');
        expect(UniformType.MAT3).toBe('mat3');
        expect(UniformType.MAT4).toBe('mat4');
    });

    it('has sampler types', () => {
        expect(UniformType.SAMPLER_2D).toBe('sampler2D');
        expect(UniformType.SAMPLER_CUBE).toBe('samplerCube');
        expect(UniformType.SAMPLER_3D).toBe('sampler3D');
    });
});

describe('UniformDescriptor', () => {
    it('creates with name and type', () => {
        const uniform = new UniformDescriptor('u_color', UniformType.VEC4);

        expect(uniform.name).toBe('u_color');
        expect(uniform.type).toBe(UniformType.VEC4);
        expect(uniform.defaultValue).toBeNull();
        expect(uniform.location).toBeNull();
        expect(uniform.arraySize).toBe(1);
    });

    it('creates with default value', () => {
        const uniform = new UniformDescriptor('u_scale', UniformType.FLOAT, 1.0);

        expect(uniform.defaultValue).toBe(1.0);
    });
});

describe('AttributeDescriptor', () => {
    it('creates with name and location', () => {
        const attr = new AttributeDescriptor('a_position', 0);

        expect(attr.name).toBe('a_position');
        expect(attr.location).toBe(0);
        expect(attr.type).toBe('vec4');
    });

    it('creates with custom type', () => {
        const attr = new AttributeDescriptor('a_texcoord', 1, 'vec2');

        expect(attr.type).toBe('vec2');
    });
});

describe('ShaderSource', () => {
    const basicCode = `
        void main() {
            gl_Position = vec4(0.0);
        }
    `;

    const codeWithVersion = `#version 300 es
        void main() {
            gl_Position = vec4(0.0);
        }
    `;

    it('creates with stage and code', () => {
        const source = new ShaderSource(ShaderStage.VERTEX, basicCode);

        expect(source.stage).toBe(ShaderStage.VERTEX);
        expect(source.code).toBe(basicCode);
        expect(source.entryPoint).toBe('main');
        expect(source.defines).toEqual({});
        expect(source.includes).toEqual([]);
    });

    it('creates with options', () => {
        const source = new ShaderSource(ShaderStage.FRAGMENT, basicCode, {
            entryPoint: 'fragMain',
            defines: { USE_LIGHTING: 1 },
            includes: ['common.glsl']
        });

        expect(source.entryPoint).toBe('fragMain');
        expect(source.defines).toEqual({ USE_LIGHTING: 1 });
        expect(source.includes).toEqual(['common.glsl']);
    });

    it('processes code without version', () => {
        const source = new ShaderSource(ShaderStage.VERTEX, basicCode, {
            defines: { MAX_LIGHTS: 4, USE_SHADOWS: 1 }
        });

        const processed = source.getProcessedCode();

        expect(processed).toContain('#define MAX_LIGHTS 4');
        expect(processed).toContain('#define USE_SHADOWS 1');
        expect(processed.indexOf('#define')).toBeLessThan(processed.indexOf('void main'));
    });

    it('processes code with version', () => {
        const source = new ShaderSource(ShaderStage.VERTEX, codeWithVersion, {
            defines: { MAX_LIGHTS: 4 }
        });

        const processed = source.getProcessedCode();

        // Version should remain at the top
        expect(processed.indexOf('#version')).toBe(0);
        // Define should come after version
        expect(processed.indexOf('#define')).toBeGreaterThan(processed.indexOf('#version'));
    });

    it('returns original code without defines', () => {
        const source = new ShaderSource(ShaderStage.VERTEX, basicCode);

        expect(source.getProcessedCode()).toBe(basicCode);
    });
});

describe('ShaderProgram', () => {
    const vertexCode = `#version 300 es
        in vec4 a_position;
        void main() { gl_Position = a_position; }
    `;

    const fragmentCode = `#version 300 es
        precision highp float;
        out vec4 fragColor;
        void main() { fragColor = vec4(1.0); }
    `;

    it('creates with vertex and fragment sources', () => {
        const shader = new ShaderProgram({
            vertex: vertexCode,
            fragment: fragmentCode
        });

        expect(shader.id).toBeDefined();
        expect(shader.vertexSource).toBeInstanceOf(ShaderSource);
        expect(shader.fragmentSource).toBeInstanceOf(ShaderSource);
        expect(shader.vertexSource.stage).toBe(ShaderStage.VERTEX);
        expect(shader.fragmentSource.stage).toBe(ShaderStage.FRAGMENT);
    });

    it('creates with name', () => {
        const shader = new ShaderProgram({
            name: 'basic_shader',
            vertex: vertexCode,
            fragment: fragmentCode
        });

        expect(shader.name).toBe('basic_shader');
    });

    it('creates with uniforms', () => {
        const shader = new ShaderProgram({
            vertex: vertexCode,
            fragment: fragmentCode,
            uniforms: [
                { name: 'u_mvp', type: UniformType.MAT4 },
                { name: 'u_color', type: UniformType.VEC4, defaultValue: [1, 1, 1, 1] }
            ]
        });

        expect(shader.uniforms.length).toBe(2);
        expect(shader.getUniform('u_mvp').type).toBe(UniformType.MAT4);
        expect(shader.getUniform('u_color').defaultValue).toEqual([1, 1, 1, 1]);
    });

    it('creates with attributes', () => {
        const shader = new ShaderProgram({
            vertex: vertexCode,
            fragment: fragmentCode,
            attributes: [
                { name: 'a_position', location: 0 },
                { name: 'a_color', location: 1, type: 'vec4' }
            ]
        });

        expect(shader.attributes.length).toBe(2);
        expect(shader.getAttribute('a_position').location).toBe(0);
        expect(shader.getAttribute('a_color').type).toBe('vec4');
    });

    it('adds uniforms dynamically', () => {
        const shader = new ShaderProgram({
            vertex: vertexCode,
            fragment: fragmentCode
        });

        shader.addUniform('u_time', UniformType.FLOAT, 0);
        shader.addUniform('u_resolution', UniformType.VEC2);

        expect(shader.uniforms.length).toBe(2);
        expect(shader.getUniform('u_time').defaultValue).toBe(0);
    });

    it('adds attributes dynamically', () => {
        const shader = new ShaderProgram({
            vertex: vertexCode,
            fragment: fragmentCode
        });

        shader.addAttribute('a_texcoord', 2, 'vec2');

        expect(shader.attributes.length).toBe(1);
        expect(shader.getAttribute('a_texcoord').type).toBe('vec2');
    });

    it('caches uniform values', () => {
        const shader = new ShaderProgram({
            vertex: vertexCode,
            fragment: fragmentCode
        });

        // First set returns true (changed)
        expect(shader.setUniformValue('u_time', 1.0)).toBe(true);

        // Same value returns false (unchanged)
        expect(shader.setUniformValue('u_time', 1.0)).toBe(false);

        // Different value returns true
        expect(shader.setUniformValue('u_time', 2.0)).toBe(true);

        expect(shader.getUniformValue('u_time')).toBe(2.0);
    });

    it('clears uniform cache', () => {
        const shader = new ShaderProgram({
            vertex: vertexCode,
            fragment: fragmentCode
        });

        shader.setUniformValue('u_time', 1.0);
        shader.clearUniformCache();

        expect(shader.getUniformValue('u_time')).toBeUndefined();
    });

    it('manages handle', () => {
        const shader = new ShaderProgram({
            vertex: vertexCode,
            fragment: fragmentCode
        });

        expect(shader.isCompiled).toBe(false);

        const handle = { program: 1 };
        shader.setHandle(handle);

        expect(shader.getHandle()).toBe(handle);
        expect(shader.isCompiled).toBe(true);
    });

    it('sets error', () => {
        const shader = new ShaderProgram({
            vertex: vertexCode,
            fragment: fragmentCode
        });

        shader.setError('Compilation failed');

        expect(shader.error).toBe('Compilation failed');
        expect(shader.isCompiled).toBe(false);
    });

    it('disposes resources', () => {
        const shader = new ShaderProgram({
            vertex: vertexCode,
            fragment: fragmentCode
        });

        shader.setHandle({ program: 1 });
        shader.setUniformValue('u_time', 1.0);

        shader.dispose();

        expect(shader.getHandle()).toBeNull();
        expect(shader.isCompiled).toBe(false);
        expect(shader.getUniformValue('u_time')).toBeUndefined();
    });

    it('clones shader', () => {
        const shader = new ShaderProgram({
            name: 'original',
            vertex: vertexCode,
            fragment: fragmentCode,
            uniforms: [{ name: 'u_time', type: UniformType.FLOAT }],
            attributes: [{ name: 'a_position', location: 0 }]
        });

        const clone = shader.clone();

        expect(clone.name).toBe('original_clone');
        expect(clone.vertexSource.code).toBe(shader.vertexSource.code);
        expect(clone.uniforms.length).toBe(1);
        expect(clone.attributes.length).toBe(1);
        expect(clone.id).not.toBe(shader.id);
    });
});

describe('ShaderLib', () => {
    it('has 4D rotation functions', () => {
        expect(ShaderLib.rotation4D).toContain('rotateXY');
        expect(ShaderLib.rotation4D).toContain('rotateXZ');
        expect(ShaderLib.rotation4D).toContain('rotateYZ');
        expect(ShaderLib.rotation4D).toContain('rotateXW');
        expect(ShaderLib.rotation4D).toContain('rotateYW');
        expect(ShaderLib.rotation4D).toContain('rotateZW');
        expect(ShaderLib.rotation4D).toContain('rotate4D');
    });

    it('has 4D projection functions', () => {
        expect(ShaderLib.projection4D).toContain('projectPerspective');
        expect(ShaderLib.projection4D).toContain('projectStereographic');
        expect(ShaderLib.projection4D).toContain('projectOrthographic');
    });

    it('has basic 4D vertex shader', () => {
        expect(ShaderLib.vertex4D).toContain('#version 300 es');
        expect(ShaderLib.vertex4D).toContain('in vec4 a_position');
        expect(ShaderLib.vertex4D).toContain('u_rotation4D');
        expect(ShaderLib.vertex4D).toContain('u_projDistance');
    });

    it('has basic 4D fragment shader', () => {
        expect(ShaderLib.fragment4D).toContain('#version 300 es');
        expect(ShaderLib.fragment4D).toContain('v_depth4D');
        expect(ShaderLib.fragment4D).toContain('u_wFogDistance');
        expect(ShaderLib.fragment4D).toContain('u_wFogEnabled');
    });
});

describe('ShaderCache', () => {
    let cache;

    beforeEach(() => {
        cache = new ShaderCache();
    });

    it('creates empty cache', () => {
        expect(cache.size).toBe(0);
    });

    it('gets or creates shader', () => {
        let factoryCalls = 0;
        const factory = () => {
            factoryCalls++;
            return new ShaderProgram({
                vertex: 'void main() {}',
                fragment: 'void main() {}'
            });
        };

        const shader1 = cache.getOrCreate('basic', factory);
        const shader2 = cache.getOrCreate('basic', factory);

        expect(factoryCalls).toBe(1);
        expect(shader1).toBe(shader2);
        expect(cache.size).toBe(1);
    });

    it('gets shader by key', () => {
        const shader = new ShaderProgram({
            vertex: 'void main() {}',
            fragment: 'void main() {}'
        });

        cache.set('custom', shader);

        expect(cache.get('custom')).toBe(shader);
        expect(cache.get('unknown')).toBeUndefined();
    });

    it('checks if shader exists', () => {
        cache.set('exists', new ShaderProgram({
            vertex: 'void main() {}',
            fragment: 'void main() {}'
        }));

        expect(cache.has('exists')).toBe(true);
        expect(cache.has('missing')).toBe(false);
    });

    it('clears cache and disposes shaders', () => {
        const shader = new ShaderProgram({
            vertex: 'void main() {}',
            fragment: 'void main() {}'
        });
        shader.setHandle({ program: 1 });

        cache.set('shader', shader);
        cache.clear();

        expect(cache.size).toBe(0);
        expect(shader.getHandle()).toBeNull();
    });
});

describe('shaderCache (global)', () => {
    it('is a ShaderCache instance', () => {
        expect(shaderCache).toBeInstanceOf(ShaderCache);
    });
});
