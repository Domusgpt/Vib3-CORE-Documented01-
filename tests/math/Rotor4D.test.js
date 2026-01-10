/**
 * Rotor4D Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { Rotor4D } from '../../src/math/Rotor4D.js';
import { Vec4 } from '../../src/math/Vec4.js';

describe('Rotor4D', () => {
    describe('constructor and identity', () => {
        it('creates identity rotor by default', () => {
            const r = new Rotor4D();
            expect(r.s).toBe(1);
            expect(r.xy).toBe(0);
            expect(r.xyzw).toBe(0);
        });

        it('creates identity with static method', () => {
            const r = Rotor4D.identity();
            expect(r.s).toBe(1);
            expect(r.norm()).toBeCloseTo(1);
        });

        it('has 8 components', () => {
            const r = new Rotor4D(1, 2, 3, 4, 5, 6, 7, 8);
            expect(r.s).toBe(1);
            expect(r.xy).toBe(2);
            expect(r.xz).toBe(3);
            expect(r.yz).toBe(4);
            expect(r.xw).toBe(5);
            expect(r.yw).toBe(6);
            expect(r.zw).toBe(7);
            expect(r.xyzw).toBe(8);
        });
    });

    describe('normalization', () => {
        it('normalizes to unit length', () => {
            const r = new Rotor4D(1, 1, 1, 1, 1, 1, 1, 1);
            const n = r.normalize();
            expect(n.norm()).toBeCloseTo(1);
        });

        it('preserves identity when normalizing', () => {
            const r = Rotor4D.identity();
            const n = r.normalize();
            expect(n.norm()).toBeCloseTo(1);
            expect(n.s).toBeCloseTo(1);
        });

        it('handles zero rotor', () => {
            const r = new Rotor4D(0, 0, 0, 0, 0, 0, 0, 0);
            const n = r.normalize();
            expect(n.isIdentity()).toBe(true);
        });
    });

    describe('plane rotations', () => {
        it('creates XY rotation', () => {
            const r = Rotor4D.fromPlaneAngle('XY', Math.PI / 2);
            expect(r.norm()).toBeCloseTo(1);
        });

        it('creates all 6 plane rotations', () => {
            const planes = ['XY', 'XZ', 'YZ', 'XW', 'YW', 'ZW'];
            for (const plane of planes) {
                const r = Rotor4D.fromPlaneAngle(plane, Math.PI / 4);
                expect(r.norm()).toBeCloseTo(1);
            }
        });

        it('identity rotation returns identity rotor', () => {
            const r = Rotor4D.fromPlaneAngle('XY', 0);
            expect(r.s).toBeCloseTo(1);
        });

        it('throws for invalid plane', () => {
            expect(() => Rotor4D.fromPlaneAngle('AB', Math.PI)).toThrow();
        });
    });

    describe('rotation application', () => {
        it('identity does not change vector', () => {
            const r = Rotor4D.identity();
            const v = new Vec4(1, 2, 3, 4);
            const rotated = r.rotate(v);
            expect(rotated.equals(v, 1e-5)).toBe(true);
        });

        it('XY rotation rotates in XY plane', () => {
            const r = Rotor4D.fromPlaneAngle('XY', Math.PI / 2);
            const v = Vec4.unitX();
            const rotated = r.rotate(v);
            // X should become Y
            expect(rotated.y).toBeCloseTo(1, 4);
            expect(rotated.x).toBeCloseTo(0, 4);
            expect(rotated.z).toBeCloseTo(0, 4);
            expect(rotated.w).toBeCloseTo(0, 4);
        });

        it('XW rotation moves X into W', () => {
            const r = Rotor4D.fromPlaneAngle('XW', Math.PI / 2);
            const v = Vec4.unitX();
            const rotated = r.rotate(v);
            // X should become W
            expect(rotated.w).toBeCloseTo(1, 4);
            expect(rotated.x).toBeCloseTo(0, 4);
        });

        it('preserves vector length', () => {
            const r = Rotor4D.fromPlaneAngle('XW', 1.234);
            const v = new Vec4(1, 2, 3, 4);
            const rotated = r.rotate(v);
            expect(rotated.length()).toBeCloseTo(v.length(), 4);
        });

        it('full rotation returns to start', () => {
            const r = Rotor4D.fromPlaneAngle('YZ', Math.PI * 2);
            const v = new Vec4(1, 2, 3, 4);
            const rotated = r.rotate(v);
            expect(rotated.equals(v, 1e-4)).toBe(true);
        });
    });

    describe('composition', () => {
        it('composes rotations', () => {
            const r1 = Rotor4D.fromPlaneAngle('XY', Math.PI / 4);
            const r2 = Rotor4D.fromPlaneAngle('XY', Math.PI / 4);
            const combined = r1.multiply(r2);
            // Should be equivalent to XY rotation by PI/2
            expect(combined.norm()).toBeCloseTo(1);
        });

        it('identity * r = r', () => {
            const id = Rotor4D.identity();
            const r = Rotor4D.fromPlaneAngle('ZW', 1.5);
            const result = id.multiply(r);
            expect(result.equals(r)).toBe(true);
        });

        it('r * r.inverse() = identity', () => {
            const r = Rotor4D.fromPlaneAngle('XW', 0.7);
            const inv = r.inverse();
            const result = r.multiply(inv);
            expect(result.isIdentity()).toBe(true);
        });
    });

    describe('matrix conversion', () => {
        it('converts to 4x4 matrix', () => {
            const r = Rotor4D.fromPlaneAngle('XY', Math.PI / 4);
            const m = r.toMatrix();
            expect(m).toBeInstanceOf(Float32Array);
            expect(m.length).toBe(16);
        });

        it('identity rotor gives identity matrix', () => {
            const r = Rotor4D.identity();
            const m = r.toMatrix();
            // Check diagonal
            expect(m[0]).toBeCloseTo(1);
            expect(m[5]).toBeCloseTo(1);
            expect(m[10]).toBeCloseTo(1);
            expect(m[15]).toBeCloseTo(1);
            // Check some off-diagonal
            expect(m[1]).toBeCloseTo(0);
            expect(m[4]).toBeCloseTo(0);
        });
    });

    describe('interpolation', () => {
        it('slerps between rotors', () => {
            const r1 = Rotor4D.fromPlaneAngle('XW', 0);
            const r2 = Rotor4D.fromPlaneAngle('XW', Math.PI);
            const mid = r1.slerp(r2, 0.5);
            expect(mid.norm()).toBeCloseTo(1);
        });

        it('slerp at t=0 returns start', () => {
            const r1 = Rotor4D.fromPlaneAngle('YZ', 0.5);
            const r2 = Rotor4D.fromPlaneAngle('YZ', 1.5);
            const result = r1.slerp(r2, 0);
            expect(result.equals(r1)).toBe(true);
        });

        it('slerp at t=1 returns end', () => {
            const r1 = Rotor4D.fromPlaneAngle('YZ', 0.5);
            const r2 = Rotor4D.fromPlaneAngle('YZ', 1.5);
            const result = r1.slerp(r2, 1);
            expect(result.equals(r2)).toBe(true);
        });
    });

    describe('numerical stability', () => {
        it('stays normalized after many multiplications', () => {
            let r = Rotor4D.fromPlaneAngle('XW', 0.01);
            for (let i = 0; i < 100; i++) {
                r = r.multiply(Rotor4D.fromPlaneAngle('YZ', 0.01));
                r.normalizeInPlace();
            }
            expect(r.norm()).toBeCloseTo(1, 5);
        });

        it('rotation preserves vector length over many iterations', () => {
            const r = Rotor4D.fromPlaneAngle('ZW', 0.1);
            let v = new Vec4(1, 2, 3, 4);
            const originalLength = v.length();

            for (let i = 0; i < 100; i++) {
                v = r.rotate(v);
            }

            expect(v.length()).toBeCloseTo(originalLength, 4);
        });
    });

    describe('fromEuler6', () => {
        it('creates rotor from 6 angles', () => {
            const r = Rotor4D.fromEuler6({
                xy: 0.1, xz: 0.2, yz: 0.3,
                xw: 0.4, yw: 0.5, zw: 0.6
            });
            expect(r.norm()).toBeCloseTo(1);
        });

        it('zero angles gives identity', () => {
            const r = Rotor4D.fromEuler6({});
            expect(r.isIdentity()).toBe(true);
        });
    });
});
