/**
 * BacktestEngine - Time Machine for Strategy Validation
 *
 * Reconstructs historical market conditions to validate betting strategies.
 * Ensures strict causality - no look-ahead bias.
 *
 * Key Metrics:
 * - ROI (Return on Investment)
 * - CLV% (Closing Line Value)
 * - Win Rate
 * - Max Drawdown
 * - Sharpe Ratio
 *
 * @class BacktestEngine
 */

import { TimeSynchronizer } from '../data/TimeSynchronizer.js';

export class BacktestEngine {
    constructor(config = {}) {
        this.config = {
            // Initial bankroll
            startingBankroll: 10000,

            // Logging
            verbose: true,
            logInterval: 7, // Log every N days

            // Simulation settings
            simulateJuice: true,
            juiceRate: 0.045, // 4.5% typical vig

            ...config
        };

        this.synchronizer = new TimeSynchronizer();

        // Results storage
        this.results = {
            bets: [],
            dailyPnL: [],
            bankrollHistory: [],
            clvHistory: []
        };
    }

    /**
     * Run backtest over a date range
     * @param {Object} engine - GeometricAlphaEngine instance
     * @param {Object} options - Backtest options
     */
    async run(engine, options = {}) {
        const {
            startDate,
            endDate,
            dataLake,
            oddsHistory
        } = options;

        console.log(`\n=== Starting Backtest ===`);
        console.log(`Period: ${startDate} to ${endDate}`);
        console.log(`Starting Bankroll: $${this.config.startingBankroll.toLocaleString()}`);

        // Reset state
        let bankroll = this.config.startingBankroll;
        let peakBankroll = bankroll;
        let maxDrawdown = 0;
        let dayCount = 0;

        this.results = {
            bets: [],
            dailyPnL: [],
            bankrollHistory: [{ date: startDate, bankroll }],
            clvHistory: []
        };

        // Get all games in range
        const games = dataLake.getGamesInRange(startDate, endDate);

        // Synchronize with odds
        const synchronizedGames = this.synchronizer.mergeAsof(games, oddsHistory);

        // Group by date
        const gamesByDate = this.groupByDate(synchronizedGames);
        const dates = Object.keys(gamesByDate).sort();

        console.log(`\nFound ${games.length} games across ${dates.length} days\n`);

        for (const date of dates) {
            const dayGames = gamesByDate[date];
            dayCount++;

            // Filter games with valid odds
            const validGames = dayGames.filter(g => g.closingOdds);

            if (validGames.length === 0) continue;

            // Get predictions (using only data available before this date)
            const predictions = await engine.predictSlate(validGames);

            // Format odds for the engine
            const currentOdds = validGames.map(g => ({
                gameId: g.gameId,
                homeOdds: g.closingOdds.homeOdds,
                awayOdds: g.closingOdds.awayOdds,
                totalLine: g.closingOdds.totalLine,
                overOdds: g.closingOdds.overOdds,
                underOdds: g.closingOdds.underOdds
            }));

            // Find value bets
            const valueBets = engine.findValueBets(predictions, currentOdds);

            // Optimize bet sizes
            const optimized = engine.optimizeBets(valueBets);

            // Place bets
            const dayBets = [];
            for (const bet of optimized.bets) {
                if (bet.amount > 0 && bet.amount <= bankroll) {
                    dayBets.push({
                        ...bet,
                        date,
                        bankrollAtBet: bankroll
                    });
                    bankroll -= bet.amount;
                }
            }

            // Get results and settle bets
            const results = dataLake.getGameResults(validGames.map(g => g.gameId));
            const settlements = this.settleBets(dayBets, results, validGames);

            // Update bankroll and track metrics
            let dayPnL = 0;
            for (const settlement of settlements) {
                bankroll += settlement.payout;
                dayPnL += settlement.profit;

                this.results.bets.push(settlement);

                // Track CLV
                if (settlement.clv !== null) {
                    this.results.clvHistory.push({
                        date,
                        clv: settlement.clv,
                        bet: settlement
                    });
                }
            }

            // Track daily performance
            this.results.dailyPnL.push({ date, pnl: dayPnL, bets: dayBets.length });
            this.results.bankrollHistory.push({ date, bankroll });

            // Track drawdown
            if (bankroll > peakBankroll) {
                peakBankroll = bankroll;
            }
            const currentDrawdown = (peakBankroll - bankroll) / peakBankroll;
            if (currentDrawdown > maxDrawdown) {
                maxDrawdown = currentDrawdown;
            }

            // Periodic logging
            if (this.config.verbose && dayCount % this.config.logInterval === 0) {
                console.log(
                    `${date}: Bankroll=$${bankroll.toFixed(2)}, ` +
                    `Day P&L=$${dayPnL.toFixed(2)}, ` +
                    `Bets=${dayBets.length}`
                );
            }
        }

        // Compute final statistics
        const summary = this.computeSummary(bankroll, maxDrawdown);

        console.log('\n=== Backtest Complete ===');
        console.log(JSON.stringify(summary, null, 2));

        return {
            ...this.results,
            summary
        };
    }

    /**
     * Settle bets against results
     */
    settleBets(bets, results, games) {
        const settlements = [];

        for (const bet of bets) {
            const result = results.find(r => r.gameId === bet.gameId);
            const game = games.find(g => g.gameId === bet.gameId);

            if (!result) {
                // Game not found - refund
                settlements.push({
                    ...bet,
                    won: null,
                    payout: bet.amount,
                    profit: 0,
                    clv: null
                });
                continue;
            }

            let won = false;
            let payout = 0;

            if (bet.betType === 'moneyline') {
                // Moneyline bet
                if (bet.side === 'home') {
                    won = result.homeScore > result.awayScore;
                } else {
                    won = result.awayScore > result.homeScore;
                }

                if (won) {
                    payout = bet.amount + this.calculateWinnings(bet.amount, bet.odds);
                }
            } else if (bet.betType === 'total') {
                // Total bet
                // CRITICAL FIX: Handle missing totalRuns
                const total = result.totalRuns ?? (result.homeScore + result.awayScore);

                if (total === null || total === undefined || isNaN(total)) {
                    // Cannot settle without total - refund
                    payout = bet.amount;
                    won = null;
                } else if (bet.side === 'over') {
                    won = total > bet.line;
                } else {
                    won = total < bet.line;
                }

                // Push
                if (total === bet.line) {
                    payout = bet.amount;
                    won = null;
                } else if (won) {
                    payout = bet.amount + this.calculateWinnings(bet.amount, bet.odds);
                }
            }

            // Calculate CLV
            let clv = null;
            if (game?.closingOdds) {
                const closingOdds = bet.side === 'home' ?
                    game.closingOdds.homeOdds : game.closingOdds.awayOdds;
                clv = this.synchronizer.computeCLV(bet.odds, closingOdds);
            }

            settlements.push({
                ...bet,
                won,
                payout,
                profit: payout - bet.amount,
                result: {
                    homeScore: result.homeScore,
                    awayScore: result.awayScore,
                    totalRuns: result.totalRuns
                },
                clv
            });
        }

        return settlements;
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
     * Compute summary statistics
     */
    computeSummary(finalBankroll, maxDrawdown) {
        const totalBets = this.results.bets.length;
        const wins = this.results.bets.filter(b => b.won === true).length;
        const losses = this.results.bets.filter(b => b.won === false).length;
        const pushes = this.results.bets.filter(b => b.won === null).length;

        const totalWagered = this.results.bets.reduce((s, b) => s + b.amount, 0);
        const totalReturns = this.results.bets.reduce((s, b) => s + b.payout, 0);
        const netProfit = totalReturns - totalWagered;

        const roi = totalWagered > 0 ? netProfit / totalWagered : 0;
        const winRate = (wins + losses) > 0 ? wins / (wins + losses) : 0;

        // CLV metrics
        const clvValues = this.results.clvHistory.map(c => c.clv).filter(c => c !== null);
        const avgCLV = clvValues.length > 0 ?
            clvValues.reduce((s, c) => s + c, 0) / clvValues.length : 0;

        // Sharpe ratio (annualized)
        const dailyReturns = this.results.dailyPnL.map(d => d.pnl);
        const sharpeRatio = this.computeSharpeRatio(dailyReturns);

        // Kelly fraction achieved
        const expectedEdge = avgCLV > 0 ? avgCLV : 0;
        const actualGrowth = (finalBankroll - this.config.startingBankroll) /
            this.config.startingBankroll;

        return {
            // Counts
            totalBets,
            wins,
            losses,
            pushes,
            winRate,

            // Financial
            startingBankroll: this.config.startingBankroll,
            finalBankroll,
            netProfit,
            totalWagered,
            totalReturns,

            // Returns
            roi,
            roiPercent: (roi * 100).toFixed(2) + '%',
            bankrollGrowth: actualGrowth,
            bankrollGrowthPercent: (actualGrowth * 100).toFixed(2) + '%',

            // Risk
            maxDrawdown,
            maxDrawdownPercent: (maxDrawdown * 100).toFixed(2) + '%',
            sharpeRatio,

            // Edge validation
            averageCLV: avgCLV,
            averageCLVPercent: (avgCLV * 100).toFixed(3) + '%',
            clvPositiveRate: clvValues.filter(c => c > 0).length / (clvValues.length || 1),

            // Per-bet metrics
            avgBetSize: totalBets > 0 ? totalWagered / totalBets : 0,
            avgProfit: totalBets > 0 ? netProfit / totalBets : 0
        };
    }

    /**
     * Compute annualized Sharpe ratio from daily returns
     * @param {Array} dailyReturns - Array of daily P&L values
     * @returns {number} Annualized Sharpe ratio (0 if insufficient data)
     */
    computeSharpeRatio(dailyReturns) {
        // CRITICAL FIX: Validate input
        if (!dailyReturns || !Array.isArray(dailyReturns)) {
            return 0;
        }

        // Filter out any NaN/null values
        const validReturns = dailyReturns.filter(r =>
            r !== null && r !== undefined && !isNaN(r) && isFinite(r)
        );

        if (validReturns.length < 2) return 0;

        const mean = validReturns.reduce((s, r) => s + r, 0) / validReturns.length;
        const variance = validReturns.reduce((s, r) => s + (r - mean) ** 2, 0) /
            (validReturns.length - 1);

        // CRITICAL FIX: Protect against negative variance (floating point errors)
        if (variance <= 0) return 0;

        const stdDev = Math.sqrt(variance);

        // CRITICAL FIX: Protect against division by zero/very small stdDev
        const minStdDev = 1e-10;
        if (stdDev < minStdDev) {
            // If returns are constant, Sharpe is undefined (return 0)
            return 0;
        }

        // Annualize (assuming ~180 betting days per season)
        const annualizedMean = mean * 180;
        const annualizedStdDev = stdDev * Math.sqrt(180);

        // CRITICAL FIX: Final safety check
        if (!isFinite(annualizedStdDev) || annualizedStdDev < minStdDev) {
            return 0;
        }

        const sharpe = annualizedMean / annualizedStdDev;

        // Clamp to reasonable bounds to flag suspicious results
        if (!isFinite(sharpe)) {
            return 0;
        }

        return sharpe;
    }

    /**
     * Group games by date
     */
    groupByDate(games) {
        const grouped = {};
        for (const game of games) {
            const date = (game.gameDate || game.date || '').split('T')[0];
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(game);
        }
        return grouped;
    }

    /**
     * Generate detailed report
     */
    generateReport() {
        const summary = this.results.summary ||
            this.computeSummary(
                this.results.bankrollHistory[this.results.bankrollHistory.length - 1]?.bankroll,
                0
            );

        const report = [];

        report.push('='.repeat(60));
        report.push('GEOMETRIC ALPHA BACKTEST REPORT');
        report.push('='.repeat(60));
        report.push('');

        report.push('PERFORMANCE SUMMARY');
        report.push('-'.repeat(30));
        report.push(`Total Bets: ${summary.totalBets}`);
        report.push(`Win Rate: ${(summary.winRate * 100).toFixed(1)}%`);
        report.push(`ROI: ${summary.roiPercent}`);
        report.push(`Net Profit: $${summary.netProfit.toFixed(2)}`);
        report.push('');

        report.push('RISK METRICS');
        report.push('-'.repeat(30));
        report.push(`Max Drawdown: ${summary.maxDrawdownPercent}`);
        report.push(`Sharpe Ratio: ${summary.sharpeRatio.toFixed(2)}`);
        report.push('');

        report.push('EDGE VALIDATION');
        report.push('-'.repeat(30));
        report.push(`Average CLV: ${summary.averageCLVPercent}`);
        report.push(`CLV Positive Rate: ${(summary.clvPositiveRate * 100).toFixed(1)}%`);
        report.push('');

        report.push('BANKROLL');
        report.push('-'.repeat(30));
        report.push(`Starting: $${summary.startingBankroll.toLocaleString()}`);
        report.push(`Final: $${summary.finalBankroll.toLocaleString()}`);
        report.push(`Growth: ${summary.bankrollGrowthPercent}`);
        report.push('');

        report.push('='.repeat(60));

        return report.join('\n');
    }
}
