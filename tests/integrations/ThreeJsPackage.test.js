/**
 * ThreeJsPackage Tests
 */

import { describe, it, expect } from 'vitest';
import { Vib3ThreeJsPackage } from '../../src/integrations/ThreeJsPackage.js';

describe('Vib3ThreeJsPackage', () => {
    describe('getVertexShader', () => {
        it('returns a GLSL vertex shader string', () => {
            const vs = Vib3ThreeJsPackage.getVertexShader();
            expect(typeof vs).toBe('string');
            expect(vs.length).toBeGreaterThan(0);
            expect(vs).toContain('void main');
        });
    });

    describe('getFragmentShader', () => {
        it('returns a GLSL fragment shader for quantum', () => {
            const fs = Vib3ThreeJsPackage.getFragmentShader('quantum');
            expect(typeof fs).toBe('string');
            expect(fs).toContain('void main');
        });

        it('returns a GLSL fragment shader for faceted', () => {
            const fs = Vib3ThreeJsPackage.getFragmentShader('faceted');
            expect(typeof fs).toBe('string');
            expect(fs).toContain('void main');
        });

        it('returns a GLSL fragment shader for holographic', () => {
            const fs = Vib3ThreeJsPackage.getFragmentShader('holographic');
            expect(typeof fs).toBe('string');
            expect(fs).toContain('void main');
        });
    });

    describe('getShaderMaterial', () => {
        it('returns a material config object', () => {
            const config = Vib3ThreeJsPackage.getShaderMaterial();
            expect(config).toHaveProperty('vertexShader');
            expect(config).toHaveProperty('fragmentShader');
            expect(config).toHaveProperty('uniforms');
        });

        it('has standard VIB3 uniforms', () => {
            const config = Vib3ThreeJsPackage.getShaderMaterial();
            expect(config.uniforms).toHaveProperty('u_time');
            expect(config.uniforms).toHaveProperty('u_resolution');
            expect(config.uniforms).toHaveProperty('u_hue');
        });

        it('has update method', () => {
            const config = Vib3ThreeJsPackage.getShaderMaterial();
            expect(typeof config.update).toBe('function');
        });

        it('has setParameter method', () => {
            const config = Vib3ThreeJsPackage.getShaderMaterial();
            expect(typeof config.setParameter).toBe('function');
        });

        it('accepts options', () => {
            const config = Vib3ThreeJsPackage.getShaderMaterial({
                system: 'faceted',
                transparent: true,
                width: 1920,
                height: 1080,
            });
            expect(config.transparent).toBe(true);
        });
    });
});
