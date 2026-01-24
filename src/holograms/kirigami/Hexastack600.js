/**
 * Hexastack600 - 6-Layer Constellation Manager for the 600-Cell
 *
 * The Hexastack is the core architecture of the Holographic Hyper-Computer.
 * It manages 6 layers (5 structural + 1 pilot) of 4D hyperspace entities.
 *
 * Architecture:
 * - Layers 0-4: The 5 disjoint 24-cells that compose the 600-cell
 * - Layer 5: The "Pilot" or "Integrator" layer (ghost/dual)
 *
 * The 600-cell's 120 vertices partition into exactly 5 sets of 24,
 * each forming a complete 24-cell. The sixth layer acts as a control
 * surface for navigating the phase space.
 *
 * This class orchestrates:
 * - Data signal distribution to layers (the "Brain")
 * - Global coherence/synchronization
 * - Inter-layer communication
 * - Batch rendering preparation
 *
 * @module holograms/kirigami/Hexastack600
 */

import { Rotor4D } from '../../math/Rotor4D.js';
import { KirigamiLayer, KirigamiState, BIVECTOR_CHANNELS } from './KirigamiLayer.js';
import { generate600CellOffsetRotations } from '../../geometry/generators/Cell24.js';

/**
 * Data channel to visual effect mapping
 * Based on HHC specification Table 8.1
 */
export const CHANNEL_EFFECTS = {
    0: { plane: 'XY', role: 'Planar Rotation', visual: 'Flat Spin / Disc Rotation' },
    1: { plane: 'ZW', role: 'Orthogonal Planar', visual: '"Inside-Out" Rotation' },
    2: { plane: 'XZ', role: 'Cross Rotation A', visual: 'Shear / Skew left' },
    3: { plane: 'YW', role: 'Cross Rotation B', visual: 'Shear / Skew right' },
    4: { plane: 'XW', role: 'Hyper Rotation A', visual: 'Volumetric Expansion' },
    5: { plane: 'YZ', role: 'Hyper Rotation B', visual: 'Volumetric Contraction' }
};

/**
 * Hexastack600 - The 6-Layer 600-Cell Constellation
 */
export class Hexastack600 {
    /**
     * Create the Hexastack constellation
     *
     * @param {Object} options - Configuration options
     * @param {number} options.scale - Overall scale (default 1)
     * @param {boolean} options.smoothTransitions - Enable smooth state transitions
     * @param {number} options.coherence - Global coherence factor (0-1)
     */
    constructor(options = {}) {
        this.scale = options.scale || 1;
        this.smoothTransitions = options.smoothTransitions ?? true;

        // Global coherence factor (0 = independent, 1 = fully synchronized)
        this.coherence = options.coherence ?? 0.5;

        // Layer array
        this.layers = [];

        // Data signal buffer (6 channels)
        this.dataChannels = new Float32Array(6);

        // Signal processing state
        this.signalHistory = [];
        this.historyLength = 60; // 1 second at 60fps

        // Timing
        this.lastUpdateTime = 0;
        this.time = 0;

        // Initialize layers
        this.initializeLayers();

        // Computational focus (which trilatic subset is active)
        this.computationalFocus = 'alpha'; // 'alpha', 'beta', 'gamma', or 'all'
    }

    /**
     * Initialize the 6 Kirigami layers
     */
    initializeLayers() {
        const offsetRotations = generate600CellOffsetRotations();

        for (let i = 0; i < 6; i++) {
            let offsetRotation;

            if (i < 5) {
                // Layers 0-4: Structural layers (the 5 disjoint 24-cells)
                const rot = offsetRotations[i];
                offsetRotation = Rotor4D.fromEuler6(rot.bivectorAngles);
            } else {
                // Layer 5: Pilot/Integrator (ghost layer)
                // Uses identity rotation but will have special behavior
                offsetRotation = Rotor4D.identity();
            }

            const layer = new KirigamiLayer(i, offsetRotation, {
                scale: this.scale,
                smoothTransition: this.smoothTransitions,
                transitionSpeed: 0.1
            });

            // Set up channel bindings for each layer
            layer.channelBindings = {
                left: i,
                right: (i + 1) % 6,
                fold: (i + 2) % 6
            };

            this.layers.push(layer);
        }
    }

    /**
     * Process incoming data signal
     * This is the "Brain" of the HHC - maps data to geometry
     *
     * @param {number[]} data - Array of data values (6 channels)
     */
    processSignal(data) {
        // Ensure we have 6 channels
        const normalizedData = new Float32Array(6);
        for (let i = 0; i < 6; i++) {
            normalizedData[i] = Math.max(0, Math.min(1, data[i] || 0));
        }

        // Store in data channels
        this.dataChannels.set(normalizedData);

        // Add to history
        this.signalHistory.push([...normalizedData]);
        if (this.signalHistory.length > this.historyLength) {
            this.signalHistory.shift();
        }

        // Calculate derivative (rate of change) and integral (accumulation)
        const derivatives = this.calculateDerivatives();
        const integrals = this.calculateIntegrals();

        // Process each layer
        const now = performance.now();
        const deltaTime = this.lastUpdateTime ? (now - this.lastUpdateTime) / 1000 : 1/60;
        this.lastUpdateTime = now;
        this.time += deltaTime;

        for (const layer of this.layers) {
            // Mix original data with derivatives and integrals
            const layerData = new Float32Array(6);

            for (let i = 0; i < 6; i++) {
                // Base signal
                let value = normalizedData[i];

                // Add derivative influence (for responsive motion)
                value += derivatives[i] * 0.3;

                // Apply coherence (pull toward average across channels)
                const average = normalizedData.reduce((a, b) => a + b, 0) / 6;
                value = value * (1 - this.coherence) + average * this.coherence;

                layerData[i] = Math.max(0, Math.min(1, value));
            }

            layer.update(layerData, deltaTime);
        }
    }

    /**
     * Calculate signal derivatives (rate of change)
     *
     * @returns {Float32Array} Derivative for each channel
     */
    calculateDerivatives() {
        const derivatives = new Float32Array(6);

        if (this.signalHistory.length < 2) {
            return derivatives;
        }

        const current = this.signalHistory[this.signalHistory.length - 1];
        const previous = this.signalHistory[this.signalHistory.length - 2];

        for (let i = 0; i < 6; i++) {
            derivatives[i] = current[i] - previous[i];
        }

        return derivatives;
    }

    /**
     * Calculate signal integrals (accumulation over time)
     *
     * @returns {Float32Array} Integral for each channel
     */
    calculateIntegrals() {
        const integrals = new Float32Array(6);

        for (const frame of this.signalHistory) {
            for (let i = 0; i < 6; i++) {
                integrals[i] += frame[i];
            }
        }

        // Normalize by history length
        for (let i = 0; i < 6; i++) {
            integrals[i] /= this.signalHistory.length;
        }

        return integrals;
    }

    /**
     * Set global rotation for all layers
     * Uses the VIB3 6D parameter format
     *
     * @param {Object} params - Rotation parameters
     */
    setRotation(params) {
        const angles = {
            xy: params.rot4dXY || 0,
            xz: params.rot4dXZ || 0,
            yz: params.rot4dYZ || 0,
            xw: params.rot4dXW || 0,
            yw: params.rot4dYW || 0,
            zw: params.rot4dZW || 0
        };

        for (const layer of this.layers) {
            layer.setRotationFromAngles(angles);
        }
    }

    /**
     * Set all layers to specific kirigami state
     *
     * @param {KirigamiState} state - Target state
     * @param {boolean} immediate - Skip transition animation
     */
    setAllStates(state, immediate = false) {
        for (const layer of this.layers) {
            layer.setState(state, immediate);
        }
    }

    /**
     * Set computational focus (which trilatic subset is highlighted)
     *
     * @param {'alpha' | 'beta' | 'gamma' | 'all'} focus
     */
    setComputationalFocus(focus) {
        this.computationalFocus = focus;
    }

    /**
     * Get a specific layer
     *
     * @param {number} index - Layer index (0-5)
     * @returns {KirigamiLayer}
     */
    getLayer(index) {
        return this.layers[index % 6];
    }

    /**
     * Get all vertices across all layers
     *
     * @returns {Vec4[]} Combined vertex array
     */
    getAllVertices() {
        const vertices = [];
        for (const layer of this.layers) {
            vertices.push(...layer.vertices);
        }
        return vertices;
    }

    /**
     * Get render batch for all layers
     * Used by the rendering pipeline
     *
     * @returns {Object[]} Array of render data objects
     */
    getRenderBatch() {
        return this.layers.map(layer => layer.getRenderData());
    }

    /**
     * Get combined uniform buffer for GPU rendering
     *
     * @returns {Float32Array} Packed uniform data for all 6 layers
     */
    getCombinedUniformBuffer() {
        // 32 floats per layer * 6 layers = 192 floats
        const buffer = new Float32Array(192);

        for (let i = 0; i < 6; i++) {
            const layerData = this.layers[i].getUniformData();
            buffer.set(layerData, i * 32);
        }

        return buffer;
    }

    /**
     * Get statistics about the current state
     *
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const stateCount = {
            [KirigamiState.GROUNDED]: 0,
            [KirigamiState.FOLDED]: 0,
            [KirigamiState.DEPLOYED]: 0
        };

        let totalScale = 0;
        let totalZOffset = 0;

        for (const layer of this.layers) {
            stateCount[layer.state]++;
            totalScale += layer.currentScale;
            totalZOffset += layer.zOffset;
        }

        return {
            layerCount: 6,
            vertexCount: 6 * 24, // 144 vertices total
            stateDistribution: stateCount,
            averageScale: totalScale / 6,
            averageZOffset: totalZOffset / 6,
            coherence: this.coherence,
            computationalFocus: this.computationalFocus,
            signalHistory: this.signalHistory.length
        };
    }

    /**
     * Reset all layers to initial state
     */
    reset() {
        for (const layer of this.layers) {
            layer.reset();
        }
        this.dataChannels.fill(0);
        this.signalHistory = [];
        this.time = 0;
    }

    /**
     * Animate a "breathing" pattern through the layers
     * Used for idle/demo mode
     *
     * @param {number} speed - Breathing speed multiplier
     */
    animateBreathing(speed = 1) {
        const time = this.time * speed;

        for (let i = 0; i < 6; i++) {
            const layer = this.layers[i];

            // Phase offset per layer creates wave effect
            const phase = (time + i * Math.PI / 3) % (Math.PI * 2);

            // Breathing scale (oscillates between 0.5 and 1.0)
            const breathScale = 0.75 + 0.25 * Math.sin(phase);
            layer.targetScale = breathScale;

            // Subtle rotation
            const rotAngle = Math.sin(phase * 0.5) * 0.2;
            layer.qLeft = Rotor4D.fromPlaneAngle(layer.getRotationPlane(), rotAngle);
        }
    }

    /**
     * Create data signal from audio frequency bands
     *
     * @param {Object} audioData - {bass, mid, high, energy, rhythm, melody}
     * @returns {Float32Array} 6-channel data signal
     */
    static audioToSignal(audioData) {
        return new Float32Array([
            audioData.bass || 0,        // Channel 0: XY - Bass controls flat spin
            audioData.energy || 0,      // Channel 1: ZW - Energy controls inside-out
            audioData.mid || 0,         // Channel 2: XZ - Mids control shear left
            audioData.melody || 0,      // Channel 3: YW - Melody controls shear right
            audioData.rhythm || 0,      // Channel 4: XW - Rhythm controls expansion
            audioData.high || 0         // Channel 5: YZ - Highs control contraction
        ]);
    }

    /**
     * Serialize hexastack state
     *
     * @returns {Object} Serializable state
     */
    toJSON() {
        return {
            scale: this.scale,
            coherence: this.coherence,
            computationalFocus: this.computationalFocus,
            dataChannels: Array.from(this.dataChannels),
            layers: this.layers.map(l => l.toJSON())
        };
    }

    /**
     * Deserialize hexastack state
     *
     * @param {Object} json - Serialized state
     */
    fromJSON(json) {
        this.scale = json.scale;
        this.coherence = json.coherence;
        this.computationalFocus = json.computationalFocus;
        this.dataChannels = new Float32Array(json.dataChannels);

        for (let i = 0; i < 6; i++) {
            this.layers[i].fromJSON(json.layers[i]);
        }
    }

    /**
     * Dispose of resources
     */
    destroy() {
        this.layers = [];
        this.signalHistory = [];
        this.dataChannels = null;
    }
}

export default Hexastack600;
