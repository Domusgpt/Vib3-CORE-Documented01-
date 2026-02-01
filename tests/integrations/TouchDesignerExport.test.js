/**
 * TouchDesignerExport Tests
 */

import { describe, it, expect } from 'vitest';
import { Vib3TouchDesignerExport } from '../../src/integrations/TouchDesignerExport.js';

describe('Vib3TouchDesignerExport', () => {
    describe('exportGLSLTOP', () => {
        it('returns GLSL shader code', () => {
            const glsl = Vib3TouchDesignerExport.exportGLSLTOP();
            expect(typeof glsl).toBe('string');
            expect(glsl.length).toBeGreaterThan(0);
        });

        it('returns different code per system', () => {
            const quantum = Vib3TouchDesignerExport.exportGLSLTOP('quantum');
            const faceted = Vib3TouchDesignerExport.exportGLSLTOP('faceted');
            expect(quantum).not.toBe(faceted);
        });

        it('includes comments when requested', () => {
            const glsl = Vib3TouchDesignerExport.exportGLSLTOP('quantum', { includeComments: true });
            expect(glsl).toContain('//');
        });
    });

    describe('exportTOX', () => {
        it('returns a TOX representation', () => {
            const tox = Vib3TouchDesignerExport.exportTOX();
            expect(tox).toBeTruthy();
        });
    });

    describe('getUniformMap', () => {
        it('returns a uniform mapping object', () => {
            const mapping = Vib3TouchDesignerExport.getUniformMap();
            expect(typeof mapping).toBe('object');
            expect(Object.keys(mapping).length).toBeGreaterThan(0);
        });
    });

    describe('getExportableSystems', () => {
        it('returns array of system names', () => {
            const systems = Vib3TouchDesignerExport.getExportableSystems();
            expect(Array.isArray(systems)).toBe(true);
            expect(systems.length).toBeGreaterThan(0);
        });
    });

    describe('getReadme', () => {
        it('returns a readme string', () => {
            const readme = Vib3TouchDesignerExport.getReadme();
            expect(typeof readme).toBe('string');
            expect(readme.length).toBeGreaterThan(0);
        });
    });
});
