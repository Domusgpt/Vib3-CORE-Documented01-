/**
 * Kirigami Module - Epitaxial 600-Cell Kirigami Engine
 *
 * Holographic Hyper-Computer (HHC) Implementation
 *
 * Architecture:
 * - Hexastack600: 6-layer constellation of 24-cells forming 600-cell
 * - KirigamiLayer: Trinary state machine (0/0.5/1.0 scale)
 * - ExclusionPipeline: Multipass ping-pong rendering for exclusion blend
 * - IsoclinicRotation: 4D rotation via quaternion pairs
 *
 * This module implements an "Analog Computational Architecture" where
 * the geometry itself constitutes the computation.
 *
 * @module holograms/kirigami
 */

// Core layer management
export { KirigamiLayer, KirigamiState, STATE_SCALES, BIVECTOR_CHANNELS } from './KirigamiLayer.js';

// 6-layer constellation
export { Hexastack600, CHANNEL_EFFECTS } from './Hexastack600.js';

// Rendering pipeline
export { ExclusionPipeline } from './ExclusionPipeline.js';

// 4D rotation utilities
export { Quaternion, IsoclinicPair, DataBrain, PLANE_EFFECTS } from './IsoclinicRotation.js';

// Main system
export { KirigamiHyperComputer } from './KirigamiHyperComputer.js';

// Default export is the main system class
export { KirigamiHyperComputer as default } from './KirigamiHyperComputer.js';
