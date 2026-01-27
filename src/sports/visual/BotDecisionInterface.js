/**
 * BotDecisionInterface - Unified API for Betting Bot Geometric State Reading
 *
 * This is the PRIMARY INTERFACE for betting bots.
 *
 * The bot does NOT:
 * - Read individual probability numbers
 * - Check hardcoded thresholds
 * - Make decisions based on scalar comparisons
 *
 * The bot DOES:
 * - Query geometric state
 * - Check attractor configurations
 * - Read crystallization and stability
 * - Follow geometric signals
 *
 * The geometry IS the computation. The decision IS the shape.
 *
 * Usage:
 * ```javascript
 * const bot = new BotDecisionInterface();
 *
 * // Feed opportunities
 * bot.update(opportunities, context);
 *
 * // Get decision
 * const decision = bot.getDecision();
 * if (decision.execute) {
 *     for (const alloc of decision.allocations) {
 *         placeBet(alloc.gameId, alloc.amount);
 *     }
 * }
 * ```
 *
 * @module BotDecisionInterface
 * @version 1.0.0
 */

import { BettingGeometryEngine, ATTRACTOR_STATES, BETTING_CHANNELS } from './BettingGeometryEngine.js';
import { MarketTopology } from './MarketTopology.js';
import { Vec4 } from '../../math/Vec4.js';

// ============================================================================
// BOT DECISION STATES
// ============================================================================

/**
 * Decision types the bot can return
 */
export const DECISION_TYPE = {
    EXECUTE: 'EXECUTE',       // Place bets now
    PREPARE: 'PREPARE',       // Load but don't fire
    REDUCE: 'REDUCE',         // Reduce existing exposure
    WAIT: 'WAIT',             // Do nothing, geometry unstable
    PASS: 'PASS'              // Explicitly skip (no edge)
};

/**
 * Signal strength levels
 */
export const SIGNAL_STRENGTH = {
    STRONG: 'STRONG',         // High confidence, act immediately
    MODERATE: 'MODERATE',     // Good signal, act if threshold met
    WEAK: 'WEAK',             // Marginal signal, be cautious
    NOISE: 'NOISE'            // No clear signal
};

// ============================================================================
// BOT DECISION INTERFACE
// ============================================================================

export class BotDecisionInterface {
    constructor(config = {}) {
        this.config = {
            // Bankroll for allocation calculation
            bankroll: config.bankroll || 10000,

            // Minimum signal strength to execute
            minSignalStrength: config.minSignalStrength || 0.6,

            // Minimum crystallization for execution
            minCrystallization: config.minCrystallization || 0.5,

            // Maximum allocations per decision
            maxAllocations: config.maxAllocations || 5,

            // Maximum total exposure
            maxTotalExposure: config.maxTotalExposure || 0.15,

            // Enable topology analysis
            useTopology: config.useTopology !== false,

            // Update rate (Hz)
            updateRate: config.updateRate || 1,

            // Callbacks
            onDecision: config.onDecision || null,
            onStateChange: config.onStateChange || null,

            ...config
        };

        // Core systems
        this.geometryEngine = new BettingGeometryEngine({
            smoothing: 0.15
        });

        this.topology = this.config.useTopology ? new MarketTopology() : null;

        // State
        this.currentDecision = null;
        this.lastUpdateTime = 0;
        this.updateCount = 0;

        // Decision history for pattern analysis
        this.decisionHistory = [];
        this.maxHistoryLength = 100;

        // Setup callbacks
        this.geometryEngine.onAttractorChange = (attractor, strength, previous) => {
            this._handleAttractorChange(attractor, strength, previous);
        };

        if (this.topology) {
            this.topology.onHoleDetected = (holes) => {
                this._handleHolesDetected(holes);
            };
        }
    }

    // ========================================================================
    // PRIMARY API
    // ========================================================================

    /**
     * Update the system with new opportunities
     * Call this regularly (e.g., every second)
     *
     * @param {Array} opportunities - Betting opportunities from GeometricAlpha
     * @param {Object} context - Additional context (time, portfolio, etc.)
     * @returns {Object} Current decision state
     */
    update(opportunities, context = {}) {
        this.lastUpdateTime = Date.now();
        this.updateCount++;

        // Process through geometry engine
        const geomState = this.geometryEngine.updateOpportunities(
            opportunities,
            this._enrichContext(context)
        );

        // Update topology if enabled
        if (this.topology) {
            this.topology.addSnapshot(opportunities);
        }

        // Generate decision
        this.currentDecision = this._generateDecision(geomState, opportunities);

        // Record history
        this._recordDecision(this.currentDecision);

        // Notify callback
        if (this.config.onDecision) {
            this.config.onDecision(this.currentDecision);
        }

        return this.currentDecision;
    }

    /**
     * Get the current decision
     * Call this to see what the bot should do NOW
     *
     * @returns {Object} Decision object
     */
    getDecision() {
        if (!this.currentDecision) {
            return this._createEmptyDecision();
        }
        return this.currentDecision;
    }

    /**
     * Get simple boolean: should we execute?
     */
    shouldExecute() {
        return this.currentDecision?.execute === true;
    }

    /**
     * Get allocations ready for execution
     * Only returns allocations if geometry supports execution
     */
    getExecutableAllocations() {
        if (!this.shouldExecute()) return [];
        return this.currentDecision.allocations;
    }

    // ========================================================================
    // DECISION GENERATION
    // ========================================================================

    /**
     * Generate decision from geometric state
     */
    _generateDecision(geomState, opportunities) {
        const decision = {
            // Timestamp
            timestamp: Date.now(),
            updateCount: this.updateCount,

            // Primary decision
            execute: false,
            type: DECISION_TYPE.WAIT,
            signalStrength: SIGNAL_STRENGTH.NOISE,

            // Geometric state
            attractor: geomState.attractor,
            attractorStrength: geomState.attractorStrength,
            confidence: geomState.confidence,
            crystallization: geomState.crystallization,
            portfolioEnergy: geomState.portfolioEnergy,

            // Channel values (for transparency/debugging)
            channels: geomState.channels,

            // Allocations
            allocations: [],
            totalExposure: 0,

            // Reasoning
            reasons: [],

            // Topology metrics (if enabled)
            topology: null
        };

        // Analyze geometric state
        this._analyzeGeometry(decision, geomState);

        // Add topology analysis
        if (this.topology) {
            this._analyzeTopology(decision);
        }

        // Calculate final allocations
        this._calculateAllocations(decision, geomState, opportunities);

        // Final decision
        this._finalizeDecision(decision);

        return decision;
    }

    /**
     * Analyze geometric state for decision
     */
    _analyzeGeometry(decision, geomState) {
        // Check attractor state
        const attractor = ATTRACTOR_STATES[geomState.attractor];
        if (!attractor) {
            decision.reasons.push('No attractor detected');
            return;
        }

        // Check attractor strength
        if (geomState.attractorStrength < this.config.minSignalStrength) {
            decision.reasons.push(`Attractor strength ${(geomState.attractorStrength * 100).toFixed(0)}% below threshold`);
            decision.signalStrength = SIGNAL_STRENGTH.WEAK;
        } else if (geomState.attractorStrength > 0.8) {
            decision.signalStrength = SIGNAL_STRENGTH.STRONG;
        } else {
            decision.signalStrength = SIGNAL_STRENGTH.MODERATE;
        }

        // Check crystallization
        if (geomState.crystallization < this.config.minCrystallization) {
            decision.reasons.push(`Crystallization ${(geomState.crystallization * 100).toFixed(0)}% - geometry not stable`);
        } else {
            decision.reasons.push(`Crystallization ${(geomState.crystallization * 100).toFixed(0)}% - geometry stable`);
        }

        // Set type based on attractor action
        switch (attractor.action) {
            case 'EXECUTE':
                if (decision.signalStrength !== SIGNAL_STRENGTH.WEAK) {
                    decision.type = DECISION_TYPE.EXECUTE;
                    decision.execute = true;
                    decision.reasons.push(`Attractor "${attractor.name}" signals EXECUTE`);
                }
                break;

            case 'PREPARE':
                decision.type = DECISION_TYPE.PREPARE;
                decision.reasons.push(`Attractor "${attractor.name}" signals PREPARE`);
                break;

            case 'REDUCE':
                decision.type = DECISION_TYPE.REDUCE;
                decision.execute = true; // Can still execute reductions
                decision.reasons.push(`Attractor "${attractor.name}" signals REDUCE exposure`);
                break;

            case 'PASS':
                decision.type = DECISION_TYPE.PASS;
                decision.reasons.push(`Attractor "${attractor.name}" signals PASS`);
                break;

            default:
                decision.type = DECISION_TYPE.WAIT;
                decision.reasons.push(`Waiting for geometry to stabilize`);
        }
    }

    /**
     * Add topology analysis to decision
     */
    _analyzeTopology(decision) {
        const topologyExport = this.topology.exportForVisualization();

        decision.topology = {
            betti: topologyExport.betti,
            complexity: topologyExport.complexity,
            stability: topologyExport.stability,
            holes: topologyExport.holes.length,
            persistentEdges: this.topology.getMostPersistentEdges(3)
        };

        // Topology-based adjustments
        if (topologyExport.holes.length > 0) {
            const significantHoles = topologyExport.holes.filter(h => h.significance > 0.5);
            if (significantHoles.length > 0) {
                decision.reasons.push(`${significantHoles.length} market topology holes detected`);

                // Holes might indicate arbitrage or strong edges
                if (decision.signalStrength === SIGNAL_STRENGTH.MODERATE) {
                    decision.signalStrength = SIGNAL_STRENGTH.STRONG;
                }
            }
        }

        // High stability boosts confidence
        if (topologyExport.stability > 0.7) {
            decision.reasons.push('High topological stability');
            decision.confidence = Math.min(1, decision.confidence * 1.2);
        }

        // High complexity suggests caution
        if (topologyExport.complexity > 0.7) {
            decision.reasons.push('High market complexity - exercise caution');
            if (decision.execute && decision.signalStrength !== SIGNAL_STRENGTH.STRONG) {
                decision.execute = false;
                decision.type = DECISION_TYPE.PREPARE;
            }
        }
    }

    /**
     * Calculate actual bet allocations
     */
    _calculateAllocations(decision, geomState, opportunities) {
        if (decision.type === DECISION_TYPE.PASS ||
            decision.type === DECISION_TYPE.WAIT) {
            return;
        }

        // Get raw allocations from geometry engine
        const rawAllocations = geomState.allocations || [];

        // Filter and sort
        let allocations = rawAllocations
            .filter(a => a.fraction > 0.001)
            .sort((a, b) => b.fraction - a.fraction)
            .slice(0, this.config.maxAllocations);

        // Apply exposure limit
        let totalExposure = 0;
        const finalAllocations = [];

        for (const alloc of allocations) {
            let fraction = alloc.fraction;

            // Check if we'd exceed total exposure
            if (totalExposure + fraction > this.config.maxTotalExposure) {
                fraction = Math.max(0, this.config.maxTotalExposure - totalExposure);
            }

            if (fraction > 0.001) {
                finalAllocations.push({
                    gameId: alloc.gameId,
                    fraction,
                    amount: Math.round(this.config.bankroll * fraction * 100) / 100,
                    edge: alloc.edge,
                    confidence: alloc.confidence,
                    energy: alloc.energy
                });
                totalExposure += fraction;
            }
        }

        decision.allocations = finalAllocations;
        decision.totalExposure = totalExposure;
    }

    /**
     * Finalize decision with sanity checks
     */
    _finalizeDecision(decision) {
        // Must have allocations to execute
        if (decision.execute && decision.allocations.length === 0) {
            decision.execute = false;
            decision.type = DECISION_TYPE.WAIT;
            decision.reasons.push('No valid allocations available');
        }

        // Final confidence adjustment based on history
        const recentExecutions = this.decisionHistory
            .filter(d => d.execute && Date.now() - d.timestamp < 60000);

        if (recentExecutions.length > 3) {
            decision.reasons.push('Cooling down - multiple recent executions');
            decision.confidence *= 0.8;
        }

        // Confidence threshold for execution
        if (decision.execute && decision.confidence < 0.4) {
            decision.execute = false;
            decision.type = DECISION_TYPE.PREPARE;
            decision.reasons.push(`Confidence ${(decision.confidence * 100).toFixed(0)}% too low for execution`);
        }
    }

    /**
     * Create empty decision object
     */
    _createEmptyDecision() {
        return {
            timestamp: Date.now(),
            execute: false,
            type: DECISION_TYPE.WAIT,
            signalStrength: SIGNAL_STRENGTH.NOISE,
            attractor: null,
            attractorStrength: 0,
            confidence: 0,
            crystallization: 0,
            portfolioEnergy: 0,
            channels: null,
            allocations: [],
            totalExposure: 0,
            reasons: ['No opportunities processed'],
            topology: null
        };
    }

    // ========================================================================
    // CONTEXT & HISTORY
    // ========================================================================

    /**
     * Enrich context with additional data
     */
    _enrichContext(context) {
        // Add portfolio exposure from current allocations
        const existingExposure = this.decisionHistory
            .filter(d => d.execute && Date.now() - d.timestamp < 300000)
            .reduce((sum, d) => sum + d.totalExposure, 0);

        return {
            ...context,
            existingExposure,
            updateCount: this.updateCount
        };
    }

    /**
     * Record decision to history
     */
    _recordDecision(decision) {
        this.decisionHistory.push({
            timestamp: decision.timestamp,
            execute: decision.execute,
            type: decision.type,
            totalExposure: decision.totalExposure,
            confidence: decision.confidence
        });

        // Trim history
        while (this.decisionHistory.length > this.maxHistoryLength) {
            this.decisionHistory.shift();
        }
    }

    /**
     * Handle attractor state changes
     */
    _handleAttractorChange(attractor, strength, previous) {
        if (this.config.onStateChange) {
            this.config.onStateChange({
                type: 'attractor_change',
                from: previous?.name || 'none',
                to: attractor?.name || 'none',
                strength
            });
        }
    }

    /**
     * Handle topology holes detected
     */
    _handleHolesDetected(holes) {
        if (this.config.onStateChange) {
            this.config.onStateChange({
                type: 'holes_detected',
                count: holes.length,
                mostSignificant: holes[0]
            });
        }
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Update bankroll configuration
     */
    setBankroll(bankroll) {
        this.config.bankroll = bankroll;
    }

    /**
     * Get full state for debugging/visualization
     */
    getFullState() {
        return {
            decision: this.currentDecision,
            geometry: this.geometryEngine.exportForVisualization(),
            topology: this.topology?.exportForVisualization() || null,
            history: this.decisionHistory.slice(-10),
            config: this.config
        };
    }

    /**
     * Export state as JSON for external consumption
     */
    exportState() {
        const state = this.getFullState();
        return JSON.stringify(state, (key, value) => {
            // Handle Vec4 objects
            if (value instanceof Vec4) {
                return { x: value.x, y: value.y, z: value.z, w: value.w };
            }
            return value;
        });
    }

    /**
     * Clear all state
     */
    clear() {
        this.geometryEngine.clear();
        if (this.topology) {
            this.topology.clear();
        }
        this.currentDecision = null;
        this.decisionHistory = [];
        this.updateCount = 0;
    }

    /**
     * Remove a specific opportunity (game started, etc.)
     */
    removeOpportunity(gameId) {
        this.geometryEngine.removeOpportunity(gameId);
    }
}

// ============================================================================
// CONVENIENCE FACTORY
// ============================================================================

/**
 * Create a configured bot interface
 */
export function createBotInterface(config = {}) {
    return new BotDecisionInterface(config);
}

/**
 * Create a high-frequency bot (for live betting)
 */
export function createLiveBettingBot(bankroll, config = {}) {
    return new BotDecisionInterface({
        bankroll,
        updateRate: 10,              // 10 Hz updates
        minSignalStrength: 0.7,      // Higher threshold for live
        minCrystallization: 0.6,
        maxTotalExposure: 0.10,      // More conservative
        ...config
    });
}

/**
 * Create a pre-game bot (for pre-game betting)
 */
export function createPreGameBot(bankroll, config = {}) {
    return new BotDecisionInterface({
        bankroll,
        updateRate: 1,               // 1 Hz updates
        minSignalStrength: 0.6,
        minCrystallization: 0.5,
        maxTotalExposure: 0.15,
        ...config
    });
}

// ============================================================================
// EXPORT
// ============================================================================

export default BotDecisionInterface;
