/**
 * Geometric Alpha - Browser-based Geometry Engine
 *
 * Simplified version of BettingGeometryEngine for web demo.
 * Implements the 6-channel → 4D rotation → attractor detection pipeline.
 */

// Channel definitions
const CHANNELS = {
    EDGE: 0,        // XY plane
    CONFIDENCE: 1,  // ZW plane
    TIME: 2,        // XZ plane
    CORRELATION: 3, // YW plane
    EFFICIENCY: 4,  // XW plane
    MOMENTUM: 5     // YZ plane
};

// Attractor states
const ATTRACTORS = {
    STABLE_EDGE: {
        name: 'STABLE_EDGE',
        action: 'EXECUTE',
        kellyMult: 1.0,
        conditions: {
            edgeMin: 0.03,
            confidenceMin: 0.65,
            timeMin: 5,
            correlationMax: 0.5,
            efficiencyMin: 0.3,
            momentumMin: -0.01
        }
    },
    EMERGING_EDGE: {
        name: 'EMERGING_EDGE',
        action: 'PREPARE',
        kellyMult: 0.5,
        conditions: {
            edgeMin: 0.02,
            confidenceMin: 0.50,
            timeMin: 15,
            correlationMax: 0.7,
            efficiencyMin: 0.2,
            momentumMin: 0.0
        }
    },
    CLOSING_WINDOW: {
        name: 'CLOSING_WINDOW',
        action: 'EXECUTE',
        kellyMult: 0.75,
        conditions: {
            edgeMin: 0.02,
            confidenceMin: 0.55,
            timeMax: 5,
            correlationMax: 0.6,
            efficiencyMin: 0.2,
            momentumMin: -0.02
        }
    },
    CORRELATED_CLUSTER: {
        name: 'CORRELATED_CLUSTER',
        action: 'REDUCE',
        kellyMult: 0.5,
        conditions: {
            edgeMin: 0.025,
            confidenceMin: 0.55,
            correlationMin: 0.5
        }
    },
    EFFICIENT_MARKET: {
        name: 'EFFICIENT_MARKET',
        action: 'PASS',
        kellyMult: 0,
        conditions: {
            efficiencyMax: 0.15
        }
    },
    DECAYING_EDGE: {
        name: 'DECAYING_EDGE',
        action: 'PASS',
        kellyMult: 0,
        conditions: {
            momentumMax: -0.02
        }
    },
    UNSTABLE_CHAOS: {
        name: 'UNSTABLE_CHAOS',
        action: 'WAIT',
        kellyMult: 0,
        conditions: {
            confidenceMax: 0.4
        }
    }
};

/**
 * Betting Geometry Engine
 */
class BettingGeometryEngine {
    constructor(config = {}) {
        this.config = {
            channelScales: {
                edge: 5.0,
                confidence: 3.0,
                time: 4.0,
                correlation: 2.5,
                efficiency: 3.5,
                momentum: 2.0
            },
            smoothing: 0.15,
            bankroll: config.bankroll || 10000,
            ...config
        };

        this.opportunities = new Map();
        this.portfolioState = null;
        this.currentAttractor = null;
        this.attractorStrength = 0;
        this.edgeHistory = new Map();

        // Callbacks
        this.onUpdate = null;
        this.onAttractorChange = null;
    }

    /**
     * Process opportunities and update geometric state
     */
    update(opportunities, context = {}) {
        // Clear old data
        this.opportunities.clear();

        // Process each opportunity
        for (const opp of opportunities) {
            const channels = this._calculateChannels(opp, context);
            const position = this._channelsToPosition(channels);
            const energy = this._magnitude(position);

            this.opportunities.set(opp.gameId + '-' + opp.side, {
                opportunity: opp,
                channels,
                position,
                energy
            });

            // Update edge history
            this._updateEdgeHistory(opp.gameId, channels[CHANNELS.EDGE]);
        }

        // Calculate portfolio state
        this._updatePortfolioState();

        // Detect attractor
        const previousAttractor = this.currentAttractor;
        this._detectAttractor();

        // Notify if attractor changed
        if (this.currentAttractor?.name !== previousAttractor?.name && this.onAttractorChange) {
            this.onAttractorChange(this.currentAttractor, previousAttractor);
        }

        // Notify update
        if (this.onUpdate) {
            this.onUpdate(this.getState());
        }

        return this.getState();
    }

    /**
     * Calculate 6 channel values from opportunity
     */
    _calculateChannels(opp, context) {
        const channels = new Float32Array(6);
        const scales = this.config.channelScales;

        // Channel 0: Edge
        const edge = opp.modelProb - opp.impliedProb;
        channels[CHANNELS.EDGE] = Math.min(1, Math.max(0, edge * scales.edge));

        // Channel 1: Confidence (inverted)
        channels[CHANNELS.CONFIDENCE] = 1 - Math.min(1, opp.confidence || 0.5);

        // Channel 2: Time Pressure
        const minutesToClose = context.minutesToClose || opp.minutesToClose || 60;
        const timeNorm = Math.exp(-minutesToClose / 20);
        channels[CHANNELS.TIME] = Math.min(1, timeNorm * scales.time);

        // Channel 3: Correlation
        const correlation = this._calculateCorrelation(opp);
        channels[CHANNELS.CORRELATION] = Math.min(1, correlation);

        // Channel 4: Efficiency (based on edge variance)
        const efficiency = Math.abs(edge) < 0.02 ? 0.1 : 0.3 + Math.random() * 0.4;
        channels[CHANNELS.EFFICIENCY] = Math.min(1, efficiency);

        // Channel 5: Momentum
        const momentum = this._calculateMomentum(opp.gameId, edge);
        channels[CHANNELS.MOMENTUM] = momentum;

        return channels;
    }

    /**
     * Calculate correlation with existing opportunities
     */
    _calculateCorrelation(opp) {
        let correlation = 0;
        for (const [key, existing] of this.opportunities) {
            if (existing.opportunity.gameId === opp.gameId) {
                correlation += 0.7; // Same game = high correlation
            }
        }
        return Math.min(1, correlation);
    }

    /**
     * Calculate momentum from edge history
     */
    _calculateMomentum(gameId, currentEdge) {
        const history = this.edgeHistory.get(gameId) || [];
        if (history.length < 2) return 0.5;

        const recent = history.slice(-5);
        const slope = (recent[recent.length - 1] - recent[0]) / recent.length;

        return Math.min(1, Math.max(0, 0.5 + slope * 10));
    }

    /**
     * Update edge history
     */
    _updateEdgeHistory(gameId, edge) {
        if (!this.edgeHistory.has(gameId)) {
            this.edgeHistory.set(gameId, []);
        }
        const history = this.edgeHistory.get(gameId);
        history.push(edge);
        if (history.length > 20) history.shift();
    }

    /**
     * Convert channels to 4D position
     */
    _channelsToPosition(channels) {
        return {
            x: (channels[0] - 0.5) * 2,
            y: (channels[1] - 0.5) * 2,
            z: (channels[2] - 0.5) * 2,
            w: (channels[4] - 0.5) * 2
        };
    }

    /**
     * Calculate vector magnitude
     */
    _magnitude(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z + v.w * v.w);
    }

    /**
     * Update portfolio state
     */
    _updatePortfolioState() {
        if (this.opportunities.size === 0) {
            this.portfolioState = null;
            return;
        }

        let combinedChannels = new Float32Array(6);
        let totalEnergy = 0;

        for (const [_, data] of this.opportunities) {
            for (let i = 0; i < 6; i++) {
                combinedChannels[i] += data.channels[i];
            }
            totalEnergy += data.energy;
        }

        const count = this.opportunities.size;
        for (let i = 0; i < 6; i++) {
            combinedChannels[i] /= count;
        }

        // Calculate crystallization
        let crystallization = 1;
        if (count > 1) {
            const positions = Array.from(this.opportunities.values()).map(d => d.position);
            let alignmentSum = 0;
            let pairs = 0;

            for (let i = 0; i < positions.length; i++) {
                for (let j = i + 1; j < positions.length; j++) {
                    const dot = positions[i].x * positions[j].x +
                                positions[i].y * positions[j].y +
                                positions[i].z * positions[j].z +
                                positions[i].w * positions[j].w;
                    const mag = this._magnitude(positions[i]) * this._magnitude(positions[j]);
                    if (mag > 0.01) {
                        alignmentSum += Math.abs(dot / mag);
                        pairs++;
                    }
                }
            }

            crystallization = pairs > 0 ? alignmentSum / pairs : 0.5;
        }

        this.portfolioState = {
            channels: combinedChannels,
            energy: totalEnergy / count,
            crystallization,
            count
        };
    }

    /**
     * Detect current attractor state
     */
    _detectAttractor() {
        if (!this.portfolioState) {
            this.currentAttractor = ATTRACTORS.UNSTABLE_CHAOS;
            this.attractorStrength = 0;
            return;
        }

        let bestMatch = null;
        let bestStrength = 0;

        for (const [name, attractor] of Object.entries(ATTRACTORS)) {
            const strength = this._matchAttractor(this.portfolioState.channels, attractor.conditions);
            if (strength > bestStrength) {
                bestStrength = strength;
                bestMatch = attractor;
            }
        }

        this.currentAttractor = bestMatch || ATTRACTORS.UNSTABLE_CHAOS;
        this.attractorStrength = bestStrength;
    }

    /**
     * Match channels against attractor conditions
     */
    _matchAttractor(channels, conditions) {
        let matches = 0;
        let total = 0;

        const scales = this.config.channelScales;

        // Edge conditions
        if (conditions.edgeMin !== undefined) {
            total++;
            const edgeValue = channels[CHANNELS.EDGE] / scales.edge;
            if (edgeValue >= conditions.edgeMin) matches++;
        }

        // Confidence conditions
        if (conditions.confidenceMin !== undefined) {
            total++;
            const confValue = 1 - channels[CHANNELS.CONFIDENCE];
            if (confValue >= conditions.confidenceMin) matches++;
        }
        if (conditions.confidenceMax !== undefined) {
            total++;
            const confValue = 1 - channels[CHANNELS.CONFIDENCE];
            if (confValue <= conditions.confidenceMax) matches++;
        }

        // Time conditions
        if (conditions.timeMin !== undefined) {
            total++;
            const timeNorm = channels[CHANNELS.TIME] / scales.time;
            const minutes = -20 * Math.log(timeNorm + 0.01);
            if (minutes >= conditions.timeMin) matches++;
        }
        if (conditions.timeMax !== undefined) {
            total++;
            const timeNorm = channels[CHANNELS.TIME] / scales.time;
            const minutes = -20 * Math.log(timeNorm + 0.01);
            if (minutes <= conditions.timeMax) matches++;
        }

        // Correlation conditions
        if (conditions.correlationMax !== undefined) {
            total++;
            if (channels[CHANNELS.CORRELATION] <= conditions.correlationMax) matches++;
        }
        if (conditions.correlationMin !== undefined) {
            total++;
            if (channels[CHANNELS.CORRELATION] >= conditions.correlationMin) matches++;
        }

        // Efficiency conditions
        if (conditions.efficiencyMin !== undefined) {
            total++;
            if (channels[CHANNELS.EFFICIENCY] >= conditions.efficiencyMin) matches++;
        }
        if (conditions.efficiencyMax !== undefined) {
            total++;
            if (channels[CHANNELS.EFFICIENCY] <= conditions.efficiencyMax) matches++;
        }

        // Momentum conditions
        if (conditions.momentumMin !== undefined) {
            total++;
            const momValue = (channels[CHANNELS.MOMENTUM] - 0.5) / 5;
            if (momValue >= conditions.momentumMin) matches++;
        }
        if (conditions.momentumMax !== undefined) {
            total++;
            const momValue = (channels[CHANNELS.MOMENTUM] - 0.5) / 5;
            if (momValue <= conditions.momentumMax) matches++;
        }

        return total > 0 ? matches / total : 0;
    }

    /**
     * Get current state for visualization
     */
    getState() {
        const allocations = this._calculateAllocations();

        return {
            opportunities: Array.from(this.opportunities.values()),
            portfolioState: this.portfolioState,
            attractor: this.currentAttractor,
            attractorStrength: this.attractorStrength,
            allocations,
            execute: this.currentAttractor?.action === 'EXECUTE' || this.currentAttractor?.action === 'REDUCE',
            action: this.currentAttractor?.action || 'WAIT',
            signalStrength: this._getSignalStrength()
        };
    }

    /**
     * Calculate bet allocations
     */
    _calculateAllocations() {
        if (!this.currentAttractor || this.currentAttractor.kellyMult === 0) {
            return [];
        }

        const allocations = [];
        const kellyMult = this.currentAttractor.kellyMult;

        for (const [key, data] of this.opportunities) {
            const opp = data.opportunity;
            const edge = opp.modelProb - opp.impliedProb;

            if (edge <= 0) continue;

            // Simplified Kelly calculation
            const odds = opp.odds > 0 ? opp.odds / 100 : 100 / Math.abs(opp.odds);
            const kelly = (opp.modelProb * (odds + 1) - 1) / odds;
            const fraction = Math.max(0, Math.min(0.05, kelly * kellyMult * (opp.confidence || 0.5)));

            if (fraction > 0.001) {
                allocations.push({
                    gameId: opp.gameId,
                    team: opp.team,
                    side: opp.side,
                    betType: opp.betType,
                    fraction,
                    amount: Math.round(this.config.bankroll * fraction * 100) / 100,
                    edge: edge,
                    confidence: opp.confidence
                });
            }
        }

        return allocations.sort((a, b) => b.fraction - a.fraction);
    }

    /**
     * Get signal strength label
     */
    _getSignalStrength() {
        if (this.attractorStrength > 0.8) return 'STRONG';
        if (this.attractorStrength > 0.6) return 'MODERATE';
        if (this.attractorStrength > 0.4) return 'WEAK';
        return 'NOISE';
    }

    /**
     * Clear all state
     */
    clear() {
        this.opportunities.clear();
        this.edgeHistory.clear();
        this.portfolioState = null;
        this.currentAttractor = null;
        this.attractorStrength = 0;

        if (this.onUpdate) {
            this.onUpdate(this.getState());
        }
    }

    /**
     * Set bankroll
     */
    setBankroll(bankroll) {
        this.config.bankroll = bankroll;
    }
}

// Export to window
window.BettingGeometryEngine = BettingGeometryEngine;
window.CHANNELS = CHANNELS;
window.ATTRACTORS = ATTRACTORS;
