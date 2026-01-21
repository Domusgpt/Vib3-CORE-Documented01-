import { describe, expect, it } from 'vitest';
import Rotor4D from '../math/Rotor4D.js';
import { Vec4 } from '../math/Vec4.js';

const EPSILON = 1e-5;

describe('Rotor4D stability', () => {
    it('keeps rotor norms stable under repeated composition with renormalization', () => {
        const step = Rotor4D.fromPlaneAngle('XW', Math.PI / 720);
        let rotor = Rotor4D.identity();

        for (let i = 0; i < 2000; i += 1) {
            rotor = rotor.multiply(step).normalizeInPlace();
        }

        expect(Math.abs(rotor.norm() - 1)).toBeLessThan(EPSILON);
    });

    it('preserves vector length after repeated normalized rotations', () => {
        const step = Rotor4D.fromPlaneAngle('YZ', Math.PI / 360);
        let rotor = Rotor4D.identity();
        let vector = new Vec4(1, 0.3, -0.2, 0.8);
        const initialLength = Math.hypot(vector.x, vector.y, vector.z, vector.w);

        for (let i = 0; i < 1440; i += 1) {
            rotor = rotor.multiply(step).normalizeInPlace();
            vector = rotor.rotate(vector);
        }

        const finalLength = Math.hypot(vector.x, vector.y, vector.z, vector.w);
        expect(Math.abs(finalLength - initialLength)).toBeLessThan(EPSILON);
    });
});
