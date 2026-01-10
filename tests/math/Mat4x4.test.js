/**
 * Mat4x4 Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { Mat4x4 } from '../../src/math/Mat4x4.js';
import { Vec4 } from '../../src/math/Vec4.js';

describe('Mat4x4', () => {
    describe('constructor', () => {
        it('creates identity matrix by default', () => {
            const m = new Mat4x4();
            expect(m.isIdentity()).toBe(true);
        });

        it('creates matrix from elements', () => {
            const elements = new Float32Array(16).fill(1);
            const m = new Mat4x4(elements);
            expect(m.data[0]).toBe(1);
        });

        it('uses column-major layout', () => {
            const m = Mat4x4.identity();
            // Diagonal elements
            expect(m.get(0, 0)).toBe(1);
            expect(m.get(1, 1)).toBe(1);
            expect(m.get(2, 2)).toBe(1);
            expect(m.get(3, 3)).toBe(1);
        });
    });

    describe('static factories', () => {
        it('creates identity', () => {
            const m = Mat4x4.identity();
            expect(m.data[0]).toBe(1);
            expect(m.data[5]).toBe(1);
            expect(m.data[10]).toBe(1);
            expect(m.data[15]).toBe(1);
        });

        it('creates zero matrix', () => {
            const m = Mat4x4.zero();
            for (let i = 0; i < 16; i++) {
                expect(m.data[i]).toBe(0);
            }
        });
    });

    describe('element access', () => {
        it('gets elements by row,col', () => {
            const m = Mat4x4.identity();
            expect(m.get(0, 0)).toBe(1);
            expect(m.get(0, 1)).toBe(0);
        });

        it('sets elements by row,col', () => {
            const m = Mat4x4.identity();
            m.set(1, 2, 5);
            expect(m.get(1, 2)).toBe(5);
        });

        it('gets column as Vec4', () => {
            const m = Mat4x4.identity();
            const col0 = m.getColumn(0);
            expect(col0.equals(new Vec4(1, 0, 0, 0))).toBe(true);
        });

        it('gets row as Vec4', () => {
            const m = Mat4x4.identity();
            const row0 = m.getRow(0);
            expect(row0.equals(new Vec4(1, 0, 0, 0))).toBe(true);
        });
    });

    describe('multiplication', () => {
        it('identity * identity = identity', () => {
            const a = Mat4x4.identity();
            const b = Mat4x4.identity();
            const result = a.multiply(b);
            expect(result.isIdentity()).toBe(true);
        });

        it('identity * M = M', () => {
            const id = Mat4x4.identity();
            const m = Mat4x4.rotationXY(0.5);
            const result = id.multiply(m);
            expect(result.equals(m)).toBe(true);
        });

        it('transforms vector correctly', () => {
            const m = Mat4x4.uniformScale(2);
            const v = new Vec4(1, 2, 3, 4);
            const result = m.multiplyVec4(v);
            expect(result.equals(new Vec4(2, 4, 6, 8))).toBe(true);
        });
    });

    describe('rotation matrices', () => {
        it('creates XY rotation', () => {
            const m = Mat4x4.rotationXY(Math.PI / 2);
            const v = Vec4.unitX();
            const result = m.multiplyVec4(v);
            expect(result.x).toBeCloseTo(0, 5);
            expect(result.y).toBeCloseTo(1, 5);
        });

        it('creates XZ rotation', () => {
            const m = Mat4x4.rotationXZ(Math.PI / 2);
            expect(m.isOrthogonal()).toBe(true);
        });

        it('creates YZ rotation', () => {
            const m = Mat4x4.rotationYZ(Math.PI / 2);
            expect(m.isOrthogonal()).toBe(true);
        });

        it('creates XW rotation', () => {
            const m = Mat4x4.rotationXW(Math.PI / 2);
            const v = Vec4.unitX();
            const result = m.multiplyVec4(v);
            expect(result.x).toBeCloseTo(0, 5);
            expect(result.w).toBeCloseTo(1, 5);
        });

        it('creates YW rotation', () => {
            const m = Mat4x4.rotationYW(Math.PI / 2);
            expect(m.isOrthogonal()).toBe(true);
        });

        it('creates ZW rotation', () => {
            const m = Mat4x4.rotationZW(Math.PI / 2);
            const v = Vec4.unitZ();
            const result = m.multiplyVec4(v);
            expect(result.z).toBeCloseTo(0, 5);
            expect(result.w).toBeCloseTo(1, 5);
        });

        it('rotation matrices are orthogonal', () => {
            const planes = ['XY', 'XZ', 'YZ', 'XW', 'YW', 'ZW'];
            for (const plane of planes) {
                const m = Mat4x4.rotation(plane, 0.7);
                expect(m.isOrthogonal()).toBe(true);
            }
        });

        it('rotation matrices have determinant 1', () => {
            const planes = ['XY', 'XZ', 'YZ', 'XW', 'YW', 'ZW'];
            for (const plane of planes) {
                const m = Mat4x4.rotation(plane, 1.2);
                expect(m.determinant()).toBeCloseTo(1, 5);
            }
        });
    });

    describe('combined rotations', () => {
        it('creates combined rotation from angles', () => {
            const m = Mat4x4.rotationFromAngles({
                xy: 0.1, xz: 0.2, yz: 0.3,
                xw: 0.4, yw: 0.5, zw: 0.6
            });
            expect(m.isOrthogonal()).toBe(true);
        });

        it('zero angles gives identity', () => {
            const m = Mat4x4.rotationFromAngles({});
            expect(m.isIdentity()).toBe(true);
        });
    });

    describe('transpose and inverse', () => {
        it('transposes correctly', () => {
            const m = new Mat4x4([
                1, 2, 3, 4,
                5, 6, 7, 8,
                9, 10, 11, 12,
                13, 14, 15, 16
            ]);
            const t = m.transpose();
            expect(t.get(0, 1)).toBe(m.get(1, 0));
            expect(t.get(2, 3)).toBe(m.get(3, 2));
        });

        it('double transpose equals original', () => {
            const m = Mat4x4.rotationXW(0.5);
            const result = m.transpose().transpose();
            expect(result.equals(m)).toBe(true);
        });

        it('computes inverse', () => {
            const m = Mat4x4.rotationXY(0.7);
            const inv = m.inverse();
            const product = m.multiply(inv);
            expect(product.isIdentity()).toBe(true);
        });

        it('returns null for singular matrix', () => {
            const m = Mat4x4.zero();
            expect(m.inverse()).toBeNull();
        });
    });

    describe('determinant', () => {
        it('identity has determinant 1', () => {
            const m = Mat4x4.identity();
            expect(m.determinant()).toBeCloseTo(1);
        });

        it('scale matrix has determinant = s^4', () => {
            const m = Mat4x4.uniformScale(2);
            expect(m.determinant()).toBeCloseTo(16);
        });
    });

    describe('utilities', () => {
        it('clones matrix', () => {
            const m = Mat4x4.rotationXW(1);
            const clone = m.clone();
            expect(clone.equals(m)).toBe(true);
            expect(clone).not.toBe(m);
        });

        it('converts to Float32Array', () => {
            const m = Mat4x4.identity();
            const arr = m.toFloat32Array();
            expect(arr).toBeInstanceOf(Float32Array);
            expect(arr.length).toBe(16);
        });
    });
});
