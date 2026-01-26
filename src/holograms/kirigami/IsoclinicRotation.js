/**
 * IsoclinicRotation - 4D Rotation Utilities via Quaternion Pairs
 *
 * In 4D space, rotations occur around planes (bivectors), not axes.
 * A general 4D rotation can be decomposed into two "isoclinic" rotations:
 * - Left-Isoclinic (L)
 * - Right-Isoclinic (R)
 *
 * The rotation formula: v' = L * v * R†
 * where R† is the conjugate of R.
 *
 * This is more powerful than 3D rotation because:
 * - If L = R: Simple rotation (like 3D extended to 4D)
 * - If L = Identity: Pure right-isoclinic rotation
 * - If R = Identity: Pure left-isoclinic rotation
 * - If L ≠ R: Double rotation (unique to 4D)
 *
 * This module provides utilities for creating and composing isoclinic rotations,
 * which is essential for the HHC's "2 directions with data inputs" per layer.
 *
 * @module holograms/kirigami/IsoclinicRotation
 */

import { Vec4 } from '../../math/Vec4.js';

/**
 * Quaternion class for isoclinic rotation calculations
 */
export class Quaternion {
    /**
     * Create a quaternion
     *
     * @param {number} w - Real part
     * @param {number} x - i component
     * @param {number} y - j component
     * @param {number} z - k component
     */
    constructor(w = 1, x = 0, y = 0, z = 0) {
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * Create identity quaternion
     *
     * @returns {Quaternion}
     */
    static identity() {
        return new Quaternion(1, 0, 0, 0);
    }

    /**
     * Create from axis-angle representation
     *
     * @param {Object} axis - {x, y, z} normalized axis
     * @param {number} angle - Rotation angle in radians
     * @returns {Quaternion}
     */
    static fromAxisAngle(axis, angle) {
        const halfAngle = angle / 2;
        const s = Math.sin(halfAngle);
        return new Quaternion(
            Math.cos(halfAngle),
            axis.x * s,
            axis.y * s,
            axis.z * s
        );
    }

    /**
     * Create from rotation plane and angle
     *
     * @param {string} plane - 'XY', 'XZ', 'YZ', 'XW', 'YW', 'ZW'
     * @param {number} angle - Rotation angle in radians
     * @returns {Quaternion}
     */
    static fromPlaneAngle(plane, angle) {
        const halfAngle = angle / 2;
        const c = Math.cos(halfAngle);
        const s = Math.sin(halfAngle);

        // Map planes to quaternion components
        // Note: These map bivector planes to quaternion representation
        switch (plane) {
            case 'XY':
                return new Quaternion(c, 0, 0, s);
            case 'XZ':
                return new Quaternion(c, 0, s, 0);
            case 'YZ':
                return new Quaternion(c, s, 0, 0);
            case 'XW':
                return new Quaternion(c, s, 0, 0);
            case 'YW':
                return new Quaternion(c, 0, s, 0);
            case 'ZW':
                return new Quaternion(c, 0, 0, s);
            default:
                return Quaternion.identity();
        }
    }

    /**
     * Multiply two quaternions: this * other
     *
     * @param {Quaternion} other
     * @returns {Quaternion}
     */
    multiply(other) {
        return new Quaternion(
            this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z,
            this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y,
            this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x,
            this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w
        );
    }

    /**
     * Conjugate (inverse for unit quaternion)
     *
     * @returns {Quaternion}
     */
    conjugate() {
        return new Quaternion(this.w, -this.x, -this.y, -this.z);
    }

    /**
     * Normalize to unit quaternion
     *
     * @returns {Quaternion}
     */
    normalize() {
        const len = Math.sqrt(this.w*this.w + this.x*this.x + this.y*this.y + this.z*this.z);
        if (len < 1e-10) return Quaternion.identity();
        return new Quaternion(this.w/len, this.x/len, this.y/len, this.z/len);
    }

    /**
     * Convert to 4x4 rotation matrix
     *
     * @returns {Float32Array} Column-major 4x4 matrix
     */
    toMatrix() {
        const { w, x, y, z } = this;

        const xx = x * x, yy = y * y, zz = z * z;
        const xy = x * y, xz = x * z, yz = y * z;
        const wx = w * x, wy = w * y, wz = w * z;

        return new Float32Array([
            1 - 2*(yy + zz), 2*(xy + wz),     2*(xz - wy),     0,
            2*(xy - wz),     1 - 2*(xx + zz), 2*(yz + wx),     0,
            2*(xz + wy),     2*(yz - wx),     1 - 2*(xx + yy), 0,
            0,               0,               0,               1
        ]);
    }

    /**
     * Clone this quaternion
     *
     * @returns {Quaternion}
     */
    clone() {
        return new Quaternion(this.w, this.x, this.y, this.z);
    }
}

/**
 * Isoclinic rotation pair for 4D
 */
export class IsoclinicPair {
    /**
     * Create an isoclinic rotation pair
     *
     * @param {Quaternion} left - Left-isoclinic quaternion
     * @param {Quaternion} right - Right-isoclinic quaternion
     */
    constructor(left = null, right = null) {
        this.left = left || Quaternion.identity();
        this.right = right || Quaternion.identity();
    }

    /**
     * Create identity (no rotation)
     *
     * @returns {IsoclinicPair}
     */
    static identity() {
        return new IsoclinicPair();
    }

    /**
     * Create simple rotation (both left and right equal)
     *
     * @param {string} plane - Rotation plane
     * @param {number} angle - Rotation angle
     * @returns {IsoclinicPair}
     */
    static simpleRotation(plane, angle) {
        const q = Quaternion.fromPlaneAngle(plane, angle);
        return new IsoclinicPair(q, q.clone());
    }

    /**
     * Create left-isoclinic rotation only
     *
     * @param {string} plane - Rotation plane
     * @param {number} angle - Rotation angle
     * @returns {IsoclinicPair}
     */
    static leftOnly(plane, angle) {
        return new IsoclinicPair(Quaternion.fromPlaneAngle(plane, angle), Quaternion.identity());
    }

    /**
     * Create right-isoclinic rotation only
     *
     * @param {string} plane - Rotation plane
     * @param {number} angle - Rotation angle
     * @returns {IsoclinicPair}
     */
    static rightOnly(plane, angle) {
        return new IsoclinicPair(Quaternion.identity(), Quaternion.fromPlaneAngle(plane, angle));
    }

    /**
     * Create double rotation (left and right different)
     *
     * @param {string} leftPlane - Left rotation plane
     * @param {number} leftAngle - Left rotation angle
     * @param {string} rightPlane - Right rotation plane
     * @param {number} rightAngle - Right rotation angle
     * @returns {IsoclinicPair}
     */
    static doubleRotation(leftPlane, leftAngle, rightPlane, rightAngle) {
        return new IsoclinicPair(
            Quaternion.fromPlaneAngle(leftPlane, leftAngle),
            Quaternion.fromPlaneAngle(rightPlane, rightAngle)
        );
    }

    /**
     * Apply this rotation to a Vec4
     * Formula: v' = L * v * R†
     *
     * @param {Vec4} v - Input vector
     * @returns {Vec4} Rotated vector
     */
    rotate(v) {
        // Treat Vec4 as a quaternion for multiplication
        const vq = new Quaternion(0, v.x, v.y, v.z);

        // L * v
        const lv = this.left.multiply(vq);

        // (L * v) * R†
        const result = lv.multiply(this.right.conjugate());

        // Extract xyz components, keep original w
        return new Vec4(result.x, result.y, result.z, v.w);
    }

    /**
     * Apply 4D rotation including W component
     * Uses extended formulation for full 4D
     *
     * @param {Vec4} v - Input 4D vector
     * @returns {Vec4} Rotated 4D vector
     */
    rotate4D(v) {
        // For full 4D rotation, we need both rotors acting on all 4 components
        // This is a simplified version; see Rotor4D for full geometric algebra approach

        // Apply left rotation to XYZ
        const vq = new Quaternion(v.w, v.x, v.y, v.z);
        const lv = this.left.multiply(vq);
        const result = lv.multiply(this.right.conjugate());

        return new Vec4(result.x, result.y, result.z, result.w);
    }

    /**
     * Compose two isoclinic pairs
     *
     * @param {IsoclinicPair} other
     * @returns {IsoclinicPair}
     */
    compose(other) {
        return new IsoclinicPair(
            this.left.multiply(other.left),
            this.right.multiply(other.right)
        );
    }

    /**
     * Get left rotation matrix
     *
     * @returns {Float32Array}
     */
    getLeftMatrix() {
        return this.left.toMatrix();
    }

    /**
     * Get right rotation matrix
     *
     * @returns {Float32Array}
     */
    getRightMatrix() {
        return this.right.toMatrix();
    }

    /**
     * Clone this pair
     *
     * @returns {IsoclinicPair}
     */
    clone() {
        return new IsoclinicPair(this.left.clone(), this.right.clone());
    }
}

/**
 * DataBrain - Maps data channels to bivector rotations
 *
 * This is the "Brain" of the HHC that converts linear data
 * into the 6 rotation planes of 4D space.
 */
export class DataBrain {
    /**
     * Create the data brain
     *
     * @param {Object} options - Configuration
     */
    constructor(options = {}) {
        // Channel mapping (can be customized)
        this.channelMapping = options.channelMapping || {
            0: 'XY',  // Planar rotation
            1: 'ZW',  // Orthogonal planar
            2: 'XZ',  // Cross rotation A
            3: 'YW',  // Cross rotation B
            4: 'XW',  // Hyper rotation A
            5: 'YZ'   // Hyper rotation B
        };

        // Scale factor for data to angle conversion
        this.angleScale = options.angleScale || (Math.PI * 2);

        // Smoothing factor
        this.smoothing = options.smoothing || 0.1;

        // Current smoothed values
        this.smoothedData = new Float32Array(6);
    }

    /**
     * Process data into rotation pairs
     *
     * @param {number[]} data - 6-channel data array (0-1 range)
     * @returns {Object} Rotation data for all 6 planes
     */
    process(data) {
        // Smooth data
        for (let i = 0; i < 6; i++) {
            const target = data[i] || 0;
            this.smoothedData[i] += (target - this.smoothedData[i]) * this.smoothing;
        }

        // Create rotation for each channel
        const rotations = {};

        for (let i = 0; i < 6; i++) {
            const plane = this.channelMapping[i];
            const angle = this.smoothedData[i] * this.angleScale;

            rotations[plane] = {
                plane,
                angle,
                value: this.smoothedData[i]
            };
        }

        return rotations;
    }

    /**
     * Create isoclinic pair for a layer based on data
     *
     * @param {number} layerIndex - Layer index (0-5)
     * @param {number[]} data - 6-channel data
     * @returns {IsoclinicPair}
     */
    createLayerRotation(layerIndex, data) {
        // Each layer uses two channels for left/right isoclinic
        const leftChannel = (layerIndex * 2) % 6;
        const rightChannel = (layerIndex * 2 + 1) % 6;

        const leftPlane = this.channelMapping[leftChannel];
        const rightPlane = this.channelMapping[rightChannel];

        const leftAngle = (data[leftChannel] || 0) * this.angleScale;
        const rightAngle = (data[rightChannel] || 0) * this.angleScale;

        return IsoclinicPair.doubleRotation(leftPlane, leftAngle, rightPlane, rightAngle);
    }

    /**
     * Get the bivector plane name for a channel
     *
     * @param {number} channel - Channel index (0-5)
     * @returns {string} Plane name
     */
    getPlaneForChannel(channel) {
        return this.channelMapping[channel % 6];
    }

    /**
     * Reset smoothed values
     */
    reset() {
        this.smoothedData.fill(0);
    }
}

/**
 * Visual effect descriptions for each rotation plane
 */
export const PLANE_EFFECTS = {
    XY: { name: 'Planar Rotation', description: 'Flat Spin / Disc Rotation', color: '#FF0000' },
    ZW: { name: 'Orthogonal Planar', description: '"Inside-Out" Rotation', color: '#00FF00' },
    XZ: { name: 'Cross Rotation A', description: 'Shear / Skew left', color: '#0000FF' },
    YW: { name: 'Cross Rotation B', description: 'Shear / Skew right', color: '#FFFF00' },
    XW: { name: 'Hyper Rotation A', description: 'Volumetric Expansion', color: '#FF00FF' },
    YZ: { name: 'Hyper Rotation B', description: 'Volumetric Contraction', color: '#00FFFF' }
};

export default { Quaternion, IsoclinicPair, DataBrain, PLANE_EFFECTS };
