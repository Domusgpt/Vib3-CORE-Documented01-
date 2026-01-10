/**
 * Base Geometry Generators Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { Vec4 } from '../../src/math/Vec4.js';

// Import generators
import generateTesseract, {
    generateTesseractVertices,
    generateTesseractEdges
} from '../../src/geometry/generators/Tesseract.js';

import {
    generate5Cell,
    generate5CellVertices,
    generateTetrahedronLattice
} from '../../src/geometry/generators/Tetrahedron.js';

import generateHypersphere, {
    generateHypersphereVertices,
    generateHypersphereFibonacci
} from '../../src/geometry/generators/Sphere.js';

import {
    generateCliffordTorus,
    generate4DTorus
} from '../../src/geometry/generators/Torus.js';

import generateKleinBottle from '../../src/geometry/generators/KleinBottle.js';
import generateFractal from '../../src/geometry/generators/Fractal.js';
import generateWave from '../../src/geometry/generators/Wave.js';
import generateCrystal from '../../src/geometry/generators/Crystal.js';

describe('Tesseract Generator', () => {
    it('generates 16 vertices', () => {
        const vertices = generateTesseractVertices(1);
        expect(vertices.length).toBe(16);
    });

    it('generates 32 edges', () => {
        const edges = generateTesseractEdges();
        expect(edges.length).toBe(32);
    });

    it('generates complete geometry', () => {
        const geom = generateTesseract(1);
        expect(geom.name).toBe('tesseract');
        expect(geom.vertexCount).toBe(16);
        expect(geom.edgeCount).toBe(32);
        expect(geom.faceCount).toBe(24);
        expect(geom.cells).toBe(8);
    });

    it('scales correctly', () => {
        const geom1 = generateTesseract(1);
        const geom2 = generateTesseract(2);
        expect(geom2.vertices[0].length()).toBeCloseTo(geom1.vertices[0].length() * 2, 4);
    });

    it('all vertices are on hypercube', () => {
        const vertices = generateTesseractVertices(1);
        for (const v of vertices) {
            // Each coordinate should be ±1
            expect(Math.abs(Math.abs(v.x) - 1)).toBeLessThan(0.01);
            expect(Math.abs(Math.abs(v.y) - 1)).toBeLessThan(0.01);
            expect(Math.abs(Math.abs(v.z) - 1)).toBeLessThan(0.01);
            expect(Math.abs(Math.abs(v.w) - 1)).toBeLessThan(0.01);
        }
    });
});

describe('5-Cell Generator', () => {
    it('generates 5 vertices', () => {
        const vertices = generate5CellVertices(1);
        expect(vertices.length).toBe(5);
    });

    it('generates 10 edges', () => {
        const geom = generate5Cell(1);
        expect(geom.edgeCount).toBe(10);
    });

    it('generates complete geometry', () => {
        const geom = generate5Cell(1);
        expect(geom.name).toBe('5cell');
        expect(geom.vertexCount).toBe(5);
        expect(geom.faceCount).toBe(10);
        expect(geom.cells).toBe(5);
    });

    it('vertices are equidistant', () => {
        const vertices = generate5CellVertices(1);
        const dist01 = vertices[0].distanceTo(vertices[1]);

        for (let i = 0; i < 5; i++) {
            for (let j = i + 1; j < 5; j++) {
                const dist = vertices[i].distanceTo(vertices[j]);
                expect(dist).toBeCloseTo(dist01, 3);
            }
        }
    });
});

describe('Hypersphere Generator', () => {
    it('generates vertices on sphere surface', () => {
        const geom = generateHypersphere(1, 16);
        for (const v of geom.vertices) {
            expect(v.length()).toBeCloseTo(1, 4);
        }
    });

    it('Fibonacci distribution is uniform', () => {
        const vertices = generateHypersphereFibonacci(1, 100);
        expect(vertices.length).toBe(100);
        // All should be on unit sphere
        for (const v of vertices) {
            expect(v.length()).toBeCloseTo(1, 4);
        }
    });

    it('scales correctly', () => {
        const geom = generateHypersphere(2, 16);
        for (const v of geom.vertices) {
            expect(v.length()).toBeCloseTo(2, 4);
        }
    });
});

describe('Clifford Torus Generator', () => {
    it('generates torus geometry', () => {
        const geom = generateCliffordTorus(1, 0.3, 16);
        expect(geom.name).toBe('clifford_torus');
        expect(geom.vertices.length).toBeGreaterThan(0);
    });

    it('vertices are on 3-sphere', () => {
        const geom = generateCliffordTorus(1, 0.3, 16);
        // Clifford torus lies on S³
        for (const v of geom.vertices) {
            expect(v.length()).toBeCloseTo(1, 3);
        }
    });

    it('4D torus has proper structure', () => {
        const geom = generate4DTorus(1, 0.3, 0.1, 16);
        expect(geom.name).toBe('4d_torus');
        expect(geom.vertices.length).toBeGreaterThan(0);
    });
});

describe('Klein Bottle Generator', () => {
    it('generates Klein bottle', () => {
        const geom = generateKleinBottle(1, 16);
        expect(geom.name).toBe('klein_bottle');
        expect(geom.nonOrientable).toBe(true);
    });

    it('is marked as non-orientable', () => {
        const geom = generateKleinBottle(1, 16);
        expect(geom.nonOrientable).toBe(true);
    });
});

describe('Fractal Generator', () => {
    it('generates Sierpinski pentatope', () => {
        const geom = generateFractal('sierpinski', 2, 1);
        expect(geom.name).toBe('fractal_sierpinski');
        expect(geom.fractalDepth).toBe(2);
    });

    it('generates Menger hypersponge', () => {
        const geom = generateFractal('menger', 1, 1);
        expect(geom.name).toBe('fractal_menger');
    });

    it('generates fractal tree', () => {
        const geom = generateFractal('tree', 3, 1);
        expect(geom.name).toBe('fractal_tree');
        expect(geom.edges.length).toBeGreaterThan(0);
    });

    it('generates Cantor dust', () => {
        const geom = generateFractal('cantor', 2, 1);
        expect(geom.name).toBe('fractal_cantor');
    });

    it('vertex count increases with depth', () => {
        const geom1 = generateFractal('sierpinski', 1, 1);
        const geom2 = generateFractal('sierpinski', 2, 1);
        expect(geom2.vertexCount).toBeGreaterThan(geom1.vertexCount);
    });
});

describe('Wave Generator', () => {
    it('generates standing wave', () => {
        const geom = generateWave('standing', { segments: 8 });
        expect(geom.name).toBe('wave_standing');
        expect(geom.waveType).toBe('standing');
    });

    it('generates ripple surface', () => {
        const geom = generateWave('ripple', { segments: 16 });
        expect(geom.name).toBe('wave_ripple');
    });

    it('generates helix', () => {
        const geom = generateWave('helix', { segments: 16, turns: 2 });
        expect(geom.name).toBe('wave_helix');
        expect(geom.edges.length).toBeGreaterThan(0);
    });

    it('stores wave parameters', () => {
        const geom = generateWave('standing', { frequency: 3, amplitude: 0.8 });
        expect(geom.frequency).toBe(3);
        expect(geom.amplitude).toBe(0.8);
    });
});

describe('Crystal Generator', () => {
    it('generates 16-cell', () => {
        const geom = generateCrystal('16cell', 1);
        expect(geom.name).toBe('crystal_16cell');
        expect(geom.vertexCount).toBe(8);
    });

    it('generates 24-cell', () => {
        const geom = generateCrystal('24cell', 1);
        expect(geom.name).toBe('crystal_24cell');
        expect(geom.vertexCount).toBe(24);
    });

    it('generates cubic lattice', () => {
        const geom = generateCrystal('cubic', 1, { spacing: 1 });
        expect(geom.name).toBe('crystal_cubic');
        expect(geom.vertices.length).toBeGreaterThan(0);
    });

    it('generates quasicrystal', () => {
        const geom = generateCrystal('quasicrystal', 1, { density: 5 });
        expect(geom.name).toBe('crystal_quasicrystal');
    });

    it('16-cell has correct structure', () => {
        const geom = generateCrystal('16cell', 1);
        // 16-cell has 8 vertices, each connected to 6 others
        expect(geom.vertexCount).toBe(8);
        expect(geom.edgeCount).toBe(24);
    });
});
