/**
 * Vec4 Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { Vec4 } from '../../src/math/Vec4.js';

describe('Vec4', () => {
    describe('constructor', () => {
        it('creates zero vector by default', () => {
            const v = new Vec4();
            expect(v.x).toBe(0);
            expect(v.y).toBe(0);
            expect(v.z).toBe(0);
            expect(v.w).toBe(0);
        });

        it('creates vector with given components', () => {
            const v = new Vec4(1, 2, 3, 4);
            expect(v.x).toBe(1);
            expect(v.y).toBe(2);
            expect(v.z).toBe(3);
            expect(v.w).toBe(4);
        });

        it('uses Float32Array internally', () => {
            const v = new Vec4(1, 2, 3, 4);
            expect(v.data).toBeInstanceOf(Float32Array);
            expect(v.data.length).toBe(4);
        });
    });

    describe('static factories', () => {
        it('creates zero vector', () => {
            const v = Vec4.zero();
            expect(v.equals(new Vec4(0, 0, 0, 0))).toBe(true);
        });

        it('creates unit vectors', () => {
            expect(Vec4.unitX().equals(new Vec4(1, 0, 0, 0))).toBe(true);
            expect(Vec4.unitY().equals(new Vec4(0, 1, 0, 0))).toBe(true);
            expect(Vec4.unitZ().equals(new Vec4(0, 0, 1, 0))).toBe(true);
            expect(Vec4.unitW().equals(new Vec4(0, 0, 0, 1))).toBe(true);
        });

        it('creates from array', () => {
            const v = Vec4.fromArray([1, 2, 3, 4]);
            expect(v.equals(new Vec4(1, 2, 3, 4))).toBe(true);
        });

        it('creates random unit vectors on hypersphere', () => {
            const v = Vec4.randomUnit();
            expect(Math.abs(v.length() - 1)).toBeLessThan(1e-6);
        });
    });

    describe('arithmetic operations', () => {
        it('adds vectors', () => {
            const a = new Vec4(1, 2, 3, 4);
            const b = new Vec4(5, 6, 7, 8);
            const result = a.add(b);
            expect(result.equals(new Vec4(6, 8, 10, 12))).toBe(true);
        });

        it('subtracts vectors', () => {
            const a = new Vec4(5, 6, 7, 8);
            const b = new Vec4(1, 2, 3, 4);
            const result = a.sub(b);
            expect(result.equals(new Vec4(4, 4, 4, 4))).toBe(true);
        });

        it('scales vectors', () => {
            const v = new Vec4(1, 2, 3, 4);
            const result = v.scale(2);
            expect(result.equals(new Vec4(2, 4, 6, 8))).toBe(true);
        });

        it('negates vectors', () => {
            const v = new Vec4(1, -2, 3, -4);
            const result = v.negate();
            expect(result.equals(new Vec4(-1, 2, -3, 4))).toBe(true);
        });
    });

    describe('dot product', () => {
        it('computes dot product', () => {
            const a = new Vec4(1, 0, 0, 0);
            const b = new Vec4(0, 1, 0, 0);
            expect(a.dot(b)).toBe(0);
        });

        it('computes dot product of parallel vectors', () => {
            const a = new Vec4(1, 2, 3, 4);
            const b = new Vec4(1, 2, 3, 4);
            expect(a.dot(b)).toBeCloseTo(30);
        });

        it('computes dot product correctly', () => {
            const a = new Vec4(1, 2, 3, 4);
            const b = new Vec4(2, 3, 4, 5);
            expect(a.dot(b)).toBe(1*2 + 2*3 + 3*4 + 4*5);
        });
    });

    describe('length and normalization', () => {
        it('computes length', () => {
            const v = new Vec4(1, 0, 0, 0);
            expect(v.length()).toBe(1);
        });

        it('computes length of 4D vector', () => {
            const v = new Vec4(1, 1, 1, 1);
            expect(v.length()).toBeCloseTo(2);
        });

        it('normalizes vectors', () => {
            const v = new Vec4(3, 4, 0, 0);
            const n = v.normalize();
            expect(n.length()).toBeCloseTo(1);
            expect(n.x).toBeCloseTo(0.6);
            expect(n.y).toBeCloseTo(0.8);
        });

        it('handles zero vector normalization', () => {
            const v = new Vec4(0, 0, 0, 0);
            const n = v.normalize();
            expect(n.isZero()).toBe(true);
        });
    });

    describe('interpolation', () => {
        it('interpolates between vectors', () => {
            const a = new Vec4(0, 0, 0, 0);
            const b = new Vec4(2, 4, 6, 8);
            const mid = a.lerp(b, 0.5);
            expect(mid.equals(new Vec4(1, 2, 3, 4))).toBe(true);
        });

        it('returns start at t=0', () => {
            const a = new Vec4(1, 2, 3, 4);
            const b = new Vec4(5, 6, 7, 8);
            expect(a.lerp(b, 0).equals(a)).toBe(true);
        });

        it('returns end at t=1', () => {
            const a = new Vec4(1, 2, 3, 4);
            const b = new Vec4(5, 6, 7, 8);
            expect(a.lerp(b, 1).equals(b)).toBe(true);
        });
    });

    describe('projections', () => {
        it('projects with perspective', () => {
            const v = new Vec4(2, 2, 2, 0);
            const p = v.projectPerspective(2);
            expect(p.x).toBeCloseTo(1);
            expect(p.y).toBeCloseTo(1);
            expect(p.z).toBeCloseTo(1);
            expect(p.w).toBe(0);
        });

        it('projects orthographically', () => {
            const v = new Vec4(1, 2, 3, 4);
            const p = v.projectOrthographic();
            expect(p.x).toBe(1);
            expect(p.y).toBe(2);
            expect(p.z).toBe(3);
            expect(p.w).toBe(0);
        });
    });

    describe('utilities', () => {
        it('clones vectors', () => {
            const v = new Vec4(1, 2, 3, 4);
            const clone = v.clone();
            expect(clone.equals(v)).toBe(true);
            expect(clone).not.toBe(v);
        });

        it('converts to array', () => {
            const v = new Vec4(1, 2, 3, 4);
            expect(v.toArray()).toEqual([1, 2, 3, 4]);
        });

        it('computes distance', () => {
            const a = new Vec4(0, 0, 0, 0);
            const b = new Vec4(1, 0, 0, 0);
            expect(a.distanceTo(b)).toBe(1);
        });
    });
});
