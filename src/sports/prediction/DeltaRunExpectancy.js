/**
 * DeltaRunExpectancy - Run Expectancy Matrix and Calculations
 *
 * Uses the RE24 (Run Expectancy based on 24 base-out states) matrix
 * to convert pitch-level predictions into run scoring predictions.
 *
 * The RE24 matrix defines expected runs from each of the 24 states:
 * - 3 out states (0, 1, 2 outs)
 * - 8 base states (empty, 1st, 2nd, 3rd, 1st+2nd, 1st+3rd, 2nd+3rd, loaded)
 *
 * @class DeltaRunExpectancy
 */

export class DeltaRunExpectancy {
    constructor(config = {}) {
        this.config = {
            // Use historical RE24 matrix or compute custom
            useHistoricalMatrix: true,
            ...config
        };

        // Historical RE24 matrix (MLB averages, 2015-2023)
        // Format: baseState -> [RE with 0 outs, RE with 1 out, RE with 2 outs]
        this.reMatrix = {
            '---': [0.481, 0.254, 0.098],  // Empty
            '1--': [0.859, 0.509, 0.224],  // Runner on 1st
            '-2-': [1.100, 0.664, 0.319],  // Runner on 2nd
            '--3': [1.356, 0.950, 0.353],  // Runner on 3rd
            '12-': [1.437, 0.884, 0.429],  // 1st and 2nd
            '1-3': [1.798, 1.130, 0.478],  // 1st and 3rd
            '-23': [1.920, 1.352, 0.565],  // 2nd and 3rd
            '123': [2.282, 1.520, 0.736]   // Bases loaded
        };

        // Event outcomes (average runs scored + base state change)
        this.eventOutcomes = {
            single: { avgRuns: 0.47, advanceRunners: true },
            double: { avgRuns: 0.78, advanceRunners: true },
            triple: { avgRuns: 1.04, advanceRunners: true },
            home_run: { avgRuns: 1.39, clearBases: true },
            walk: { avgRuns: 0.32, forceAdvance: true },
            strikeout: { avgRuns: 0, addOut: true },
            field_out: { avgRuns: 0.10, addOut: true }, // Including sac flies
            double_play: { avgRuns: 0.03, addOuts: 2 },
            error: { avgRuns: 0.55, advanceRunners: true }
        };
    }

    /**
     * Get base-out state string
     * @param {Object} state - {on1b, on2b, on3b, outs}
     */
    getStateKey(state) {
        const base1 = state.on1b ? '1' : '-';
        const base2 = state.on2b ? '2' : '-';
        const base3 = state.on3b ? '3' : '-';
        return `${base1}${base2}${base3}`;
    }

    /**
     * Get run expectancy for a state
     */
    getRunExpectancy(state) {
        const key = this.getStateKey(state);
        const outs = Math.min(state.outs || 0, 2);
        return this.reMatrix[key]?.[outs] || 0;
    }

    /**
     * Calculate delta RE from a pitch/event
     * @param {Object} before - State before event
     * @param {Object} after - State after event
     * @param {number} runsScored - Runs scored on the play
     */
    calculateDeltaRE(before, after, runsScored = 0) {
        const reBefore = this.getRunExpectancy(before);
        const reAfter = this.getRunExpectancy(after);

        // Delta RE = (RE_after - RE_before) + runs_scored
        // Positive = good for offense
        // Negative = good for defense (pitcher)
        return (reAfter - reBefore) + runsScored;
    }

    /**
     * Predict delta RE for a pitch based on geometric features
     * @param {Object} features - Geometric features
     * @param {Object} state - Current base-out state
     * @param {Object} model - Trained model weights
     */
    predictPitchDeltaRE(features, state, model) {
        // Get current RE (baseline)
        const currentRE = this.getRunExpectancy(state);

        // Predict outcome probabilities from geometric features
        const outcomeProbs = this.predictOutcomeProbabilities(features, model);

        // Calculate expected delta RE
        let expectedDeltaRE = 0;

        for (const [outcome, prob] of Object.entries(outcomeProbs)) {
            const eventDeltaRE = this.getEventDeltaRE(outcome, state);
            expectedDeltaRE += prob * eventDeltaRE;
        }

        return {
            currentRE,
            expectedDeltaRE,
            outcomeProbs,
            state
        };
    }

    /**
     * Predict outcome probabilities from geometric features
     */
    predictOutcomeProbabilities(features, model) {
        // Base probabilities (league average)
        const baseProbs = {
            strikeout: 0.225,
            walk: 0.085,
            single: 0.155,
            double: 0.045,
            triple: 0.005,
            home_run: 0.030,
            field_out: 0.450,
            double_play: 0.005
        };

        if (!model) return baseProbs;

        // Adjust based on geometric features
        const adjusted = { ...baseProbs };

        // Tunnel efficiency increases strikeout rate
        if (features.tunnelEfficiency) {
            const tunnelBoost = (features.tunnelEfficiency - 0.5) * 0.1;
            adjusted.strikeout *= (1 + tunnelBoost);
            adjusted.single *= (1 - tunnelBoost * 0.3);
        }

        // Arsenal stability affects consistency
        if (features.stability) {
            const stabilityEffect = (features.stability - 0.5) * 0.05;
            adjusted.walk *= (1 - stabilityEffect);
            adjusted.strikeout *= (1 + stabilityEffect * 0.5);
        }

        // Zone expansion (umpire) affects walks
        if (features.zoneExpansion) {
            const expansionEffect = features.zoneExpansion - 1;
            adjusted.walk *= (1 - expansionEffect * 0.3);
            adjusted.strikeout *= (1 + expansionEffect * 0.2);
        }

        // Normalize probabilities
        const total = Object.values(adjusted).reduce((s, p) => s + p, 0);
        for (const key of Object.keys(adjusted)) {
            adjusted[key] /= total;
        }

        return adjusted;
    }

    /**
     * Get expected delta RE for an event outcome
     */
    getEventDeltaRE(event, state) {
        const currentRE = this.getRunExpectancy(state);
        const outcome = this.eventOutcomes[event];

        if (!outcome) return 0;

        // Simulate outcome to get new state
        const newState = this.simulateOutcome(event, state);
        const newRE = this.getRunExpectancy(newState.state);

        return (newRE - currentRE) + newState.runsScored;
    }

    /**
     * Simulate an outcome to get the new state
     */
    simulateOutcome(event, state) {
        let newState = { ...state };
        let runsScored = 0;

        switch (event) {
            case 'strikeout':
            case 'field_out':
                newState.outs = Math.min((state.outs || 0) + 1, 3);
                if (newState.outs >= 3) {
                    // Inning over, reset state
                    newState = { on1b: false, on2b: false, on3b: false, outs: 0 };
                }
                break;

            case 'double_play':
                newState.outs = Math.min((state.outs || 0) + 2, 3);
                newState.on1b = false;
                if (newState.outs >= 3) {
                    newState = { on1b: false, on2b: false, on3b: false, outs: 0 };
                }
                break;

            case 'walk':
                // Force runners
                if (state.on1b && state.on2b && state.on3b) {
                    runsScored = 1;
                } else if (state.on1b && state.on2b) {
                    newState.on3b = true;
                } else if (state.on1b) {
                    newState.on2b = true;
                }
                newState.on1b = true;
                break;

            case 'single':
                if (state.on3b) runsScored++;
                if (state.on2b) runsScored += 0.65; // Average scoring from 2nd
                newState.on3b = state.on2b && Math.random() < 0.35;
                newState.on2b = state.on1b || (state.on2b && Math.random() < 0.65);
                newState.on1b = true;
                break;

            case 'double':
                if (state.on3b) runsScored++;
                if (state.on2b) runsScored++;
                if (state.on1b) runsScored += 0.6;
                newState.on3b = state.on1b && Math.random() < 0.4;
                newState.on2b = true;
                newState.on1b = false;
                break;

            case 'triple':
                runsScored = (state.on1b ? 1 : 0) + (state.on2b ? 1 : 0) + (state.on3b ? 1 : 0);
                newState.on3b = true;
                newState.on2b = false;
                newState.on1b = false;
                break;

            case 'home_run':
                runsScored = 1 + (state.on1b ? 1 : 0) + (state.on2b ? 1 : 0) + (state.on3b ? 1 : 0);
                newState.on1b = false;
                newState.on2b = false;
                newState.on3b = false;
                break;
        }

        return { state: newState, runsScored };
    }

    /**
     * Project total runs for a game based on geometric features
     * @param {Object} homeFeatures - Home team pitcher/defense features
     * @param {Object} awayFeatures - Away team pitcher/defense features
     * @param {number} innings - Number of innings (default 9)
     */
    projectGameRuns(homeFeatures, awayFeatures, innings = 9) {
        // Base run expectancy per inning (league average ~0.5)
        const baseRunsPerInning = 0.5;

        // Adjust based on geometric features
        const homeModifier = this.computeRunModifier(awayFeatures); // Away pitcher vs home batters
        const awayModifier = this.computeRunModifier(homeFeatures); // Home pitcher vs away batters

        const projectedHomeRuns = baseRunsPerInning * innings * homeModifier;
        const projectedAwayRuns = baseRunsPerInning * innings * awayModifier;

        return {
            homeRuns: projectedHomeRuns,
            awayRuns: projectedAwayRuns,
            totalRuns: projectedHomeRuns + projectedAwayRuns,
            runDifferential: projectedHomeRuns - projectedAwayRuns
        };
    }

    /**
     * Compute run modifier from geometric features
     */
    computeRunModifier(features) {
        let modifier = 1.0;

        // Tunnel efficiency suppresses runs
        if (features.tunnelEfficiency !== undefined) {
            modifier *= 1 - (features.tunnelEfficiency - 0.5) * 0.15;
        }

        // Arsenal stability suppresses runs
        if (features.stability !== undefined) {
            modifier *= 1 - (features.stability - 0.5) * 0.10;
        }

        // Zone expansion suppresses runs
        if (features.zoneExpansion !== undefined) {
            modifier *= 1 - (features.zoneExpansion - 1) * 0.20;
        }

        // Environmental factors
        if (features.flyBallMultiplier !== undefined) {
            modifier *= features.flyBallMultiplier;
        }

        // Clamp to reasonable range
        return Math.max(0.5, Math.min(2.0, modifier));
    }

    /**
     * Get the full RE24 matrix for reference
     */
    getMatrix() {
        return { ...this.reMatrix };
    }
}
