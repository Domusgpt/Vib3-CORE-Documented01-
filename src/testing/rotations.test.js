import { describe, expect, it } from 'vitest';
import {
    applyMatrix4x4,
    createRotationMatrix4D,
    identityMatrix4x4,
    multiplyMatrix4x4,
    normalizeVector4D,
    transposeMatrix4x4,
    vectorLength4D,
} from '../math/rotations.js';

const EPSILON = 1e-6;

describe('4D rotation matrices', () => {
    it('keeps rotation matrices orthonormal', () => {
        const matrix = createRotationMatrix4D('XW', Math.PI / 3);
        const transpose = transposeMatrix4x4(matrix);
        const product = multiplyMatrix4x4(matrix, transpose);
        const identity = identityMatrix4x4();

        product.forEach((value, index) => {
            expect(Math.abs(value - identity[index])).toBeLessThan(1e-6);
        });
    });

    it('preserves vector length across repeated rotations', () => {
        const step = createRotationMatrix4D('YZ', Math.PI / 180);
        let vector = normalizeVector4D([1, 0.2, -0.4, 0.7]);
        const initialLength = vectorLength4D(vector);

        for (let i = 0; i < 720; i += 1) {
            vector = applyMatrix4x4(step, vector);
        }

        expect(Math.abs(vectorLength4D(vector) - initialLength)).toBeLessThan(EPSILON);
    });
});
