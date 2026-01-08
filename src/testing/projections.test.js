import { describe, expect, it } from 'vitest';
import { perspectiveProject4D, stereographicProject4D } from '../math/projections.js';

describe('4D projections', () => {
    it('clamps stereographic denominators near singularities', () => {
        const result = stereographicProject4D([1, 0, 0, 1 - 1e-12], { epsilon: 1e-4 });
        expect(Math.abs(result.denom)).toBeGreaterThanOrEqual(1e-4);
    });

    it('projects with perspective distance parameter', () => {
        const result = perspectiveProject4D([2, 0, 0, 1], { distance: 4 });
        expect(result.x).toBeCloseTo(2 / 3, 6);
    });
});
