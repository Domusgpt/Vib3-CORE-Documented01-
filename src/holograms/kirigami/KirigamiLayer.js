/**
 * KirigamiLayer - Topological Folding Logic for 4D Geometry
 *
 * Implements the "Kirigami" aspect of the Holographic Hyper-Computer.
 * Unlike origami (fold only), kirigami involves cutting AND folding.
 * In this computational model:
 * - "Cutting" = discreteness of layers (separate 24-cells)
 * - "Folding" = dynamic scaling of vertices toward cell center
 *
 * The specification imposes strict rules: vertex scale can only be 0, 0.5, or 1.0
 * This creates a TRINARY LOGIC GATE system:
 * - State 0 (Grounded/Dormant): Scale = 0.0 - Collapsed to singularity
 * - State 1 (Folded/Resonant): Scale = 0.5 - Half-extension, high-tension
 * - State 2 (Deployed/Conductive): Scale = 1.0 - Full expansion
 *
 * Transitions are driven by the INTEGRAL of data stress (accumulation).
 *
 * @module holograms/kirigami/KirigamiLayer
 */

import { Vec4 } from '../../math/Vec4.js';
import { Rotor4D } from '../../math/Rotor4D.js';
import {
    generate24CellVertices,
    get24CellTrilaticDecomposition,
    generate24CellEdges
} from '../../geometry/generators/Cell24.js';
import { getLayerColor, HEXASTACK_COLORS } from '../../geometry/generators/Cell600.js';

/**
 * Kirigami state enumeration
 * @enum {number}
 */
export const KirigamiState = {
    GROUNDED: 0,  // Scale 0.0 - Singularity/Void
    FOLDED: 1,    // Scale 0.5 - Tense/Resonant
    DEPLOYED: 2   // Scale 1.0 - Full 24-Cell
};

/**
 * Scale values corresponding to each state
 */
export const STATE_SCALES = {
    [KirigamiState.GROUNDED]: 0.0,
    [KirigamiState.FOLDED]: 0.5,
    [KirigamiState.DEPLOYED]: 1.0
};

/**
 * Data channel to bivector plane mapping
 * Implements the HHC "Brain" - linear data channels to 4D rotation planes
 */
export const BIVECTOR_CHANNELS = {
    0: 'XY',  // Planar Rotation - Flat Spin / Disc Rotation
    1: 'ZW',  // Orthogonal Planar - "Inside-Out" Rotation
    2: 'XZ',  // Cross Rotation A - Shear / Skew left
    3: 'YW',  // Cross Rotation B - Shear / Skew right
    4: 'XW',  // Hyper Rotation A - Volumetric Expansion
    5: 'YZ'   // Hyper Rotation B - Volumetric Contraction
};

/**
 * KirigamiLayer class - Single layer of the Hexastack
 *
 * Manages:
 * - One 24-cell with its trilatic decomposition (Alpha/Beta/Gamma)
 * - Isoclinic rotation pair (q_left, q_right)
 * - Kirigami state (trinary scale)
 * - Data channel bindings
 */
export class KirigamiLayer {
    /**
     * Create a new Kirigami layer
     *
     * @param {number} id - Layer index (0-5)
     * @param {Rotor4D} offsetRotation - Initial rotation offset for epitaxial assembly
     * @param {Object} options - Configuration options
     */
    constructor(id, offsetRotation = null, options = {}) {
        this.id = id;

        // Generate base 24-cell geometry
        this.baseVertices = generate24CellVertices(options.scale || 1);
        this.edges = generate24CellEdges(this.baseVertices, options.scale || 1);
        this.trilatic = get24CellTrilaticDecomposition(options.scale || 1);

        // Transformed vertices (after rotation and scaling)
        this.vertices = this.baseVertices.map(v => v.clone());

        // Offset rotation for epitaxial positioning (defines which 24-cell in the 600-cell)
        this.offsetRotation = offsetRotation || Rotor4D.identity();

        // Isoclinic rotation quaternion pair
        // v' = q_left * v * q_right†
        // This allows for double rotations in 4D
        this.qLeft = Rotor4D.identity();
        this.qRight = Rotor4D.identity();

        // Kirigami state
        this.state = KirigamiState.DEPLOYED;
        this.currentScale = 1.0;
        this.targetScale = 1.0;

        // Smooth transition settings
        this.transitionSpeed = options.transitionSpeed || 0.1;
        this.enableSmoothTransition = options.smoothTransition ?? true;

        // Data channel bindings
        // Each layer can have different channel mappings
        this.channelBindings = {
            left: (id * 2) % 6,      // Left rotation channel
            right: (id * 2 + 1) % 6, // Right rotation channel
            fold: id                  // Folding/scale channel
        };

        // Z-offset for volumetric extrusion ("Z-Worm" effect)
        this.zOffset = 0;

        // Layer color (from HEXASTACK_COLORS)
        this.color = getLayerColor(id);
        this.colorSecondary = getLayerColor(id, true);
        this.colorInfo = HEXASTACK_COLORS[id % 6];

        // Data stress accumulator for state transitions
        this.stressAccumulator = 0;
        this.stressThresholdFolded = 0.33;
        this.stressThresholdDeployed = 0.66;

        // Compute initial transformation
        this.updateGeometry();
    }

    /**
     * Get the current axis for rotation based on layer ID
     * Each layer has a preferred rotation axis for visual distinction
     *
     * @returns {string} Bivector plane name
     */
    getRotationPlane() {
        const planes = ['XY', 'ZW', 'XZ', 'YW', 'XW', 'YZ'];
        return planes[this.id % 6];
    }

    /**
     * Update layer from data signal
     * This is the main input method for the HHC
     *
     * @param {number[]} data - Array of data values (one per channel)
     * @param {number} deltaTime - Time since last update (for smoothing)
     */
    update(data, deltaTime = 1/60) {
        // 1. Update Isoclinic Rotation
        const leftVal = data[this.channelBindings.left] || 0;
        const rightVal = data[this.channelBindings.right] || 0;

        // Map scalar data to rotation angle
        // Data range [0, 1] maps to angle [0, 2π]
        const leftAngle = leftVal * Math.PI * 2;
        const rightAngle = rightVal * Math.PI * 2;

        // Create rotors in the layer's preferred plane
        const plane = this.getRotationPlane();
        this.qLeft = Rotor4D.fromPlaneAngle(plane, leftAngle);

        // Right rotation uses complementary plane for interesting motion
        const rightPlane = this.getComplementaryPlane(plane);
        this.qRight = Rotor4D.fromPlaneAngle(rightPlane, rightAngle);

        // 2. Update Kirigami State (Integral/Accumulator logic)
        const foldSignal = data[this.channelBindings.fold] || 0;

        // Accumulate stress
        this.stressAccumulator = this.stressAccumulator * 0.95 + foldSignal * 0.05;

        // Determine target state based on accumulated stress
        if (this.stressAccumulator > this.stressThresholdDeployed) {
            this.state = KirigamiState.DEPLOYED;
            this.targetScale = STATE_SCALES[KirigamiState.DEPLOYED];
        } else if (this.stressAccumulator > this.stressThresholdFolded) {
            this.state = KirigamiState.FOLDED;
            this.targetScale = STATE_SCALES[KirigamiState.FOLDED];
        } else {
            this.state = KirigamiState.GROUNDED;
            this.targetScale = STATE_SCALES[KirigamiState.GROUNDED];
        }

        // 3. Smooth scale transition
        if (this.enableSmoothTransition) {
            const scaleSpeed = this.transitionSpeed * deltaTime * 60;
            this.currentScale += (this.targetScale - this.currentScale) * scaleSpeed;
        } else {
            this.currentScale = this.targetScale;
        }

        // 4. Update Z-offset for volumetric extrusion
        // Higher data values push the layer along Z
        const avgData = data.reduce((a, b) => a + b, 0) / data.length;
        this.zOffset = avgData * 2.0; // Scale factor for Z extrusion

        // 5. Recompute transformed vertices
        this.updateGeometry();
    }

    /**
     * Get complementary bivector plane for double rotation
     *
     * @param {string} plane - Input plane
     * @returns {string} Complementary plane
     */
    getComplementaryPlane(plane) {
        const complements = {
            'XY': 'ZW',
            'ZW': 'XY',
            'XZ': 'YW',
            'YW': 'XZ',
            'XW': 'YZ',
            'YZ': 'XW'
        };
        return complements[plane] || 'ZW';
    }

    /**
     * Set kirigami state directly (for manual control)
     *
     * @param {KirigamiState} state - New state
     * @param {boolean} immediate - Skip transition
     */
    setState(state, immediate = false) {
        this.state = state;
        this.targetScale = STATE_SCALES[state];

        if (immediate) {
            this.currentScale = this.targetScale;
            this.updateGeometry();
        }
    }

    /**
     * Set isoclinic rotation directly
     *
     * @param {Rotor4D} left - Left rotor
     * @param {Rotor4D} right - Right rotor
     */
    setRotation(left, right) {
        this.qLeft = left;
        this.qRight = right;
        this.updateGeometry();
    }

    /**
     * Set rotation from 6D angles (parameter format)
     *
     * @param {Object} angles - {xy, xz, yz, xw, yw, zw}
     */
    setRotationFromAngles(angles) {
        // Combine all angles into left rotor
        this.qLeft = Rotor4D.fromEuler6(angles);
        // Right rotor can be identity for simple rotation
        // or set to create double rotation
        this.qRight = Rotor4D.identity();
        this.updateGeometry();
    }

    /**
     * Recompute transformed vertices
     * Applies: offset rotation, isoclinic rotation, scaling, z-extrusion
     */
    updateGeometry() {
        // Combined rotation: offset * left rotation
        const combinedLeft = this.offsetRotation.multiply(this.qLeft);

        for (let i = 0; i < this.baseVertices.length; i++) {
            // Start with base vertex
            let v = this.baseVertices[i].clone();

            // Apply combined left rotation
            v = combinedLeft.rotate(v);

            // Apply right rotation (conjugate/reverse for sandwich product)
            v = this.qRight.rotate(v);

            // Apply kirigami scaling (toward origin)
            v.x *= this.currentScale;
            v.y *= this.currentScale;
            v.z *= this.currentScale;
            v.w *= this.currentScale;

            // Store transformed vertex
            this.vertices[i] = v;
        }
    }

    /**
     * Get vertices for a specific trilatic subset
     *
     * @param {'alpha' | 'beta' | 'gamma'} subset - Which trilatic subset
     * @returns {Vec4[]} Transformed vertices for that subset
     */
    getTrilaticVertices(subset) {
        const indices = this.getTrilaticIndices(subset);
        return indices.map(i => this.vertices[i]);
    }

    /**
     * Get vertex indices for a trilatic subset
     *
     * @param {'alpha' | 'beta' | 'gamma'} subset
     * @returns {number[]} Vertex indices
     */
    getTrilaticIndices(subset) {
        // Alpha: indices 0-7 (axial vertices)
        // Beta: indices 8-15 (even sign product)
        // Gamma: indices 16-23 (odd sign product)
        switch (subset) {
            case 'alpha':
                return Array.from({ length: 8 }, (_, i) => i);
            case 'beta':
                return Array.from({ length: 8 }, (_, i) => i + 8);
            case 'gamma':
                return Array.from({ length: 8 }, (_, i) => i + 16);
            default:
                return [];
        }
    }

    /**
     * Get render data for this layer
     *
     * @returns {Object} Data needed for rendering
     */
    getRenderData() {
        return {
            id: this.id,
            vertices: this.vertices,
            edges: this.edges,
            state: this.state,
            scale: this.currentScale,
            zOffset: this.zOffset,
            color: this.color,
            colorSecondary: this.colorSecondary,
            colorInfo: this.colorInfo,

            // Rotation matrices for shader
            rotationMatrix: this.qLeft.toMatrix(),
            rightRotationMatrix: this.qRight.toMatrix(),

            // Trilatic data for computational focus visualization
            trilatic: {
                alpha: this.getTrilaticIndices('alpha'),
                beta: this.getTrilaticIndices('beta'),
                gamma: this.getTrilaticIndices('gamma')
            }
        };
    }

    /**
     * Get uniform buffer data for GPU rendering
     *
     * @returns {Float32Array} Packed uniform data
     */
    getUniformData() {
        const data = new Float32Array(32);

        // 0-15: Rotation matrix (4x4)
        const rotMatrix = this.qLeft.toMatrix();
        data.set(rotMatrix, 0);

        // 16: Scale
        data[16] = this.currentScale;

        // 17: Z-offset
        data[17] = this.zOffset;

        // 18: Layer ID
        data[18] = this.id;

        // 19: State
        data[19] = this.state;

        // 20-23: Primary color (RGBA)
        data[20] = this.color[0] / 255;
        data[21] = this.color[1] / 255;
        data[22] = this.color[2] / 255;
        data[23] = 1.0;

        // 24-27: Secondary color (RGBA)
        data[24] = this.colorSecondary[0] / 255;
        data[25] = this.colorSecondary[1] / 255;
        data[26] = this.colorSecondary[2] / 255;
        data[27] = 1.0;

        // 28-31: Reserved for future use
        data[28] = 0;
        data[29] = 0;
        data[30] = 0;
        data[31] = 0;

        return data;
    }

    /**
     * Reset layer to initial state
     */
    reset() {
        this.state = KirigamiState.DEPLOYED;
        this.currentScale = 1.0;
        this.targetScale = 1.0;
        this.stressAccumulator = 0;
        this.zOffset = 0;
        this.qLeft = Rotor4D.identity();
        this.qRight = Rotor4D.identity();
        this.updateGeometry();
    }

    /**
     * Clone this layer
     *
     * @returns {KirigamiLayer} New layer with same configuration
     */
    clone() {
        const layer = new KirigamiLayer(this.id, this.offsetRotation.clone());
        layer.state = this.state;
        layer.currentScale = this.currentScale;
        layer.targetScale = this.targetScale;
        layer.qLeft = this.qLeft.clone();
        layer.qRight = this.qRight.clone();
        layer.zOffset = this.zOffset;
        layer.updateGeometry();
        return layer;
    }

    /**
     * Serialize layer state
     *
     * @returns {Object} Serializable state
     */
    toJSON() {
        return {
            id: this.id,
            state: this.state,
            scale: this.currentScale,
            zOffset: this.zOffset,
            qLeft: this.qLeft.toJSON(),
            qRight: this.qRight.toJSON(),
            offsetRotation: this.offsetRotation.toJSON(),
            stressAccumulator: this.stressAccumulator
        };
    }

    /**
     * Deserialize layer state
     *
     * @param {Object} json - Serialized state
     */
    fromJSON(json) {
        this.state = json.state;
        this.currentScale = json.scale;
        this.targetScale = STATE_SCALES[json.state];
        this.zOffset = json.zOffset;
        this.qLeft = Rotor4D.fromJSON(json.qLeft);
        this.qRight = Rotor4D.fromJSON(json.qRight);
        this.offsetRotation = Rotor4D.fromJSON(json.offsetRotation);
        this.stressAccumulator = json.stressAccumulator;
        this.updateGeometry();
    }
}

export default KirigamiLayer;
