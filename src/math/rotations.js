/**
 * Rotation Utilities - Functional API for 4D rotation matrices
 *
 * Uses Float64 (native JS number) precision for CPU-side math.
 * The Mat4x4 class uses Float32Array for GPU upload, but these
 * utilities preserve full double precision for iterative algorithms.
 */

/**
 * Canonical rotation plane names in order: XY, XZ, YZ, XW, YW, ZW
 */
export const ROTATION_PLANES = ['XY', 'XZ', 'YZ', 'XW', 'YW', 'ZW'];

// Axis indices for each rotation plane
const PLANE_AXES = {
    XY: [0, 1],
    XZ: [0, 2],
    YZ: [1, 2],
    XW: [0, 3],
    YW: [1, 3],
    ZW: [2, 3],
};

/**
 * Create a 4D rotation matrix for a given plane and angle.
 * Returns a 16-element Float64 array (column-major).
 *
 * @param {string} plane - One of 'XY','XZ','YZ','XW','YW','ZW'
 * @param {number} angle - Radians
 * @returns {number[]} 16-element column-major matrix
 */
export function createRotationMatrix4D(plane, angle) {
    const upper = plane.toUpperCase();
    const axes = PLANE_AXES[upper];
    if (!axes) throw new Error(`Invalid rotation plane: ${plane}`);

    // Start with identity
    const m = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];

    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const [a, b] = axes;

    // Column-major: element at (row, col) = m[col * 4 + row]
    m[a * 4 + a] = c;
    m[a * 4 + b] = s;
    m[b * 4 + a] = -s;
    m[b * 4 + b] = c;

    return m;
}

/**
 * Return a 16-element identity matrix.
 * @returns {number[]}
 */
export function identityMatrix4x4() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}

/**
 * Multiply two 16-element column-major matrices (Float64).
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number[]}
 */
export function multiplyMatrix4x4(a, b) {
    const result = new Array(16);
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) {
                sum += a[k * 4 + row] * b[col * 4 + k];
            }
            result[col * 4 + row] = sum;
        }
    }
    return result;
}

/**
 * Transpose a 16-element column-major matrix.
 * @param {number[]} m
 * @returns {number[]}
 */
export function transposeMatrix4x4(m) {
    return [
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15],
    ];
}

/**
 * Apply a 16-element column-major matrix to a 4-element vector.
 * @param {number[]} m - 16-element matrix
 * @param {number[]} v - 4-element vector [x, y, z, w]
 * @returns {number[]} Transformed 4-element vector
 */
export function applyMatrix4x4(m, v) {
    const x = v[0], y = v[1], z = v[2], w = v[3];
    return [
        m[0] * x + m[4] * y + m[8] * z + m[12] * w,
        m[1] * x + m[5] * y + m[9] * z + m[13] * w,
        m[2] * x + m[6] * y + m[10] * z + m[14] * w,
        m[3] * x + m[7] * y + m[11] * z + m[15] * w,
    ];
}

/**
 * Compute the Euclidean length of a 4D vector.
 * @param {number[]} v
 * @returns {number}
 */
export function vectorLength4D(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2] + v[3] * v[3]);
}

/**
 * Normalize a 4D vector to unit length.
 * @param {number[]} v
 * @returns {number[]}
 */
export function normalizeVector4D(v) {
    const len = vectorLength4D(v);
    if (len < 1e-10) return [0, 0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len, v[3] / len];
}

/**
 * Normalize rotation angle keys to canonical uppercase plane names,
 * filling missing planes with 0.
 *
 * Accepts keys in any case (e.g. 'xy', 'XZ', 'zw').
 *
 * @param {object} angles - Sparse angle map
 * @returns {object} Full map with all 6 planes as uppercase keys
 */
export function normalizeRotationAngles(angles) {
    const result = {};
    for (const plane of ROTATION_PLANES) {
        result[plane] = 0;
    }
    for (const [key, value] of Object.entries(angles)) {
        const upper = key.toUpperCase();
        if (ROTATION_PLANES.includes(upper)) {
            result[upper] = value;
        }
    }
    return result;
}

/**
 * Create individual rotation matrices for all six planes from an angle map.
 * Missing planes default to angle 0 (identity rotation).
 *
 * @param {object} angles - Sparse angle map (any case keys)
 * @returns {object} Map of plane name -> 16-element matrix
 */
export function createRotationMatricesFromAngles(angles) {
    const normalized = normalizeRotationAngles(angles);
    const result = {};
    for (const plane of ROTATION_PLANES) {
        result[plane] = createRotationMatrix4D(plane, normalized[plane]);
    }
    return result;
}

/**
 * Compose a single rotation matrix from an angle map by multiplying
 * individual plane rotations in canonical order (XY*XZ*YZ*XW*YW*ZW).
 *
 * @param {object} angles - Sparse angle map (any case keys)
 * @returns {number[]} 16-element composed rotation matrix
 */
export function composeRotationMatrixFromAngles(angles) {
    const normalized = normalizeRotationAngles(angles);
    let result = identityMatrix4x4();
    for (const plane of ROTATION_PLANES) {
        if (normalized[plane] !== 0) {
            result = multiplyMatrix4x4(result, createRotationMatrix4D(plane, normalized[plane]));
        }
    }
    return result;
}
