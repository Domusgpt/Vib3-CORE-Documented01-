/**
 * Warp Functions Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { Vec4 } from '../../src/math/Vec4.js';

import {
    warpHypersphereCore,
    projectToHypersphere,
    stereographicToHypersphere,
    hopfFibration,
    warpRadial,
    generateHypersphereSurface
} from '../../src/geometry/warp/HypersphereCore.js';

import {
    warpHypertetraCore,
    getPentatopeVertices,
    getPentatopeEdges,
    getPentatopeFaces,
    getPentatopeCells,
    toBarycentricCoords,
    warpTetrahedral,
    generatePentatope
} from '../../src/geometry/warp/HypertetraCore.js';

import generateTesseract from '../../src/geometry/generators/Tesseract.js';

describe('Hypersphere Warp', () => {
    describe('projectToHypersphere', () => {
        it('projects point to sphere surface', () => {
            const p = new Vec4(2, 0, 0, 0);
            const projected = projectToHypersphere(p, 1);
            expect(projected.length()).toBeCloseTo(1, 5);
        });

        it('handles zero vector', () => {
            const p = new Vec4(0, 0, 0, 0);
            const projected = projectToHypersphere(p, 1);
            // Should go to north pole
            expect(projected.w).toBeCloseTo(1, 5);
        });

        it('preserves direction', () => {
            const p = new Vec4(1, 1, 1, 1);
            const projected = projectToHypersphere(p, 1);
            const normalized = p.normalize();
            expect(projected.equals(normalized, 0.001)).toBe(true);
        });

        it('respects radius parameter', () => {
            const p = new Vec4(1, 0, 0, 0);
            const projected = projectToHypersphere(p, 2);
            expect(projected.length()).toBeCloseTo(2, 5);
        });
    });

    describe('stereographicToHypersphere', () => {
        it('maps origin to north pole', () => {
            const p = new Vec4(0, 0, 0, 0);
            const projected = stereographicToHypersphere(p, 1);
            expect(projected.w).toBeCloseTo(-1, 5);
            expect(projected.x).toBeCloseTo(0, 5);
        });

        it('maps infinity to south pole', () => {
            const p = new Vec4(100, 100, 100, 0);
            const projected = stereographicToHypersphere(p, 1);
            expect(projected.w).toBeCloseTo(1, 2);
        });

        it('result is on sphere', () => {
            const p = new Vec4(1, 0.5, -0.3, 0);
            const projected = stereographicToHypersphere(p, 1);
            expect(projected.length()).toBeCloseTo(1, 4);
        });
    });

    describe('hopfFibration', () => {
        it('produces points on unit sphere', () => {
            const p = hopfFibration(Math.PI / 4, Math.PI / 3, Math.PI / 6, 1);
            expect(p.length()).toBeCloseTo(1, 5);
        });

        it('respects radius', () => {
            const p = hopfFibration(Math.PI / 4, Math.PI / 3, Math.PI / 6, 2);
            expect(p.length()).toBeCloseTo(2, 5);
        });
    });

    describe('warpRadial', () => {
        it('warps vertices to sphere', () => {
            const vertices = [
                new Vec4(2, 0, 0, 0),
                new Vec4(0, 3, 0, 0),
                new Vec4(0, 0, 4, 0)
            ];
            const warped = warpRadial(vertices, 1, 1);

            for (const v of warped) {
                expect(v.length()).toBeCloseTo(1, 4);
            }
        });

        it('blend factor 0 leaves unchanged', () => {
            const vertices = [new Vec4(2, 0, 0, 0)];
            const warped = warpRadial(vertices, 1, 0);
            expect(warped[0].equals(vertices[0], 0.001)).toBe(true);
        });

        it('blend factor 0.5 interpolates', () => {
            const vertices = [new Vec4(2, 0, 0, 0)];
            const warped = warpRadial(vertices, 1, 0.5);
            expect(warped[0].length()).toBeCloseTo(1.5, 4);
        });
    });

    describe('warpHypersphereCore', () => {
        it('warps geometry onto hypersphere', () => {
            const geom = generateTesseract(1);
            const warped = warpHypersphereCore(geom, { method: 'radial', radius: 1 });

            expect(warped.coreType).toBe('hypersphere');
            expect(warped.name).toBe('tesseract_hypersphere');

            for (const v of warped.vertices) {
                expect(v.length()).toBeCloseTo(1, 4);
            }
        });

        it('preserves vertex count', () => {
            const geom = generateTesseract(1);
            const warped = warpHypersphereCore(geom, { method: 'radial' });
            expect(warped.vertexCount).toBe(geom.vertexCount);
        });

        it('preserves edges', () => {
            const geom = generateTesseract(1);
            const warped = warpHypersphereCore(geom);
            expect(warped.edges).toEqual(geom.edges);
        });
    });

    describe('generateHypersphereSurface', () => {
        it('generates surface vertices', () => {
            const vertices = generateHypersphereSurface(1, 4);
            expect(vertices.length).toBeGreaterThan(0);

            // All should be on unit sphere
            for (const v of vertices) {
                expect(v.length()).toBeCloseTo(1, 4);
            }
        });
    });
});

describe('Hypertetrahedron Warp', () => {
    describe('getPentatopeVertices', () => {
        it('returns 5 vertices', () => {
            const vertices = getPentatopeVertices(1);
            expect(vertices.length).toBe(5);
        });

        it('vertices are equidistant', () => {
            const vertices = getPentatopeVertices(1);
            const dist01 = vertices[0].distanceTo(vertices[1]);

            for (let i = 0; i < 5; i++) {
                for (let j = i + 1; j < 5; j++) {
                    const dist = vertices[i].distanceTo(vertices[j]);
                    expect(dist).toBeCloseTo(dist01, 2);
                }
            }
        });
    });

    describe('getPentatopeEdges', () => {
        it('returns 10 edges', () => {
            const edges = getPentatopeEdges();
            expect(edges.length).toBe(10);
        });

        it('each pair appears once', () => {
            const edges = getPentatopeEdges();
            const seen = new Set();
            for (const [i, j] of edges) {
                const key = `${Math.min(i, j)},${Math.max(i, j)}`;
                expect(seen.has(key)).toBe(false);
                seen.add(key);
            }
        });
    });

    describe('getPentatopeFaces', () => {
        it('returns 10 triangular faces', () => {
            const faces = getPentatopeFaces();
            expect(faces.length).toBe(10);
            for (const face of faces) {
                expect(face.length).toBe(3);
            }
        });
    });

    describe('getPentatopeCells', () => {
        it('returns 5 tetrahedral cells', () => {
            const cells = getPentatopeCells();
            expect(cells.length).toBe(5);
            for (const cell of cells) {
                expect(cell.length).toBe(4);
            }
        });
    });

    describe('toBarycentricCoords', () => {
        it('returns 5 coordinates', () => {
            const vertices = getPentatopeVertices(1);
            const point = new Vec4(0.1, 0.2, 0.3, 0.4);
            const coords = toBarycentricCoords(point, vertices);
            expect(coords.length).toBe(5);
        });

        it('coordinates sum to 1', () => {
            const vertices = getPentatopeVertices(1);
            const point = new Vec4(0.1, 0.2, 0.3, 0.4);
            const coords = toBarycentricCoords(point, vertices);
            const sum = coords.reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1, 4);
        });

        it('vertex has weight 1 at that vertex', () => {
            const vertices = getPentatopeVertices(1);
            const coords = toBarycentricCoords(vertices[0], vertices);
            // First coordinate should be largest
            expect(coords[0]).toBeGreaterThan(coords[1]);
        });
    });

    describe('warpTetrahedral', () => {
        it('warps vertices toward pentatope structure', () => {
            const vertices = [
                new Vec4(0, 0, 0, 0),
                new Vec4(1, 0, 0, 0),
                new Vec4(0, 1, 0, 0)
            ];
            const warped = warpTetrahedral(vertices, 1, 1);
            expect(warped.length).toBe(vertices.length);
        });

        it('blend 0 leaves unchanged', () => {
            const vertices = [new Vec4(0.5, 0.5, 0.5, 0.5)];
            const warped = warpTetrahedral(vertices, 1, 0);
            expect(warped[0].equals(vertices[0], 0.001)).toBe(true);
        });
    });

    describe('warpHypertetraCore', () => {
        it('warps geometry onto pentatope', () => {
            const geom = generateTesseract(0.5);
            const warped = warpHypertetraCore(geom, { method: 'tetrahedral' });

            expect(warped.coreType).toBe('hypertetrahedron');
            expect(warped.name).toBe('tesseract_hypertetra');
        });

        it('preserves vertex count', () => {
            const geom = generateTesseract(1);
            const warped = warpHypertetraCore(geom);
            expect(warped.vertexCount).toBe(geom.vertexCount);
        });

        it('supports different methods', () => {
            const geom = generateTesseract(0.5);

            const tetra = warpHypertetraCore(geom, { method: 'tetrahedral' });
            expect(tetra.warpMethod).toBe('tetrahedral');

            const edges = warpHypertetraCore(geom, { method: 'edges' });
            expect(edges.warpMethod).toBe('edges');

            const cells = warpHypertetraCore(geom, { method: 'cells' });
            expect(cells.warpMethod).toBe('cells');
        });
    });

    describe('generatePentatope', () => {
        it('generates complete pentatope', () => {
            const geom = generatePentatope(1);
            expect(geom.name).toBe('pentatope');
            expect(geom.vertexCount).toBe(5);
            expect(geom.edgeCount).toBe(10);
            expect(geom.faceCount).toBe(10);
            expect(geom.cellCount).toBe(5);
        });
    });
});
