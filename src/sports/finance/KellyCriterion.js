/**
 * KellyCriterion - Optimal Bet Sizing Mathematics
 *
 * The Kelly Criterion is the mathematically optimal strategy for
 * maximizing the logarithm of wealth over repeated bets.
 *
 * Single bet formula: f* = (bp - q) / b
 * where:
 *   f* = fraction of bankroll to bet
 *   b = net odds (decimal - 1)
 *   p = probability of winning
 *   q = probability of losing (1 - p)
 *
 * For simultaneous bets, we use convex optimization.
 *
 * @class KellyCriterion
 */

export class KellyCriterion {
    constructor(config = {}) {
        this.config = {
            // Kelly fraction (1 = full Kelly, 0.25 = quarter Kelly)
            fraction: config.fraction || 0.25,

            // Maximum single bet as fraction of bankroll
            maxSingleBet: config.maxSingleBet || 0.05,

            // Minimum edge required to bet
            minEdge: config.minEdge || 0.02,

            // Minimum probability threshold
            minProb: config.minProb || 0.35,
            maxProb: config.maxProb || 0.75,

            ...config
        };
    }

    /**
     * Calculate single-bet Kelly stake
     * @param {number} prob - Win probability
     * @param {number} odds - American odds
     * @returns {number} Fraction of bankroll to bet
     */
    calculateSingleKelly(prob, odds) {
        // Input validation
        if (prob === null || prob === undefined || isNaN(prob)) {
            return 0;
        }
        if (odds === null || odds === undefined || isNaN(odds)) {
            return 0;
        }

        // Validate probability is in valid range
        if (prob <= 0 || prob >= 1) {
            return 0;
        }

        // Convert American to decimal
        const decimal = this.americanToDecimal(odds);
        const b = decimal - 1; // Net odds

        // CRITICAL FIX: Prevent division by zero when b = 0 (odds = -100)
        if (b <= 0) {
            return 0; // No edge possible with zero or negative net odds
        }

        const q = 1 - prob;

        // Kelly formula
        const kelly = (b * prob - q) / b;

        // Apply fractional Kelly and constraints
        let stake = kelly * this.config.fraction;

        // Clamp to valid range
        stake = Math.max(0, Math.min(stake, this.config.maxSingleBet));

        return stake;
    }

    /**
     * Calculate edge (expected value)
     * @param {number} prob - Win probability
     * @param {number} odds - American odds
     */
    calculateEdge(prob, odds) {
        const decimal = this.americanToDecimal(odds);
        // EV = p * (decimal - 1) - (1 - p) = p * decimal - 1
        return prob * decimal - 1;
    }

    /**
     * Calculate implied probability from odds
     * @param {number} odds - American odds
     * @returns {number} Implied probability (0-1)
     */
    impliedProbability(odds) {
        // Input validation
        if (odds === null || odds === undefined || isNaN(odds)) {
            return 0.5; // Return neutral probability for invalid odds
        }

        // CRITICAL FIX: Handle edge case where odds = 0 (invalid)
        if (odds === 0) {
            return 0.5; // No valid implied probability
        }

        if (odds > 0) {
            return 100 / (odds + 100);
        } else {
            return Math.abs(odds) / (Math.abs(odds) + 100);
        }
    }

    /**
     * Calculate no-vig probability (true odds)
     * @param {number} odds1 - American odds for outcome 1
     * @param {number} odds2 - American odds for outcome 2
     * @returns {Object} No-vig probabilities and vig amount
     */
    noVigProbability(odds1, odds2) {
        const p1 = this.impliedProbability(odds1);
        const p2 = this.impliedProbability(odds2);
        const totalImplied = p1 + p2;

        // CRITICAL FIX: Prevent division by zero
        if (totalImplied <= 0 || isNaN(totalImplied)) {
            return {
                prob1: 0.5,
                prob2: 0.5,
                vig: 0,
                error: 'Invalid odds resulted in zero total implied probability'
            };
        }

        return {
            prob1: p1 / totalImplied,
            prob2: p2 / totalImplied,
            vig: totalImplied - 1
        };
    }

    /**
     * Validate a bet opportunity
     */
    validateBet(bet) {
        const issues = [];

        // Check probability bounds
        if (bet.modelProb < this.config.minProb) {
            issues.push(`Probability ${bet.modelProb.toFixed(3)} below minimum ${this.config.minProb}`);
        }
        if (bet.modelProb > this.config.maxProb) {
            issues.push(`Probability ${bet.modelProb.toFixed(3)} above maximum ${this.config.maxProb}`);
        }

        // Check edge
        if (bet.edge < this.config.minEdge) {
            issues.push(`Edge ${(bet.edge * 100).toFixed(2)}% below minimum ${(this.config.minEdge * 100).toFixed(2)}%`);
        }

        // Check for suspicious odds
        const decimal = this.americanToDecimal(bet.odds);
        if (decimal < 1.05 || decimal > 20) {
            issues.push(`Suspicious odds: ${bet.odds} (decimal: ${decimal.toFixed(2)})`);
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Calculate expected growth rate
     */
    expectedGrowthRate(prob, odds, fraction) {
        const decimal = this.americanToDecimal(odds);
        const q = 1 - prob;

        // G = p * log(1 + f*b) + q * log(1 - f)
        const growth = prob * Math.log(1 + fraction * (decimal - 1)) +
            q * Math.log(1 - fraction);

        return growth;
    }

    /**
     * Find optimal fraction numerically
     */
    findOptimalFraction(prob, odds) {
        const decimal = this.americanToDecimal(odds);
        const b = decimal - 1;

        let bestFraction = 0;
        let bestGrowth = 0;

        // Binary search for optimal
        for (let f = 0.001; f < 1; f += 0.001) {
            const growth = this.expectedGrowthRate(prob, odds, f);
            if (growth > bestGrowth) {
                bestGrowth = growth;
                bestFraction = f;
            }
        }

        return {
            fraction: bestFraction,
            growthRate: bestGrowth
        };
    }

    // === Utility Methods ===

    americanToDecimal(odds) {
        if (odds > 0) {
            return 1 + odds / 100;
        } else {
            return 1 + 100 / Math.abs(odds);
        }
    }

    decimalToAmerican(decimal) {
        if (decimal >= 2) {
            return Math.round((decimal - 1) * 100);
        } else {
            return Math.round(-100 / (decimal - 1));
        }
    }

    /**
     * Calculate bankroll requirements
     */
    bankrollRequirements(winRate, avgOdds, targetBets) {
        const edge = this.calculateEdge(winRate, avgOdds);
        const decimal = this.americanToDecimal(avgOdds);

        // Variance per bet
        const variance = winRate * (decimal - 1) ** 2 +
            (1 - winRate) * 1;

        // Standard deviation
        const stdDev = Math.sqrt(variance);

        // Risk of ruin calculations
        // Simplified: bankroll needed for 1% risk of 50% drawdown
        const betsPerUnit = targetBets;
        const expectedGrowth = edge * betsPerUnit;
        const expectedVolatility = stdDev * Math.sqrt(betsPerUnit);

        // 99% confidence interval
        const worstCase = expectedGrowth - 2.33 * expectedVolatility;

        return {
            expectedGrowth,
            expectedVolatility,
            worstCase99: worstCase,
            suggestedKelly: edge > 0 ? Math.min(edge / variance, 0.25) : 0,
            unitsNeeded: worstCase < 0 ? Math.ceil(-worstCase / 0.5) : 1
        };
    }
}
