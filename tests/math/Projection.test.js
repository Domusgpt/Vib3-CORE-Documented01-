/**
 * Projection Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { Projection, SliceProjection } from '../../src/math/Projection.js';
import { Vec4 } from '../../src/math/Vec4.js';

describe('Projection', () => {
    describe('perspective', () => {
        it('projects point at w=0 correctly', () => {
            const v = new Vec4(2, 4, 6, 0);
            const p = Projection.perspective(v, 2);
            expect(p.x).toBeCloseTo(1);
            expect(p.y).toBeCloseTo(2);
            expect(p.z).toBeCloseTo(3);
            expect(p.w).toBe(0);
        });

        it('scales by distance factor', () => {
            const v = new Vec4(1, 1, 1, 0);
            const p1 = Projection.perspective(v, 2);
            const p2 = Projection.perspective(v, 4);
            // Larger d means less scaling
            expect(p1.x).toBeGreaterThan(p2.x);
        });

        it('handles points near projection plane', () => {
            const v = new Vec4(1, 1, 1, 1.9999);
            const p = Projection.perspective(v, 2);
            // Should return large but finite values
            expect(isFinite(p.x)).toBe(true);
        });

        it('handles points at projection plane', () => {
            const v = new Vec4(1, 1, 1, 2);
            const p = Projection.perspective(v, 2);
            // Should return large values
            expect(Math.abs(p.x)).toBeGreaterThan(100);
        });

        it('clamps singularity with configurable epsilon', () => {
            const v = new Vec4(1, 1, 1, 2);
            const p = Projection.perspective(v, 2, { epsilon: 1e-3 });
            expect(p.x).toBeCloseTo(1000, 2);
        });
    });

    describe('stereographic', () => {
        it('projects origin to origin', () => {
            const v = new Vec4(0, 0, 0, 0);
            const p = Projection.stereographic(v);
            expect(p.x).toBe(0);
            expect(p.y).toBe(0);
            expect(p.z).toBe(0);
        });

        it('projects equator correctly', () => {
            // Point on equator of hypersphere (w=0)
            const v = new Vec4(1, 0, 0, 0);
            const p = Projection.stereographic(v);
            expect(p.x).toBeCloseTo(1);
        });

        it('handles north pole singularity', () => {
            const v = new Vec4(0.1, 0.1, 0.1, 0.9999);
            const p = Projection.stereographic(v);
            expect(isFinite(p.x)).toBe(true);
        });

        it('clamps stereographic singularity with epsilon', () => {
            const v = new Vec4(1, 0, 0, 1);
            const p = Projection.stereographic(v, { epsilon: 1e-3 });
            expect(p.x).toBeCloseTo(1000, 2);
        });

        it('is conformal (preserves angles locally)', () => {
            // Two perpendicular vectors
            const v1 = new Vec4(1, 0, 0, 0);
            const v2 = new Vec4(0, 1, 0, 0);

            const p1 = Projection.stereographic(v1);
            const p2 = Projection.stereographic(v2);

            // Should still be perpendicular in 3D (dot product ≈ 0)
            expect(p1.x * p2.x + p1.y * p2.y + p1.z * p2.z).toBeCloseTo(0);
        });
    });

    describe('stereographicInverse', () => {
        it('inverts correctly', () => {
            const original = new Vec4(1, 2, 3, 0);
            const projected = Projection.stereographic(original);
            const recovered = Projection.stereographicInverse(projected);

            // Should be on unit hypersphere
            expect(recovered.length()).toBeCloseTo(1);
        });

        it('origin maps to south pole', () => {
            const v = new Vec4(0, 0, 0, 0);
            const result = Projection.stereographicInverse(v);
            expect(result.w).toBeCloseTo(-1);
            expect(result.x).toBeCloseTo(0);
        });
    });

    describe('orthographic', () => {
        it('simply drops w component', () => {
            const v = new Vec4(1, 2, 3, 100);
            const p = Projection.orthographic(v);
            expect(p.x).toBe(1);
            expect(p.y).toBe(2);
            expect(p.z).toBe(3);
            expect(p.w).toBe(0);
        });
    });

    describe('oblique', () => {
        it('applies shear from w', () => {
            const v = new Vec4(0, 0, 0, 2);
            const p = Projection.oblique(v, 0.5, 0.5, 0);
            expect(p.x).toBe(1);
            expect(p.y).toBe(1);
            expect(p.z).toBe(0);
        });
    });

    describe('array operations', () => {
        it('projects array of vectors', () => {
            const vectors = [
                new Vec4(1, 0, 0, 0),
                new Vec4(0, 1, 0, 0),
                new Vec4(0, 0, 1, 0)
            ];
            const projected = Projection.perspectiveArray(vectors, 2);
            expect(projected.length).toBe(3);
            expect(projected[0].x).toBeCloseTo(0.5);
        });

        it('projects packed float array', () => {
            const packed = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0]);
            const result = Projection.perspectivePacked(packed, 2);
            expect(result.length).toBe(6); // 2 vec3s
            expect(result[0]).toBeCloseTo(0.5);
        });
    });

    describe('createProjector', () => {
        it('creates reusable projector function', () => {
            const projector = Projection.createProjector('perspective', { d: 3 });
            const v = new Vec4(3, 6, 9, 0);
            const p = projector(v);
            expect(p.x).toBeCloseTo(1);
            expect(p.y).toBeCloseTo(2);
            expect(p.z).toBeCloseTo(3);
        });
    });
});

describe('SliceProjection', () => {
    describe('isInSlice', () => {
        it('detects points in slice', () => {
            const v = new Vec4(1, 2, 3, 0.05);
            expect(SliceProjection.isInSlice(v, 0, 0.1)).toBe(true);
        });

        it('excludes points outside slice', () => {
            const v = new Vec4(1, 2, 3, 0.5);
            expect(SliceProjection.isInSlice(v, 0, 0.1)).toBe(false);
        });
    });

    describe('edgeCrossing', () => {
        it('finds edge intersection with plane', () => {
            const v1 = new Vec4(0, 0, 0, -1);
            const v2 = new Vec4(0, 0, 0, 1);
            const crossing = SliceProjection.edgeCrossing(v1, v2, 0);
            expect(crossing).not.toBeNull();
            expect(crossing.w).toBeCloseTo(0);
        });

        it('returns null for non-crossing edges', () => {
            const v1 = new Vec4(0, 0, 0, 1);
            const v2 = new Vec4(0, 0, 0, 2);
            const crossing = SliceProjection.edgeCrossing(v1, v2, 0);
            expect(crossing).toBeNull();
        });

        it('interpolates xyz correctly at crossing', () => {
            const v1 = new Vec4(0, 0, 0, -1);
            const v2 = new Vec4(2, 4, 6, 1);
            const crossing = SliceProjection.edgeCrossing(v1, v2, 0);
            expect(crossing.x).toBeCloseTo(1);
            expect(crossing.y).toBeCloseTo(2);
            expect(crossing.z).toBeCloseTo(3);
        });
    });

    describe('filterSlice', () => {
        it('filters points within slice', () => {
            const points = [
                new Vec4(1, 1, 1, 0),
                new Vec4(1, 1, 1, 0.5),
                new Vec4(1, 1, 1, 0.05)
            ];
            const filtered = SliceProjection.filterSlice(points, 0, 0.1);
            expect(filtered.length).toBe(2);
        });
    });
});
