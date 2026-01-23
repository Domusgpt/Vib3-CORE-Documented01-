/**
 * Rotation utilities tests
 */

import { describe, it, expect } from 'vitest';
import {
    ROTATION_PLANES,
    createRotationMatrix4D,
    createRotationMatricesFromAngles,
    composeRotationMatrixFromAngles,
    normalizeRotationAngles,
} from '../../src/math/rotations.js';

describe('rotation utilities', () => {
    it('normalizes angle inputs across all planes', () => {
        const normalized = normalizeRotationAngles({ xy: 0.1, XZ: 0.2, zw: 0.3 });
        expect(Object.keys(normalized)).toEqual(ROTATION_PLANES);
        expect(normalized.XY).toBeCloseTo(0.1);
        expect(normalized.XZ).toBeCloseTo(0.2);
        expect(normalized.ZW).toBeCloseTo(0.3);
        expect(normalized.YW).toBeCloseTo(0);
    });

    it('creates matrices for all six planes', () => {
        const matrices = createRotationMatricesFromAngles({ xy: 0.1 });
        ROTATION_PLANES.forEach((plane) => {
            expect(matrices[plane]).toHaveLength(16);
        });
    });

    it('composes rotation matrices from angles', () => {
        const angle = Math.PI / 5;
        const composed = composeRotationMatrixFromAngles({ XW: angle });
        const direct = createRotationMatrix4D('XW', angle);
        expect(composed).toEqual(direct);
    });
});
