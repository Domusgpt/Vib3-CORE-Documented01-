/**
 * GeometryFactory Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    GeometryFactory,
    generateGeometry,
    decodeGeometry,
    encodeGeometry,
    getGeometryName,
    getAllGeometryNames,
    BASE_GEOMETRIES,
    CORE_TYPES
} from '../../src/geometry/GeometryFactory.js';

describe('GeometryFactory', () => {
    describe('encoding/decoding', () => {
        it('decodes geometry index correctly', () => {
            expect(decodeGeometry(0)).toEqual({ baseIndex: 0, coreIndex: 0 });
            expect(decodeGeometry(7)).toEqual({ baseIndex: 7, coreIndex: 0 });
            expect(decodeGeometry(8)).toEqual({ baseIndex: 0, coreIndex: 1 });
            expect(decodeGeometry(15)).toEqual({ baseIndex: 7, coreIndex: 1 });
            expect(decodeGeometry(16)).toEqual({ baseIndex: 0, coreIndex: 2 });
            expect(decodeGeometry(23)).toEqual({ baseIndex: 7, coreIndex: 2 });
        });

        it('encodes geometry correctly', () => {
            expect(encodeGeometry(0, 0)).toBe(0);
            expect(encodeGeometry(7, 0)).toBe(7);
            expect(encodeGeometry(0, 1)).toBe(8);
            expect(encodeGeometry(7, 1)).toBe(15);
            expect(encodeGeometry(0, 2)).toBe(16);
            expect(encodeGeometry(7, 2)).toBe(23);
        });

        it('round-trips encoding/decoding', () => {
            for (let i = 0; i < 24; i++) {
                const { baseIndex, coreIndex } = decodeGeometry(i);
                expect(encodeGeometry(baseIndex, coreIndex)).toBe(i);
            }
        });

        it('clamps out of range indices', () => {
            expect(decodeGeometry(-1)).toEqual({ baseIndex: 0, coreIndex: 0 });
            expect(decodeGeometry(24)).toEqual({ baseIndex: 7, coreIndex: 2 });
            expect(decodeGeometry(100)).toEqual({ baseIndex: 7, coreIndex: 2 });
        });
    });

    describe('naming', () => {
        it('returns correct base geometry names', () => {
            expect(getGeometryName(0)).toBe('tetrahedron');
            expect(getGeometryName(1)).toBe('hypercube');
            expect(getGeometryName(2)).toBe('sphere');
            expect(getGeometryName(3)).toBe('torus');
            expect(getGeometryName(4)).toBe('klein_bottle');
            expect(getGeometryName(5)).toBe('fractal');
            expect(getGeometryName(6)).toBe('wave');
            expect(getGeometryName(7)).toBe('crystal');
        });

        it('returns correct hypersphere core names', () => {
            expect(getGeometryName(8)).toBe('tetrahedron_hypersphere');
            expect(getGeometryName(9)).toBe('hypercube_hypersphere');
            expect(getGeometryName(15)).toBe('crystal_hypersphere');
        });

        it('returns correct hypertetra core names', () => {
            expect(getGeometryName(16)).toBe('tetrahedron_hypertetrahedron');
            expect(getGeometryName(17)).toBe('hypercube_hypertetrahedron');
            expect(getGeometryName(23)).toBe('crystal_hypertetrahedron');
        });

        it('returns all 24 geometry names', () => {
            const names = getAllGeometryNames();
            expect(names.length).toBe(24);
            expect(names[0]).toBe('tetrahedron');
            expect(names[23]).toBe('crystal_hypertetrahedron');
        });
    });

    describe('constants', () => {
        it('has 8 base geometries', () => {
            expect(BASE_GEOMETRIES.length).toBe(8);
        });

        it('has 3 core types', () => {
            expect(CORE_TYPES.length).toBe(3);
        });
    });

    describe('geometry generation', () => {
        it('generates base geometry (index 0-7)', () => {
            const geom = generateGeometry(1); // hypercube
            expect(geom.name).toBe('tesseract');
            expect(geom.vertices.length).toBeGreaterThan(0);
            expect(geom.edges.length).toBeGreaterThan(0);
            expect(geom.geometryIndex).toBe(1);
            expect(geom.baseIndex).toBe(1);
            expect(geom.coreIndex).toBe(0);
        });

        it('generates hypersphere core geometry (index 8-15)', () => {
            const geom = generateGeometry(9); // hypercube + hypersphere
            expect(geom.name).toBe('tesseract_hypersphere');
            expect(geom.coreType).toBe('hypersphere');
            expect(geom.geometryIndex).toBe(9);
            expect(geom.baseIndex).toBe(1);
            expect(geom.coreIndex).toBe(1);
        });

        it('generates hypertetra core geometry (index 16-23)', () => {
            const geom = generateGeometry(17); // hypercube + hypertetra
            expect(geom.name).toBe('tesseract_hypertetra');
            expect(geom.coreType).toBe('hypertetrahedron');
            expect(geom.geometryIndex).toBe(17);
            expect(geom.baseIndex).toBe(1);
            expect(geom.coreIndex).toBe(2);
        });

        it('preserves vertex count through warp', () => {
            const base = generateGeometry(1);
            const warped = generateGeometry(9);
            expect(warped.vertexCount).toBe(base.vertexCount);
        });

        it('includes metadata', () => {
            const geom = generateGeometry(5);
            expect(geom.baseName).toBe('fractal');
            expect(geom.coreName).toBe('base');
            expect(geom.fullName).toBe('fractal');
        });
    });

    describe('GeometryFactory class', () => {
        it('creates factory with default options', () => {
            const factory = new GeometryFactory();
            expect(factory.options.scale).toBe(1);
            expect(factory.options.density).toBe(24);
        });

        it('creates factory with custom options', () => {
            const factory = new GeometryFactory({ scale: 2, density: 48 });
            expect(factory.options.scale).toBe(2);
            expect(factory.options.density).toBe(48);
        });

        it('generates geometry by index', () => {
            const factory = new GeometryFactory();
            const geom = factory.generate(1);
            expect(geom.name).toBe('tesseract');
        });

        it('generates geometry by name', () => {
            const factory = new GeometryFactory();
            const geom = factory.generateByName('hypercube');
            expect(geom.name).toBe('tesseract');
        });

        it('throws for unknown name', () => {
            const factory = new GeometryFactory();
            expect(() => factory.generateByName('unknown')).toThrow();
        });

        it('caches geometry', () => {
            const factory = new GeometryFactory();
            const geom1 = factory.generate(1);
            const geom2 = factory.generate(1);
            expect(geom1).toBe(geom2); // Same reference
        });

        it('bypasses cache when disabled', () => {
            const factory = new GeometryFactory({ cacheEnabled: false });
            const geom1 = factory.generate(1);
            const geom2 = factory.generate(1);
            expect(geom1).not.toBe(geom2);
        });

        it('clears cache', () => {
            const factory = new GeometryFactory();
            factory.generate(1);
            expect(factory.getCacheStats().size).toBe(1);
            factory.clearCache();
            expect(factory.getCacheStats().size).toBe(0);
        });

        it('generates all 24 geometries', () => {
            const factory = new GeometryFactory();
            const all = factory.generateAll();
            expect(all.length).toBe(24);
        });

        it('generates by core type', () => {
            const factory = new GeometryFactory();
            const baseGeoms = factory.generateByCore(0);
            expect(baseGeoms.length).toBe(8);
            expect(baseGeoms[0].coreIndex).toBe(0);

            const sphereGeoms = factory.generateByCore(1);
            expect(sphereGeoms.length).toBe(8);
            expect(sphereGeoms[0].coreIndex).toBe(1);
        });
    });
});
