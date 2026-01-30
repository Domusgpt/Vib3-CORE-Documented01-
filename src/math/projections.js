/**
 * Projection Utilities - Functional API for 4D→3D projections
 *
 * Provides functional wrappers around the Projection class for
 * convenience in tests and direct usage.
 */

/**
 * Perspective projection of a 4D point to 3D.
 *
 * Formula: P.xyz = v.xyz / (distance - v.w)
 *
 * @param {number[]} v - 4-element array [x, y, z, w]
 * @param {object} [options]
 * @param {number} [options.distance=2] - Projection distance
 * @param {number} [options.epsilon=1e-5] - Minimum absolute denominator
 * @returns {{ x: number, y: number, z: number, denom: number }}
 */
export function perspectiveProject4D(v, options = {}) {
    const distance = options.distance ?? 2;
    const epsilon = options.epsilon ?? 1e-5;
    const raw = distance - v[3];
    const denom = Math.abs(raw) < epsilon ? (raw >= 0 ? epsilon : -epsilon) : raw;
    const scale = 1 / denom;
    return {
        x: v[0] * scale,
        y: v[1] * scale,
        z: v[2] * scale,
        denom,
    };
}

/**
 * Stereographic projection of a 4D point to 3D.
 *
 * Formula: P.xyz = v.xyz / (1 - v.w)
 *
 * @param {number[]} v - 4-element array [x, y, z, w]
 * @param {object} [options]
 * @param {number} [options.epsilon=1e-5] - Minimum absolute denominator
 * @returns {{ x: number, y: number, z: number, denom: number }}
 */
export function stereographicProject4D(v, options = {}) {
    const epsilon = options.epsilon ?? 1e-5;
    const raw = 1 - v[3];
    const denom = Math.abs(raw) < epsilon ? (raw >= 0 ? epsilon : -epsilon) : raw;
    const scale = 1 / denom;
    return {
        x: v[0] * scale,
        y: v[1] * scale,
        z: v[2] * scale,
        denom,
    };
}
