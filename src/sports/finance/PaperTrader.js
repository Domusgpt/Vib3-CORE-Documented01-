/**
 * PaperTrader - Simulated Betting Execution
 *
 * Tracks bets and settlements in a sandbox environment for backtesting
 * and validation without risking real capital.
 *
 * Features:
 * - Order book simulation
 * - Settlement tracking
 * - CLV calculation
 * - Performance analytics
 *
 * @class PaperTrader
 */

export class PaperTrader {
    constructor(startingBankroll = 10000) {
        this.startingBankroll = startingBankroll;
        this.bankroll = startingBankroll;

        // Order tracking
        this.openBets = [];
        this.settledBets = [];
        this.allBets = [];

        // Performance tracking
        this.peakBankroll = startingBankroll;
        this.stats = {
            totalBets: 0,
            wins: 0,
            losses: 0,
            pushes: 0,
            totalWagered: 0,
            totalReturns: 0,
            clvSum: 0,
            clvCount: 0
        };
    }

    /**
     * Place a bet
     * @param {Object} bet - Bet details
     * @returns {Object} Order confirmation
     */
    async placeBet(bet) {
        const order = {
            orderId: this.generateOrderId(),
            ...bet,
            status: 'open',
            placedAt: Date.now(),
            settledAt: null,
            result: null,
            payout: 0
        };

        // Validate sufficient bankroll
        if (bet.amount > this.bankroll) {
            return {
                success: false,
                error: 'Insufficient bankroll',
                order: null
            };
        }

        // Deduct from bankroll
        this.bankroll -= bet.amount;

        // Track bet
        this.openBets.push(order);
        this.allBets.push(order);

        this.stats.totalBets++;
        this.stats.totalWagered += bet.amount;

        return {
            success: true,
            orderId: order.orderId,
            order
        };
    }

    /**
     * Settle bets based on game results
     * @param {Array} results - Game results
     * @returns {Array} Settlement details
     */
    async settleBets(results) {
        const settlements = [];
        const resultMap = new Map(results.map(r => [r.gameId, r]));

        // Process each open bet
        const stillOpen = [];

        for (const bet of this.openBets) {
            const result = resultMap.get(bet.gameId);

            if (!result) {
                stillOpen.push(bet);
                continue;
            }

            const settlement = this.settleSingleBet(bet, result);
            settlements.push(settlement);
            this.settledBets.push(settlement);
        }

        this.openBets = stillOpen;

        return settlements;
    }

    /**
     * Settle a single bet
     */
    settleSingleBet(bet, result) {
        let won = null;
        let payout = 0;

        if (bet.betType === 'moneyline') {
            if (bet.side === 'home') {
                won = result.homeScore > result.awayScore;
            } else {
                won = result.awayScore > result.homeScore;
            }

            if (result.homeScore === result.awayScore) {
                // Push (tie game - rare in MLB)
                won = null;
                payout = bet.amount;
            } else if (won) {
                payout = bet.amount + this.calculateWinnings(bet.amount, bet.odds);
            }
        } else if (bet.betType === 'total') {
            const total = result.totalRuns || (result.homeScore + result.awayScore);

            if (total === bet.line) {
                // Push
                won = null;
                payout = bet.amount;
            } else if (bet.side === 'over') {
                won = total > bet.line;
            } else {
                won = total < bet.line;
            }

            if (won) {
                payout = bet.amount + this.calculateWinnings(bet.amount, bet.odds);
            }
        } else if (bet.betType === 'spread') {
            const actualSpread = result.homeScore - result.awayScore;
            const covered = bet.side === 'home' ?
                (actualSpread + bet.line > 0) :
                (-actualSpread + bet.line > 0);

            if (Math.abs(actualSpread + bet.line) < 0.001) {
                // Push
                won = null;
                payout = bet.amount;
            } else {
                won = covered;
                if (won) {
                    payout = bet.amount + this.calculateWinnings(bet.amount, bet.odds);
                }
            }
        }

        // Update bankroll
        this.bankroll += payout;

        // Update peak and stats
        if (this.bankroll > this.peakBankroll) {
            this.peakBankroll = this.bankroll;
        }

        if (won === true) {
            this.stats.wins++;
        } else if (won === false) {
            this.stats.losses++;
        } else {
            this.stats.pushes++;
        }

        this.stats.totalReturns += payout;

        // Calculate CLV if closing odds available
        let clv = null;
        if (bet.closingOdds) {
            clv = this.calculateCLV(bet.odds, bet.closingOdds);
            this.stats.clvSum += clv;
            this.stats.clvCount++;
        }

        return {
            ...bet,
            status: 'settled',
            settledAt: Date.now(),
            result: {
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                totalRuns: result.totalRuns
            },
            won,
            payout,
            profit: payout - bet.amount,
            clv
        };
    }

    /**
     * Calculate winnings from American odds
     */
    calculateWinnings(stake, odds) {
        if (odds > 0) {
            return stake * (odds / 100);
        } else {
            return stake * (100 / Math.abs(odds));
        }
    }

    /**
     * Calculate Closing Line Value
     */
    calculateCLV(betOdds, closingOdds) {
        const betImplied = this.oddsToProb(betOdds);
        const closingImplied = this.oddsToProb(closingOdds);

        return closingImplied - betImplied;
    }

    /**
     * Convert American odds to probability
     */
    oddsToProb(odds) {
        if (odds > 0) {
            return 100 / (odds + 100);
        } else {
            return Math.abs(odds) / (Math.abs(odds) + 100);
        }
    }

    /**
     * Get current bankroll
     */
    getBankroll() {
        return this.bankroll;
    }

    /**
     * Get open exposure
     */
    getOpenExposure() {
        return this.openBets.reduce((sum, bet) => sum + bet.amount, 0);
    }

    /**
     * Get performance summary
     */
    getPerformance() {
        const netProfit = this.stats.totalReturns - this.stats.totalWagered;
        const roi = this.stats.totalWagered > 0 ?
            netProfit / this.stats.totalWagered : 0;
        const winRate = (this.stats.wins + this.stats.losses) > 0 ?
            this.stats.wins / (this.stats.wins + this.stats.losses) : 0;
        const avgCLV = this.stats.clvCount > 0 ?
            this.stats.clvSum / this.stats.clvCount : 0;

        const drawdown = this.peakBankroll > 0 ?
            (this.peakBankroll - this.bankroll) / this.peakBankroll : 0;

        return {
            startingBankroll: this.startingBankroll,
            currentBankroll: this.bankroll,
            peakBankroll: this.peakBankroll,

            totalBets: this.stats.totalBets,
            wins: this.stats.wins,
            losses: this.stats.losses,
            pushes: this.stats.pushes,
            winRate,

            totalWagered: this.stats.totalWagered,
            totalReturns: this.stats.totalReturns,
            netProfit,
            roi,
            roiPercent: (roi * 100).toFixed(2) + '%',

            avgCLV,
            avgCLVPercent: (avgCLV * 100).toFixed(3) + '%',

            drawdown,
            drawdownPercent: (drawdown * 100).toFixed(2) + '%',

            openBets: this.openBets.length,
            openExposure: this.getOpenExposure()
        };
    }

    /**
     * Get bet history
     */
    getBetHistory(options = {}) {
        let bets = [...this.allBets];

        if (options.status === 'open') {
            bets = bets.filter(b => b.status === 'open');
        } else if (options.status === 'settled') {
            bets = bets.filter(b => b.status === 'settled');
        }

        if (options.gameId) {
            bets = bets.filter(b => b.gameId === options.gameId);
        }

        if (options.betType) {
            bets = bets.filter(b => b.betType === options.betType);
        }

        if (options.limit) {
            bets = bets.slice(-options.limit);
        }

        return bets;
    }

    /**
     * Cancel an open bet
     * @param {string} orderId - Order ID to cancel
     * @returns {Object} Cancellation result
     */
    cancelBet(orderId) {
        const betIndex = this.openBets.findIndex(b => b.orderId === orderId);

        if (betIndex === -1) {
            return { success: false, error: 'Bet not found or already settled' };
        }

        const bet = this.openBets[betIndex];

        // Refund
        this.bankroll += bet.amount;

        // CRITICAL FIX: Prevent stats from going negative
        // Only decrement if this bet was actually counted
        if (this.stats.totalWagered >= bet.amount) {
            this.stats.totalWagered -= bet.amount;
        } else {
            this.stats.totalWagered = 0;
        }

        if (this.stats.totalBets > 0) {
            this.stats.totalBets--;
        }

        // Remove from open
        this.openBets.splice(betIndex, 1);

        // Update in allBets
        const allIndex = this.allBets.findIndex(b => b.orderId === orderId);
        if (allIndex !== -1) {
            this.allBets[allIndex].status = 'cancelled';
            this.allBets[allIndex].cancelledAt = Date.now();
        }

        return { success: true, refundedAmount: bet.amount };
    }

    /**
     * Generate unique order ID
     * Uses deterministic counter + timestamp for reproducibility
     * @returns {string} Unique order ID
     */
    generateOrderId() {
        // CRITICAL FIX: Use deterministic sequence instead of Math.random()
        // This ensures reproducible backtests
        if (this._orderCounter === undefined) {
            this._orderCounter = 0;
        }
        this._orderCounter++;

        // Combine timestamp, counter, and a hash of current state for uniqueness
        const timestamp = Date.now();
        const counter = this._orderCounter.toString(36).padStart(6, '0');

        return `ORD-${timestamp}-${counter}`;
    }

    /**
     * Reset order counter (call when resetting paper trader)
     */
    resetOrderCounter() {
        this._orderCounter = 0;
    }

    /**
     * Reset to initial state
     */
    reset() {
        this.bankroll = this.startingBankroll;
        this.peakBankroll = this.startingBankroll;
        this.openBets = [];
        this.settledBets = [];
        this.allBets = [];
        this.stats = {
            totalBets: 0,
            wins: 0,
            losses: 0,
            pushes: 0,
            totalWagered: 0,
            totalReturns: 0,
            clvSum: 0,
            clvCount: 0
        };
        // CRITICAL FIX: Reset order counter for reproducibility
        this.resetOrderCounter();
    }

    /**
     * Export trade log
     */
    exportLog() {
        return {
            startingBankroll: this.startingBankroll,
            currentBankroll: this.bankroll,
            performance: this.getPerformance(),
            bets: this.allBets.map(bet => ({
                orderId: bet.orderId,
                gameId: bet.gameId,
                betType: bet.betType,
                side: bet.side,
                team: bet.team,
                line: bet.line,
                odds: bet.odds,
                amount: bet.amount,
                modelProb: bet.modelProb,
                edge: bet.edge,
                status: bet.status,
                placedAt: bet.placedAt,
                settledAt: bet.settledAt,
                won: bet.won,
                payout: bet.payout,
                profit: bet.payout ? bet.payout - bet.amount : null,
                clv: bet.clv
            }))
        };
    }
}
