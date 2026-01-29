/**
 * RiskManager - Risk Controls and Bet Filtering
 *
 * Implements risk management rules to protect the bankroll:
 * - Maximum daily/weekly exposure limits
 * - Streak-based bet reduction
 * - Correlation limits (same-game parlays)
 * - Drawdown-based Kelly reduction
 *
 * @class RiskManager
 */

export class RiskManager {
    constructor(config = {}) {
        this.config = {
            // Exposure limits
            maxDailyExposure: config.maxDailyExposure || 0.15,
            maxWeeklyExposure: config.maxWeeklyExposure || 0.50,
            maxSingleGameExposure: config.maxSingleGameExposure || 0.05,

            // Streak limits
            maxLosingStreak: config.maxLosingStreak || 5,
            streakReduction: config.streakReduction || 0.5, // Reduce bets by 50% during streak

            // Drawdown limits
            maxDrawdown: config.maxDrawdown || 0.20,
            drawdownScaling: true, // Reduce Kelly as drawdown increases

            // Confidence limits
            minConfidence: config.minConfidence || 0.5,
            maxConfidence: config.maxConfidence || 0.95,

            // Bet limits
            minBetSize: config.minBetSize || 10,
            maxBetSize: config.maxBetSize || 500,

            ...config
        };

        // State tracking
        this.state = {
            dailyExposure: 0,
            weeklyExposure: 0,
            currentStreak: 0,
            streakType: null, // 'winning' or 'losing'
            peakBankroll: config.bankroll || 10000,
            currentDrawdown: 0,
            betHistory: []
        };
    }

    /**
     * Filter bets through risk controls
     * @param {Array} bets - Proposed bets
     * @param {Object} context - Current context
     * @returns {Array} Filtered and adjusted bets
     */
    filterBets(bets, context = {}) {
        const { currentBankroll, existingExposure = 0 } = context;

        // Update state
        this.updateState(context);

        // Filter out invalid bets
        let filtered = bets.filter(bet => this.validateBet(bet));

        // Apply risk adjustments
        filtered = filtered.map(bet => this.adjustBet(bet, context));

        // Apply exposure limits
        filtered = this.applyExposureLimits(filtered, existingExposure);

        // Sort by value (edge * confidence)
        filtered.sort((a, b) => (b.edge * b.confidence) - (a.edge * a.confidence));

        return filtered;
    }

    /**
     * Validate a single bet
     * @param {Object} bet - Bet to validate
     * @returns {boolean} True if bet passes validation
     */
    validateBet(bet) {
        // CRITICAL FIX: Null/undefined check
        if (!bet || typeof bet !== 'object') {
            return false;
        }

        // Validate required fields exist
        const confidence = bet.confidence;
        const edge = bet.edge;
        const modelProb = bet.modelProb;

        // Check confidence bounds (with null handling)
        if (confidence === null || confidence === undefined || isNaN(confidence)) {
            bet.rejectionReason = 'missing_confidence';
            return false;
        }

        if (confidence < this.config.minConfidence) {
            bet.rejectionReason = 'confidence_too_low';
            return false;
        }

        if (confidence > this.config.maxConfidence) {
            bet.rejectionReason = 'confidence_suspiciously_high';
            return false;
        }

        // Check edge (with null handling)
        if (edge === null || edge === undefined || isNaN(edge)) {
            bet.rejectionReason = 'missing_edge';
            return false;
        }

        if (edge <= 0) {
            bet.rejectionReason = 'negative_edge';
            return false;
        }

        // Check probability bounds (with null handling)
        if (modelProb === null || modelProb === undefined || isNaN(modelProb)) {
            bet.rejectionReason = 'missing_probability';
            return false;
        }

        if (modelProb < 0.1 || modelProb > 0.9) {
            bet.rejectionReason = 'extreme_probability';
            return false;
        }

        // Validate gameId for exposure tracking
        if (!bet.gameId) {
            bet.rejectionReason = 'missing_game_id';
            return false;
        }

        return true;
    }

    /**
     * Adjust bet based on risk factors
     */
    adjustBet(bet, context) {
        let adjustedBet = { ...bet };
        let multiplier = 1.0;

        // Apply drawdown scaling
        if (this.config.drawdownScaling && this.state.currentDrawdown > 0) {
            // Linear reduction: at max drawdown, reduce to 0
            const drawdownFactor = 1 - (this.state.currentDrawdown / this.config.maxDrawdown);
            multiplier *= Math.max(0.25, drawdownFactor);
            adjustedBet.drawdownAdjustment = drawdownFactor;
        }

        // Apply streak adjustment
        if (this.state.streakType === 'losing' &&
            this.state.currentStreak >= 3) {
            multiplier *= this.config.streakReduction;
            adjustedBet.streakAdjustment = this.config.streakReduction;
        }

        // Apply confidence scaling (lower confidence = smaller bet)
        if (bet.confidence < 0.8) {
            multiplier *= bet.confidence / 0.8;
            adjustedBet.confidenceAdjustment = bet.confidence / 0.8;
        }

        adjustedBet.riskMultiplier = multiplier;

        return adjustedBet;
    }

    /**
     * Apply exposure limits to bet list
     */
    applyExposureLimits(bets, existingExposure) {
        let remainingDailyBudget = this.config.maxDailyExposure -
            this.state.dailyExposure - existingExposure;

        const gameExposure = new Map();
        const approved = [];

        for (const bet of bets) {
            // Check daily budget
            if (remainingDailyBudget <= 0) break;

            // Check single-game exposure
            const currentGameExposure = gameExposure.get(bet.gameId) || 0;
            if (currentGameExposure >= this.config.maxSingleGameExposure) {
                bet.rejectionReason = 'game_exposure_limit';
                continue;
            }

            // Calculate allowed bet size
            const maxForGame = this.config.maxSingleGameExposure - currentGameExposure;
            const maxForDay = remainingDailyBudget;
            const maxAllowed = Math.min(maxForGame, maxForDay);

            // Adjust bet to fit within limits
            const adjustedBet = { ...bet };

            // CRITICAL FIX: Safely handle undefined/NaN fraction
            let fractionValue = adjustedBet.fraction;
            if (fractionValue === null || fractionValue === undefined || isNaN(fractionValue)) {
                fractionValue = 0;
            }

            adjustedBet.fraction = Math.min(Math.max(0, fractionValue), maxAllowed);

            approved.push(adjustedBet);

            // Update tracking with validated fraction
            const trackedFraction = adjustedBet.fraction || 0;
            remainingDailyBudget -= trackedFraction;
            gameExposure.set(bet.gameId, currentGameExposure + trackedFraction);
        }

        return approved;
    }

    /**
     * Update state based on context
     */
    updateState(context) {
        if (context.currentBankroll !== undefined) {
            if (context.currentBankroll > this.state.peakBankroll) {
                this.state.peakBankroll = context.currentBankroll;
            }

            this.state.currentDrawdown =
                (this.state.peakBankroll - context.currentBankroll) /
                this.state.peakBankroll;
        }

        // Reset daily exposure at day boundary
        if (context.newDay) {
            this.state.dailyExposure = 0;
        }

        // Reset weekly exposure at week boundary
        if (context.newWeek) {
            this.state.weeklyExposure = 0;
        }
    }

    /**
     * Record a bet result and update streaks
     */
    recordResult(bet, won) {
        this.state.betHistory.push({
            ...bet,
            won,
            timestamp: Date.now()
        });

        // Update streak
        if (this.state.streakType === null) {
            this.state.streakType = won ? 'winning' : 'losing';
            this.state.currentStreak = 1;
        } else if ((won && this.state.streakType === 'winning') ||
            (!won && this.state.streakType === 'losing')) {
            this.state.currentStreak++;
        } else {
            this.state.streakType = won ? 'winning' : 'losing';
            this.state.currentStreak = 1;
        }
    }

    /**
     * Compute risk metrics for a set of allocations
     */
    computeRiskMetrics(allocations) {
        const activeAllocations = allocations.filter(a => a.amount > 0);

        if (activeAllocations.length === 0) {
            return {
                totalExposure: 0,
                maxSingleBet: 0,
                numBets: 0,
                riskLevel: 'none'
            };
        }

        const totalExposure = activeAllocations.reduce((s, a) => s + a.fraction, 0);
        const maxSingleBet = Math.max(...activeAllocations.map(a => a.fraction));
        const avgEdge = activeAllocations.reduce((s, a) => s + a.edge, 0) /
            activeAllocations.length;

        // Concentration (Herfindahl index)
        const concentration = activeAllocations.reduce(
            (s, a) => s + (a.fraction / totalExposure) ** 2, 0
        );

        // Risk level classification
        let riskLevel = 'low';
        if (totalExposure > 0.15 || concentration > 0.5) {
            riskLevel = 'medium';
        }
        if (totalExposure > 0.25 || concentration > 0.7) {
            riskLevel = 'high';
        }
        if (this.state.currentDrawdown > 0.1) {
            riskLevel = 'elevated';
        }

        return {
            totalExposure,
            maxSingleBet,
            avgEdge,
            numBets: activeAllocations.length,
            concentration,
            riskLevel,
            currentDrawdown: this.state.currentDrawdown,
            currentStreak: this.state.currentStreak,
            streakType: this.state.streakType
        };
    }

    /**
     * Get risk warnings for current state
     */
    getWarnings() {
        const warnings = [];

        if (this.state.currentDrawdown > 0.1) {
            warnings.push({
                level: 'warning',
                message: `Drawdown at ${(this.state.currentDrawdown * 100).toFixed(1)}%`
            });
        }

        if (this.state.currentDrawdown > this.config.maxDrawdown * 0.8) {
            warnings.push({
                level: 'critical',
                message: `Approaching max drawdown limit (${(this.config.maxDrawdown * 100).toFixed(0)}%)`
            });
        }

        if (this.state.streakType === 'losing' && this.state.currentStreak >= 3) {
            warnings.push({
                level: 'warning',
                message: `${this.state.currentStreak} consecutive losses - reducing bet sizes`
            });
        }

        if (this.state.dailyExposure > this.config.maxDailyExposure * 0.8) {
            warnings.push({
                level: 'info',
                message: `Approaching daily exposure limit`
            });
        }

        return warnings;
    }

    /**
     * Reset state
     */
    reset() {
        this.state = {
            dailyExposure: 0,
            weeklyExposure: 0,
            currentStreak: 0,
            streakType: null,
            peakBankroll: this.config.bankroll || 10000,
            currentDrawdown: 0,
            betHistory: []
        };
    }
}
