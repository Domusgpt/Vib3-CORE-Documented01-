/**
 * BettingGeometryEngine - Visual Computation for Betting Edge Detection
 *
 * This is NOT just visualization. The geometry IS the computation.
 *
 * Philosophy (from Kirigami HHC):
 * - Data is not merely displayed
 * - The geometry itself IS the computation
 * - Deformation, rotation, and folding constitute the computational process
 *
 * For betting:
 * - Each opportunity exists as a vertex in 4D "edge space"
 * - 6 betting signals map to 6 rotation planes
 * - When geometry reaches "attractor state" → execute
 * - Bot reads geometry, not numbers
 *
 * The 6 Channels for Betting (mapped to bivector planes):
 * - Channel 0 (XY): Edge Magnitude (modelProb - impliedProb)
 * - Channel 1 (ZW): Confidence Level (model certainty) - "inside-out" when low
 * - Channel 2 (XZ): Time Pressure (minutes until close) - shears with urgency
 * - Channel 3 (YW): Correlation Risk (exposure to related bets)
 * - Channel 4 (XW): Market Efficiency (sharp line = contracted, soft = expanded)
 * - Channel 5 (YZ): Value Momentum (edge growing/shrinking)
 *
 * @module BettingGeometryEngine
 * @version 1.0.0
 */

import { Vec4 } from '../../math/Vec4.js';
import { Rotor4D } from '../../math/Rotor4D.js';
import { DataBrain, IsoclinicPair, PLANE_EFFECTS } from '../../holograms/kirigami/IsoclinicRotation.js';

// ============================================================================
// BETTING CHANNEL DEFINITIONS
// ============================================================================

/**
 * Betting signal channels mapped to 4D rotation planes
 * Each channel affects a specific aspect of the geometric state
 */
export const BETTING_CHANNELS = {
    EDGE: 0,        // XY plane - Edge magnitude drives planar spin
    CONFIDENCE: 1,  // ZW plane - Low confidence = "inside-out" distortion
    TIME: 2,        // XZ plane - Time pressure creates shear
    CORRELATION: 3, // YW plane - Correlation risk creates opposing shear
    EFFICIENCY: 4,  // XW plane - Market efficiency = volumetric expansion/contraction
    MOMENTUM: 5     // YZ plane - Value momentum = volumetric breathing
};

/**
 * Betting-specific plane effect descriptions
 */
export const BETTING_PLANE_EFFECTS = {
    XY: {
        name: 'Edge Magnitude',
        description: 'Rotation speed proportional to edge size',
        signal: 'High rotation = strong edge, stable = weak/no edge',
        color: '#00FF00' // Green for edge
    },
    ZW: {
        name: 'Confidence Level',
        description: 'Inside-out distortion when confidence is low',
        signal: 'Stable = confident, inverted = uncertain',
        color: '#FFAA00' // Orange for confidence
    },
    XZ: {
        name: 'Time Pressure',
        description: 'Shear increases as closing time approaches',
        signal: 'Heavy shear = act now, relaxed = time available',
        color: '#FF0000' // Red for urgency
    },
    YW: {
        name: 'Correlation Risk',
        description: 'Opposing shear when correlated exposure exists',
        signal: 'Counter-shear = reduce position size',
        color: '#FF00FF' // Magenta for correlation
    },
    XW: {
        name: 'Market Efficiency',
        description: 'Volumetric expansion for soft lines, contraction for sharp',
        signal: 'Expanded = opportunity exists, contracted = market is efficient',
        color: '#00FFFF' // Cyan for efficiency
    },
    YZ: {
        name: 'Value Momentum',
        description: 'Breathing indicates edge is growing or decaying',
        signal: 'Expanding = edge improving, contracting = edge fading',
        color: '#FFFF00' // Yellow for momentum
    }
};

// ============================================================================
// ATTRACTOR STATES - Geometric configurations that signal decisions
// ============================================================================

/**
 * Attractor states define geometric configurations that trigger actions
 * The bot doesn't check numbers - it checks if geometry matches an attractor
 */
export const ATTRACTOR_STATES = {
    /**
     * STABLE_EDGE - All planes aligned, geometry is "crystallized"
     * Signals: Strong edge, high confidence, acceptable time, low correlation
     * Action: EXECUTE with full Kelly
     */
    STABLE_EDGE: {
        name: 'Stable Edge',
        description: 'Crystallized geometry - clear betting opportunity',
        conditions: {
            edgeMin: 0.03,          // 3% minimum edge
            confidenceMin: 0.65,    // 65% confidence
            timeMin: 5,             // 5+ minutes to close
            correlationMax: 0.5,    // Less than 50% correlation
            efficiencyMin: 0.3,     // Soft enough line
            momentumMin: -0.01      // Not rapidly decaying
        },
        action: 'EXECUTE',
        kellyMultiplier: 1.0
    },

    /**
     * EMERGING_EDGE - Geometry transitioning toward crystallization
     * Signals: Edge forming, confidence building
     * Action: PREPARE (load but don't fire)
     */
    EMERGING_EDGE: {
        name: 'Emerging Edge',
        description: 'Geometry coalescing - opportunity developing',
        conditions: {
            edgeMin: 0.02,
            confidenceMin: 0.50,
            timeMin: 15,
            correlationMax: 0.7,
            efficiencyMin: 0.2,
            momentumMin: 0.0        // Edge must be stable or growing
        },
        action: 'PREPARE',
        kellyMultiplier: 0.5
    },

    /**
     * CLOSING_WINDOW - Time pressure distorting geometry
     * Signals: Good edge but time running out
     * Action: EXECUTE with reduced size (time penalty)
     */
    CLOSING_WINDOW: {
        name: 'Closing Window',
        description: 'Time-sheared geometry - act now or miss',
        conditions: {
            edgeMin: 0.02,
            confidenceMin: 0.55,
            timeMax: 5,             // Less than 5 minutes
            correlationMax: 0.6,
            efficiencyMin: 0.2,
            momentumMin: -0.02
        },
        action: 'EXECUTE',
        kellyMultiplier: 0.75       // Reduced due to time pressure
    },

    /**
     * CORRELATED_CLUSTER - Multiple bets creating interference
     * Signals: Good individual edges but high correlation
     * Action: REDUCE position sizes
     */
    CORRELATED_CLUSTER: {
        name: 'Correlated Cluster',
        description: 'Cross-sheared geometry - reduce exposure',
        conditions: {
            edgeMin: 0.025,
            confidenceMin: 0.55,
            correlationMin: 0.5     // High correlation present
        },
        action: 'REDUCE',
        kellyMultiplier: 0.5
    },

    /**
     * EFFICIENT_MARKET - Geometry contracted, no opportunity
     * Signals: Sharp line, low inefficiency
     * Action: PASS
     */
    EFFICIENT_MARKET: {
        name: 'Efficient Market',
        description: 'Contracted geometry - no edge available',
        conditions: {
            efficiencyMax: 0.15     // Very sharp/efficient line
        },
        action: 'PASS',
        kellyMultiplier: 0
    },

    /**
     * DECAYING_EDGE - Momentum contracting, edge fading
     * Signals: Had edge but it's disappearing
     * Action: PASS or REDUCE existing
     */
    DECAYING_EDGE: {
        name: 'Decaying Edge',
        description: 'Contracting geometry - edge evaporating',
        conditions: {
            momentumMax: -0.02      // Edge decaying rapidly
        },
        action: 'PASS',
        kellyMultiplier: 0
    },

    /**
     * UNSTABLE_CHAOS - Geometry chaotic, signals contradictory
     * Signals: Model disagreement, conflicting data
     * Action: WAIT for stabilization
     */
    UNSTABLE_CHAOS: {
        name: 'Unstable Chaos',
        description: 'Chaotic geometry - wait for clarity',
        conditions: {
            confidenceMax: 0.4      // Very low confidence
        },
        action: 'WAIT',
        kellyMultiplier: 0
    }
};

// ============================================================================
// BETTING GEOMETRY ENGINE
// ============================================================================

export class BettingGeometryEngine {
    constructor(config = {}) {
        this.config = {
            // Channel scaling (how strongly each signal affects geometry)
            channelScales: {
                edge: 5.0,           // Edge has strong effect
                confidence: 3.0,     // Confidence moderately strong
                time: 4.0,           // Time pressure strong
                correlation: 2.5,    // Correlation moderate
                efficiency: 3.5,     // Efficiency fairly strong
                momentum: 2.0        // Momentum subtle
            },

            // Smoothing for data transitions
            smoothing: 0.15,

            // Geometry update rate (Hz)
            updateRate: 30,

            // Attractor detection sensitivity
            attractorThreshold: 0.85,

            ...config
        };

        // Initialize DataBrain for 6-channel processing
        this.dataBrain = new DataBrain({
            channelMapping: {
                0: 'XY',  // Edge
                1: 'ZW',  // Confidence
                2: 'XZ',  // Time
                3: 'YW',  // Correlation
                4: 'XW',  // Efficiency
                5: 'YZ'   // Momentum
            },
            smoothing: this.config.smoothing
        });

        // Current state
        this.opportunities = new Map();      // gameId → OpportunityGeometry
        this.portfolioGeometry = null;       // Combined portfolio state
        this.currentAttractor = null;        // Detected attractor state
        this.attractorStrength = 0;          // How strongly we match attractor

        // History for momentum calculation
        this.edgeHistory = new Map();        // gameId → edge values over time

        // Callbacks
        this.onAttractorChange = null;
        this.onGeometryUpdate = null;
    }

    // ========================================================================
    // OPPORTUNITY PROCESSING
    // ========================================================================

    /**
     * Process a betting opportunity into geometric state
     *
     * @param {Object} opportunity - Betting opportunity from GeometricAlpha
     * @param {Object} context - Additional context (time, portfolio state)
     * @returns {Object} Geometric state for this opportunity
     */
    processOpportunity(opportunity, context = {}) {
        const {
            gameId,
            modelProb,
            impliedProb,
            confidence = 0.5,
            odds,
            betType
        } = opportunity;

        const {
            minutesToClose = 60,
            correlatedExposure = 0,
            marketVolatility = 0.5,
            previousEdge = null
        } = context;

        // Calculate the 6 channel values (0-1 normalized)
        const channels = this._calculateChannels(
            modelProb, impliedProb, confidence,
            minutesToClose, correlatedExposure, marketVolatility, previousEdge
        );

        // Process through DataBrain to get rotation state
        const rotations = this.dataBrain.process(channels);

        // Create 4D position for this opportunity
        const position = this._channelsToPosition(channels);

        // Calculate geometric "energy" (distance from origin in 4D)
        const energy = position.magnitude();

        // Create isoclinic rotation pair representing the opportunity's state
        const rotation = this._createOpportunityRotation(channels);

        // Store opportunity geometry
        const geometry = {
            gameId,
            channels,
            rotations,
            position,
            energy,
            rotation,
            timestamp: Date.now(),
            opportunity
        };

        this.opportunities.set(gameId, geometry);

        // Update edge history for momentum calculation
        this._updateEdgeHistory(gameId, channels[BETTING_CHANNELS.EDGE]);

        // Recalculate portfolio geometry
        this._updatePortfolioGeometry();

        // Detect attractor state
        this._detectAttractor();

        // Notify listeners
        if (this.onGeometryUpdate) {
            this.onGeometryUpdate(geometry, this.portfolioGeometry);
        }

        return geometry;
    }

    /**
     * Calculate 6 channel values from opportunity data
     */
    _calculateChannels(modelProb, impliedProb, confidence, minutesToClose, correlatedExposure, marketVolatility, previousEdge) {
        const channels = new Float32Array(6);

        // Channel 0: Edge Magnitude (0-1, where 0.1 = 10% edge)
        const edge = modelProb - impliedProb;
        channels[BETTING_CHANNELS.EDGE] = Math.min(1, Math.max(0, edge * this.config.channelScales.edge));

        // Channel 1: Confidence (0-1, inverted so low confidence = high value = distortion)
        channels[BETTING_CHANNELS.CONFIDENCE] = 1 - Math.min(1, confidence);

        // Channel 2: Time Pressure (0-1, higher = more urgent)
        // Exponential decay: 60 min = 0, 5 min = 0.5, 1 min = 0.9
        const timeNorm = Math.exp(-minutesToClose / 20);
        channels[BETTING_CHANNELS.TIME] = Math.min(1, timeNorm * this.config.channelScales.time);

        // Channel 3: Correlation Risk (0-1)
        channels[BETTING_CHANNELS.CORRELATION] = Math.min(1, correlatedExposure);

        // Channel 4: Market Efficiency (0-1, lower = more efficient/sharp)
        // High volatility = soft line = opportunity
        channels[BETTING_CHANNELS.EFFICIENCY] = Math.min(1, marketVolatility);

        // Channel 5: Value Momentum (0.5 = stable, >0.5 = growing, <0.5 = shrinking)
        let momentum = 0.5;
        if (previousEdge !== null) {
            const edgeDelta = edge - previousEdge;
            momentum = 0.5 + (edgeDelta * 10); // Scale to 0-1 range
            momentum = Math.min(1, Math.max(0, momentum));
        }
        channels[BETTING_CHANNELS.MOMENTUM] = momentum;

        return channels;
    }

    /**
     * Convert channels to 4D position
     * Each channel pair affects a 2D plane
     */
    _channelsToPosition(channels) {
        // Map channels to 4D coordinates
        // XY plane: Edge × Confidence
        // ZW plane: Time × Correlation
        const x = (channels[0] - 0.5) * 2;  // Edge centered
        const y = (channels[1] - 0.5) * 2;  // Confidence centered
        const z = (channels[2] - 0.5) * 2;  // Time centered
        const w = (channels[4] - 0.5) * 2;  // Efficiency centered

        return new Vec4(x, y, z, w);
    }

    /**
     * Create isoclinic rotation pair from channels
     */
    _createOpportunityRotation(channels) {
        // Edge drives primary rotation
        const edgeAngle = channels[BETTING_CHANNELS.EDGE] * Math.PI;

        // Confidence affects the "inside-out" rotation
        const confAngle = (1 - channels[BETTING_CHANNELS.CONFIDENCE]) * Math.PI * 0.5;

        // Time and correlation create shear
        const timeAngle = channels[BETTING_CHANNELS.TIME] * Math.PI * 0.3;
        const corrAngle = channels[BETTING_CHANNELS.CORRELATION] * Math.PI * 0.3;

        // Create composed rotation
        return IsoclinicPair.doubleRotation('XY', edgeAngle, 'ZW', confAngle)
            .compose(IsoclinicPair.doubleRotation('XZ', timeAngle, 'YW', -corrAngle));
    }

    /**
     * Update edge history for momentum calculation
     */
    _updateEdgeHistory(gameId, currentEdge) {
        if (!this.edgeHistory.has(gameId)) {
            this.edgeHistory.set(gameId, []);
        }

        const history = this.edgeHistory.get(gameId);
        history.push({ edge: currentEdge, time: Date.now() });

        // Keep last 60 seconds of history
        const cutoff = Date.now() - 60000;
        while (history.length > 0 && history[0].time < cutoff) {
            history.shift();
        }
    }

    /**
     * Get edge momentum for a game
     */
    getEdgeMomentum(gameId) {
        const history = this.edgeHistory.get(gameId);
        if (!history || history.length < 2) return 0;

        const recent = history.slice(-10);
        if (recent.length < 2) return 0;

        // Linear regression to find slope
        const n = recent.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        for (let i = 0; i < n; i++) {
            const x = i;
            const y = recent[i].edge;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope; // Positive = edge growing, negative = decaying
    }

    // ========================================================================
    // PORTFOLIO GEOMETRY
    // ========================================================================

    /**
     * Update combined portfolio geometry from all opportunities
     */
    _updatePortfolioGeometry() {
        if (this.opportunities.size === 0) {
            this.portfolioGeometry = null;
            return;
        }

        // Combine all opportunity positions
        let combinedPosition = new Vec4(0, 0, 0, 0);
        let totalEnergy = 0;
        let combinedChannels = new Float32Array(6);

        for (const [_, geom] of this.opportunities) {
            combinedPosition = combinedPosition.add(geom.position);
            totalEnergy += geom.energy;

            for (let i = 0; i < 6; i++) {
                combinedChannels[i] += geom.channels[i];
            }
        }

        // Average the channels
        const count = this.opportunities.size;
        for (let i = 0; i < 6; i++) {
            combinedChannels[i] /= count;
        }

        // Normalize position
        combinedPosition = combinedPosition.scale(1 / count);

        // Calculate portfolio-level metrics
        const portfolioEnergy = combinedPosition.magnitude();
        const portfolioRotation = this._createOpportunityRotation(combinedChannels);

        // Calculate "crystallization" - how aligned are all opportunities?
        let crystallization = 0;
        if (count > 1) {
            let alignmentSum = 0;
            const positions = Array.from(this.opportunities.values()).map(g => g.position);

            for (let i = 0; i < positions.length; i++) {
                for (let j = i + 1; j < positions.length; j++) {
                    const dot = positions[i].dot(positions[j]);
                    const mag = positions[i].magnitude() * positions[j].magnitude();
                    if (mag > 0) {
                        alignmentSum += dot / mag;
                    }
                }
            }

            const pairs = (count * (count - 1)) / 2;
            crystallization = pairs > 0 ? alignmentSum / pairs : 0;
        }

        this.portfolioGeometry = {
            position: combinedPosition,
            channels: combinedChannels,
            energy: portfolioEnergy,
            rotation: portfolioRotation,
            crystallization,
            opportunityCount: count,
            timestamp: Date.now()
        };
    }

    // ========================================================================
    // ATTRACTOR DETECTION
    // ========================================================================

    /**
     * Detect which attractor state the geometry is in
     * This is the core "computation" - geometry state → decision
     */
    _detectAttractor() {
        if (!this.portfolioGeometry) {
            this.currentAttractor = ATTRACTOR_STATES.UNSTABLE_CHAOS;
            this.attractorStrength = 0;
            return;
        }

        const channels = this.portfolioGeometry.channels;

        // Check each attractor state
        let bestMatch = null;
        let bestStrength = 0;

        for (const [name, attractor] of Object.entries(ATTRACTOR_STATES)) {
            const strength = this._matchAttractor(channels, attractor.conditions);

            if (strength > bestStrength) {
                bestStrength = strength;
                bestMatch = attractor;
            }
        }

        // Update state if changed
        const previousAttractor = this.currentAttractor;
        this.currentAttractor = bestMatch;
        this.attractorStrength = bestStrength;

        // Notify if attractor changed
        if (bestMatch !== previousAttractor && this.onAttractorChange) {
            this.onAttractorChange(bestMatch, bestStrength, previousAttractor);
        }
    }

    /**
     * Calculate how well channels match an attractor's conditions
     * Returns 0-1 strength value
     */
    _matchAttractor(channels, conditions) {
        let matches = 0;
        let total = 0;

        // Edge conditions
        if (conditions.edgeMin !== undefined) {
            total++;
            const edgeValue = channels[BETTING_CHANNELS.EDGE] / this.config.channelScales.edge;
            if (edgeValue >= conditions.edgeMin) matches++;
        }
        if (conditions.edgeMax !== undefined) {
            total++;
            const edgeValue = channels[BETTING_CHANNELS.EDGE] / this.config.channelScales.edge;
            if (edgeValue <= conditions.edgeMax) matches++;
        }

        // Confidence conditions (remember: channel is inverted)
        if (conditions.confidenceMin !== undefined) {
            total++;
            const confValue = 1 - channels[BETTING_CHANNELS.CONFIDENCE];
            if (confValue >= conditions.confidenceMin) matches++;
        }
        if (conditions.confidenceMax !== undefined) {
            total++;
            const confValue = 1 - channels[BETTING_CHANNELS.CONFIDENCE];
            if (confValue <= conditions.confidenceMax) matches++;
        }

        // Time conditions
        if (conditions.timeMin !== undefined) {
            total++;
            // Reverse the exponential: minutes = -20 * ln(timeChannel / scale)
            const timeValue = -20 * Math.log(channels[BETTING_CHANNELS.TIME] / this.config.channelScales.time + 0.01);
            if (timeValue >= conditions.timeMin) matches++;
        }
        if (conditions.timeMax !== undefined) {
            total++;
            const timeValue = -20 * Math.log(channels[BETTING_CHANNELS.TIME] / this.config.channelScales.time + 0.01);
            if (timeValue <= conditions.timeMax) matches++;
        }

        // Correlation conditions
        if (conditions.correlationMax !== undefined) {
            total++;
            if (channels[BETTING_CHANNELS.CORRELATION] <= conditions.correlationMax) matches++;
        }
        if (conditions.correlationMin !== undefined) {
            total++;
            if (channels[BETTING_CHANNELS.CORRELATION] >= conditions.correlationMin) matches++;
        }

        // Efficiency conditions
        if (conditions.efficiencyMin !== undefined) {
            total++;
            if (channels[BETTING_CHANNELS.EFFICIENCY] >= conditions.efficiencyMin) matches++;
        }
        if (conditions.efficiencyMax !== undefined) {
            total++;
            if (channels[BETTING_CHANNELS.EFFICIENCY] <= conditions.efficiencyMax) matches++;
        }

        // Momentum conditions
        if (conditions.momentumMin !== undefined) {
            total++;
            const momValue = (channels[BETTING_CHANNELS.MOMENTUM] - 0.5) / 5;
            if (momValue >= conditions.momentumMin) matches++;
        }
        if (conditions.momentumMax !== undefined) {
            total++;
            const momValue = (channels[BETTING_CHANNELS.MOMENTUM] - 0.5) / 5;
            if (momValue <= conditions.momentumMax) matches++;
        }

        return total > 0 ? matches / total : 0;
    }

    // ========================================================================
    // BOT DECISION INTERFACE
    // ========================================================================

    /**
     * Query the geometric state for bot decision
     * The bot calls this instead of reading individual numbers
     *
     * @returns {Object} Decision based on geometric state
     */
    queryGeometricState() {
        if (!this.currentAttractor || !this.portfolioGeometry) {
            return {
                executable: false,
                action: 'WAIT',
                reason: 'No geometry available',
                confidence: 0,
                allocations: []
            };
        }

        const state = {
            // Primary decision
            executable: ['EXECUTE', 'REDUCE'].includes(this.currentAttractor.action),
            action: this.currentAttractor.action,
            attractor: this.currentAttractor.name,
            attractorStrength: this.attractorStrength,

            // Confidence based on geometry crystallization
            confidence: this.portfolioGeometry.crystallization *
                       this.attractorStrength *
                       (1 - this.portfolioGeometry.channels[BETTING_CHANNELS.CONFIDENCE]),

            // Geometric metrics
            portfolioEnergy: this.portfolioGeometry.energy,
            crystallization: this.portfolioGeometry.crystallization,
            channels: this._formatChannels(this.portfolioGeometry.channels),

            // Allocations for each opportunity
            allocations: this._calculateAllocations(),

            // Timing
            timestamp: Date.now()
        };

        return state;
    }

    /**
     * Format channels for human/bot readability
     */
    _formatChannels(channels) {
        return {
            edge: channels[BETTING_CHANNELS.EDGE] / this.config.channelScales.edge,
            confidence: 1 - channels[BETTING_CHANNELS.CONFIDENCE],
            timePressure: channels[BETTING_CHANNELS.TIME],
            correlation: channels[BETTING_CHANNELS.CORRELATION],
            efficiency: channels[BETTING_CHANNELS.EFFICIENCY],
            momentum: (channels[BETTING_CHANNELS.MOMENTUM] - 0.5) * 2
        };
    }

    /**
     * Calculate allocations based on geometric state
     */
    _calculateAllocations() {
        if (!this.currentAttractor) return [];

        const kellyMult = this.currentAttractor.kellyMultiplier;
        const allocations = [];

        for (const [gameId, geom] of this.opportunities) {
            // Base allocation from opportunity's edge channel
            const edgeStrength = geom.channels[BETTING_CHANNELS.EDGE] / this.config.channelScales.edge;

            // Confidence adjustment
            const confMult = 1 - geom.channels[BETTING_CHANNELS.CONFIDENCE] * 0.5;

            // Correlation penalty
            const corrPenalty = 1 - geom.channels[BETTING_CHANNELS.CORRELATION] * 0.3;

            // Final allocation
            const fraction = edgeStrength * kellyMult * confMult * corrPenalty;

            allocations.push({
                gameId,
                fraction: Math.min(0.05, Math.max(0, fraction)), // Cap at 5%
                edge: edgeStrength,
                confidence: 1 - geom.channels[BETTING_CHANNELS.CONFIDENCE],
                energy: geom.energy,
                opportunity: geom.opportunity
            });
        }

        // Sort by allocation size
        allocations.sort((a, b) => b.fraction - a.fraction);

        return allocations;
    }

    // ========================================================================
    // REAL-TIME UPDATES
    // ========================================================================

    /**
     * Batch update multiple opportunities
     */
    updateOpportunities(opportunities, context = {}) {
        for (const opp of opportunities) {
            this.processOpportunity(opp, {
                ...context,
                previousEdge: this._getPreviousEdge(opp.gameId)
            });
        }

        return this.queryGeometricState();
    }

    /**
     * Get previous edge for momentum calculation
     */
    _getPreviousEdge(gameId) {
        const history = this.edgeHistory.get(gameId);
        if (!history || history.length < 2) return null;
        return history[history.length - 2].edge / this.config.channelScales.edge;
    }

    /**
     * Remove an opportunity (game started, bet placed, etc.)
     */
    removeOpportunity(gameId) {
        this.opportunities.delete(gameId);
        this.edgeHistory.delete(gameId);
        this._updatePortfolioGeometry();
        this._detectAttractor();
    }

    /**
     * Clear all opportunities
     */
    clear() {
        this.opportunities.clear();
        this.edgeHistory.clear();
        this.portfolioGeometry = null;
        this.currentAttractor = null;
        this.attractorStrength = 0;
    }

    // ========================================================================
    // VISUALIZATION DATA EXPORT
    // ========================================================================

    /**
     * Export data for VIB3 visualization system
     */
    exportForVisualization() {
        const vertices = [];
        const colors = [];
        const rotations = [];

        for (const [_, geom] of this.opportunities) {
            vertices.push(geom.position);
            colors.push(this._channelsToColor(geom.channels));
            rotations.push(geom.rotation);
        }

        return {
            vertices,
            colors,
            rotations,
            portfolioState: this.portfolioGeometry ? {
                position: this.portfolioGeometry.position,
                rotation: this.portfolioGeometry.rotation,
                crystallization: this.portfolioGeometry.crystallization
            } : null,
            attractor: this.currentAttractor ? {
                name: this.currentAttractor.name,
                strength: this.attractorStrength,
                action: this.currentAttractor.action
            } : null
        };
    }

    /**
     * Convert channels to RGB color for visualization
     */
    _channelsToColor(channels) {
        // Edge = Green intensity
        // Time pressure = Red intensity
        // Confidence = Blue intensity
        return {
            r: Math.min(1, channels[BETTING_CHANNELS.TIME] * 2),
            g: Math.min(1, channels[BETTING_CHANNELS.EDGE]),
            b: Math.min(1, (1 - channels[BETTING_CHANNELS.CONFIDENCE]) * 2),
            a: 0.5 + channels[BETTING_CHANNELS.EFFICIENCY] * 0.5
        };
    }
}

// ============================================================================
// EXPORT
// ============================================================================

export default BettingGeometryEngine;
