/**
 * GeometricAlphaEngine - Main Orchestrator
 *
 * The unified engine that coordinates all components of the Geometric Alpha
 * sports analytics system. Manages data flow, feature computation, prediction,
 * and bet optimization.
 *
 * @class GeometricAlphaEngine
 */

import { DataLakeManager } from './data/DataLakeManager.js';
import { GeometricFeatureEngine } from './features/GeometricFeatureEngine.js';
import { GeometricPredictor } from './prediction/GeometricPredictor.js';
import { PortfolioOptimizer } from './finance/PortfolioOptimizer.js';
import { RiskManager } from './finance/RiskManager.js';
import { PaperTrader } from './finance/PaperTrader.js';

export class GeometricAlphaEngine {
    /**
     * @param {Object} config - Engine configuration
     * @param {string} config.dataPath - Path to cached Statcast data
     * @param {number} config.bankroll - Starting bankroll
     * @param {number} config.maxExposure - Maximum portfolio exposure (0-1)
     * @param {boolean} config.paperTrading - Enable paper trading mode
     * @param {string} config.oddsApiKey - API key for The-Odds-API
     */
    constructor(config = {}) {
        this.config = {
            dataPath: config.dataPath || './data/statcast/',
            bankroll: config.bankroll || 10000,
            maxExposure: config.maxExposure || 0.25,
            paperTrading: config.paperTrading !== false,
            oddsApiKey: config.oddsApiKey || null,
            kellyFraction: config.kellyFraction || 0.25, // Quarter Kelly for safety
            minEdge: config.minEdge || 0.02, // 2% minimum edge to bet
            ...config
        };

        // Initialize components
        this.dataLake = new DataLakeManager(this.config.dataPath);
        this.featureEngine = new GeometricFeatureEngine();
        this.predictor = new GeometricPredictor();
        this.optimizer = new PortfolioOptimizer({
            maxExposure: this.config.maxExposure,
            kellyFraction: this.config.kellyFraction
        });
        this.riskManager = new RiskManager(this.config);
        this.paperTrader = new PaperTrader(this.config.bankroll);

        // State
        this.loadedSeasons = new Set();
        this.modelTrained = false;
        this.currentBankroll = this.config.bankroll;

        // Performance tracking
        this.metrics = {
            totalBets: 0,
            wins: 0,
            losses: 0,
            totalWagered: 0,
            totalReturns: 0,
            clvSum: 0, // Closing Line Value
            peakBankroll: this.config.bankroll,
            maxDrawdown: 0
        };
    }

    /**
     * Load a season of Statcast data
     * @param {number} year - Season year
     * @param {Object} options - Loading options
     */
    async loadSeason(year, options = {}) {
        if (this.loadedSeasons.has(year)) {
            console.log(`Season ${year} already loaded`);
            return;
        }

        console.log(`Loading ${year} season data...`);
        await this.dataLake.loadSeason(year, options);
        this.loadedSeasons.add(year);

        // Precompute pitcher arsenals
        await this.featureEngine.precomputeArsenals(
            this.dataLake.getPitchers(year)
        );

        console.log(`Season ${year} loaded: ${this.dataLake.getPitchCount(year)} pitches`);
    }

    /**
     * Train predictive models on historical data
     * @param {Object} options - Training options
     */
    async trainModels(options = {}) {
        const trainYears = options.trainYears || [2021, 2022, 2023];
        const validationYear = options.validationYear || 2024;

        console.log(`Training on seasons: ${trainYears.join(', ')}`);
        console.log(`Validation year: ${validationYear}`);

        // Ensure data is loaded
        for (const year of [...trainYears, validationYear]) {
            if (!this.loadedSeasons.has(year)) {
                await this.loadSeason(year);
            }
        }

        // Compute geometric features for training data
        const trainingFeatures = await this.featureEngine.computeTrainingSet(
            this.dataLake,
            trainYears
        );

        // Train the predictor
        await this.predictor.train(trainingFeatures, options);

        // Validate
        const validationFeatures = await this.featureEngine.computeTrainingSet(
            this.dataLake,
            [validationYear]
        );

        const validationMetrics = await this.predictor.validate(validationFeatures);
        console.log('Validation metrics:', validationMetrics);

        this.modelTrained = true;
        return validationMetrics;
    }

    /**
     * Compute geometric features for a matchup
     * @param {Object} matchup - Game matchup details
     * @returns {Object} Computed geometric features
     */
    computeFeatures(matchup) {
        // CRITICAL FIX: Validate matchup object
        if (!matchup || typeof matchup !== 'object') {
            console.warn('computeFeatures called with invalid matchup');
            return this._getDefaultFeatures();
        }

        const { pitcherId, batterId, umpireId, venueId, lineupIds } = matchup;

        // CRITICAL FIX: Null checks with safe defaults
        let arsenal = null;
        let tunnelScores = [];
        let umpireHull = null;
        let defensiveVoronoi = null;
        let sprayChart = null;
        let environmental = null;

        try {
            // Get pitcher arsenal polytope (with null check)
            if (pitcherId) {
                arsenal = this.featureEngine.getArsenalPolytope(pitcherId);
                const pitcherData = this.dataLake.getPitcherData(pitcherId);
                if (pitcherData && pitcherData.length > 0) {
                    tunnelScores = this.featureEngine.computeTunnelScores(pitcherData) || [];
                }
            }

            // Get umpire zone convex hull (with null check)
            if (umpireId) {
                const umpireData = this.dataLake.getUmpireData(umpireId);
                if (umpireData && umpireData.length > 0) {
                    umpireHull = this.featureEngine.computeUmpireHull(umpireData);
                }
            }

            // Get defensive Voronoi if lineup provided
            if (lineupIds && Array.isArray(lineupIds) && lineupIds.length > 0) {
                const fielderData = this.dataLake.getFielderData(lineupIds);
                if (fielderData) {
                    defensiveVoronoi = this.featureEngine.computeDefensiveVoronoi(
                        lineupIds,
                        fielderData
                    );
                }
            }

            // Get batter spray chart (with null check)
            if (batterId) {
                const batterData = this.dataLake.getBatterData(batterId);
                if (batterData && batterData.length > 0) {
                    sprayChart = this.featureEngine.computeSprayChart(batterData);
                }
            }

            // Get environmental adjustments (always available)
            environmental = this.featureEngine.getEnvironmentalFactors(
                venueId,
                matchup.temperature,
                matchup.windSpeed,
                matchup.windDirection
            );
        } catch (error) {
            console.error('Error computing features for matchup:', error);
        }

        // Provide safe defaults for null values
        const safeArsenal = arsenal || { sampleSize: 0, volume: 0, spread: 0 };
        const safeUmpireHull = umpireHull || { expansionFactor: 1.0, centroid: { x: 0, z: 2.5 } };
        const safeEnvironmental = environmental || { isExtreme: false, parkFactor: 1.0 };

        return {
            arsenal: safeArsenal,
            tunnelScores,
            umpireHull: safeUmpireHull,
            defensiveVoronoi,
            sprayChart,
            environmental: safeEnvironmental,
            // Derived metrics (with null safety)
            tunnelEfficiency: this.computeTunnelEfficiency(tunnelScores),
            zoneExpansion: safeUmpireHull.expansionFactor || 1.0,
            zoneCentroid: safeUmpireHull.centroid || { x: 0, z: 2.5 },
            defensiveSeamExposure: (defensiveVoronoi && sprayChart) ?
                this.computeSeamExposure(sprayChart, defensiveVoronoi) : null
        };
    }

    /**
     * Get default features when matchup data is unavailable
     * @returns {Object} Default feature object
     */
    _getDefaultFeatures() {
        return {
            arsenal: { sampleSize: 0, volume: 0, spread: 0 },
            tunnelScores: [],
            umpireHull: { expansionFactor: 1.0, centroid: { x: 0, z: 2.5 } },
            defensiveVoronoi: null,
            sprayChart: null,
            environmental: { isExtreme: false, parkFactor: 1.0 },
            tunnelEfficiency: 0,
            zoneExpansion: 1.0,
            zoneCentroid: { x: 0, z: 2.5 },
            defensiveSeamExposure: null
        };
    }

    /**
     * Generate predictions for a slate of games
     * @param {Array} slate - Array of game objects
     * @returns {Array} Predictions with probabilities
     */
    async predictSlate(slate) {
        if (!this.modelTrained) {
            throw new Error('Models must be trained before prediction. Call trainModels() first.');
        }

        const predictions = [];

        for (const game of slate) {
            const homeFeatures = this.computeFeatures({
                pitcherId: game.homePitcherId,
                batterId: null, // Team aggregate
                umpireId: game.umpireId,
                venueId: game.venueId,
                lineupIds: game.homeLineup
            });

            const awayFeatures = this.computeFeatures({
                pitcherId: game.awayPitcherId,
                batterId: null,
                umpireId: game.umpireId,
                venueId: game.venueId,
                lineupIds: game.awayLineup
            });

            // Predict delta run expectancy
            const deltaRE = await this.predictor.predictDeltaRE(
                homeFeatures,
                awayFeatures,
                game.context
            );

            // Convert to probabilities
            const homeWinProb = this.deltaREToWinProbability(deltaRE.home - deltaRE.away);
            const totalRuns = deltaRE.home + deltaRE.away;

            predictions.push({
                gameId: game.gameId,
                homeTeam: game.homeTeam,
                awayTeam: game.awayTeam,
                homeWinProb,
                awayWinProb: 1 - homeWinProb,
                projectedTotal: totalRuns,
                projectedSpread: deltaRE.home - deltaRE.away,
                confidence: this.computeConfidence(homeFeatures, awayFeatures),
                geometricFeatures: { home: homeFeatures, away: awayFeatures }
            });
        }

        return predictions;
    }

    /**
     * Find value bets by comparing predictions to market odds
     * @param {Array} predictions - Model predictions
     * @param {Array} marketOdds - Current market odds
     * @returns {Array} Value bets with edge calculations
     */
    findValueBets(predictions, marketOdds) {
        const valueBets = [];

        for (const pred of predictions) {
            const odds = marketOdds.find(o => o.gameId === pred.gameId);
            if (!odds) continue;

            // Check moneyline value
            const homeImpliedProb = this.oddsToProb(odds.homeOdds);
            const awayImpliedProb = this.oddsToProb(odds.awayOdds);

            const homeEdge = pred.homeWinProb - homeImpliedProb;
            const awayEdge = pred.awayWinProb - awayImpliedProb;

            if (homeEdge > this.config.minEdge) {
                valueBets.push({
                    gameId: pred.gameId,
                    betType: 'moneyline',
                    side: 'home',
                    team: pred.homeTeam,
                    modelProb: pred.homeWinProb,
                    impliedProb: homeImpliedProb,
                    edge: homeEdge,
                    odds: odds.homeOdds,
                    confidence: pred.confidence
                });
            }

            if (awayEdge > this.config.minEdge) {
                valueBets.push({
                    gameId: pred.gameId,
                    betType: 'moneyline',
                    side: 'away',
                    team: pred.awayTeam,
                    modelProb: pred.awayWinProb,
                    impliedProb: awayImpliedProb,
                    edge: awayEdge,
                    odds: odds.awayOdds,
                    confidence: pred.confidence
                });
            }

            // Check totals value
            if (odds.totalLine) {
                const overProb = this.predictor.predictOverProb(
                    pred.projectedTotal,
                    odds.totalLine
                );
                const overImplied = this.oddsToProb(odds.overOdds);
                const underImplied = this.oddsToProb(odds.underOdds);

                const overEdge = overProb - overImplied;
                const underEdge = (1 - overProb) - underImplied;

                if (overEdge > this.config.minEdge) {
                    valueBets.push({
                        gameId: pred.gameId,
                        betType: 'total',
                        side: 'over',
                        line: odds.totalLine,
                        modelProb: overProb,
                        impliedProb: overImplied,
                        edge: overEdge,
                        odds: odds.overOdds,
                        confidence: pred.confidence
                    });
                }

                if (underEdge > this.config.minEdge) {
                    valueBets.push({
                        gameId: pred.gameId,
                        betType: 'total',
                        side: 'under',
                        line: odds.totalLine,
                        modelProb: 1 - overProb,
                        impliedProb: underImplied,
                        edge: underEdge,
                        odds: odds.underOdds,
                        confidence: pred.confidence
                    });
                }
            }
        }

        // Sort by edge * confidence
        return valueBets.sort((a, b) =>
            (b.edge * b.confidence) - (a.edge * a.confidence)
        );
    }

    /**
     * Optimize bet sizes using simultaneous Kelly criterion
     * @param {Array} valueBets - Value bets to optimize
     * @returns {Object} Optimized bet allocations
     */
    optimizeBets(valueBets) {
        if (valueBets.length === 0) {
            return { bets: [], totalExposure: 0 };
        }

        // Filter through risk manager
        const approvedBets = this.riskManager.filterBets(valueBets, {
            currentBankroll: this.currentBankroll,
            existingExposure: this.paperTrader.getOpenExposure()
        });

        // Optimize with simultaneous Kelly
        const optimized = this.optimizer.solve(approvedBets, this.currentBankroll);

        return {
            bets: optimized.allocations,
            totalExposure: optimized.totalExposure,
            expectedGrowth: optimized.expectedGrowth,
            riskMetrics: this.riskManager.computeRiskMetrics(optimized.allocations)
        };
    }

    /**
     * Execute bets (paper trading or live)
     * @param {Array} optimizedBets - Bet allocations from optimizer
     */
    async executeBets(optimizedBets) {
        for (const bet of optimizedBets.bets) {
            if (bet.amount > 0) {
                await this.paperTrader.placeBet({
                    ...bet,
                    timestamp: Date.now(),
                    modelVersion: this.predictor.version
                });

                this.metrics.totalBets++;
                this.metrics.totalWagered += bet.amount;
            }
        }

        console.log(`Placed ${optimizedBets.bets.filter(b => b.amount > 0).length} bets`);
        console.log(`Total exposure: $${optimizedBets.totalExposure.toFixed(2)}`);
    }

    /**
     * Settle completed games and update bankroll
     * @param {Array} results - Game results
     */
    async settleBets(results) {
        const settlements = await this.paperTrader.settleBets(results);

        for (const settlement of settlements) {
            if (settlement.won) {
                this.metrics.wins++;
                this.metrics.totalReturns += settlement.payout;
            } else {
                this.metrics.losses++;
            }

            // Track CLV
            this.metrics.clvSum += settlement.clv || 0;
        }

        // Update bankroll
        this.currentBankroll = this.paperTrader.getBankroll();

        // Track drawdown
        if (this.currentBankroll > this.metrics.peakBankroll) {
            this.metrics.peakBankroll = this.currentBankroll;
        }
        const drawdown = (this.metrics.peakBankroll - this.currentBankroll) /
            this.metrics.peakBankroll;
        if (drawdown > this.metrics.maxDrawdown) {
            this.metrics.maxDrawdown = drawdown;
        }

        return settlements;
    }

    /**
     * Run full backtest over historical period
     * @param {Object} options - Backtest options
     */
    async runBacktest(options = {}) {
        const { startDate, endDate, season } = options;

        console.log(`Running backtest from ${startDate} to ${endDate}`);

        // Get all games in range
        const games = this.dataLake.getGamesInRange(startDate, endDate);
        const historicalOdds = await this.dataLake.getHistoricalOdds(startDate, endDate);

        const backtestResults = {
            daily: [],
            cumulative: [],
            bets: []
        };

        // Group by date
        const gamesByDate = this.groupByDate(games);

        for (const [date, dayGames] of Object.entries(gamesByDate)) {
            // Get predictions using only data available before this date
            const predictions = await this.predictSlate(dayGames);

            // Get odds that were available before game time (merge_asof logic)
            const availableOdds = this.synchronizeOdds(dayGames, historicalOdds, date);

            // Find value
            const valueBets = this.findValueBets(predictions, availableOdds);

            // Optimize
            const optimized = this.optimizeBets(valueBets);

            // Execute (paper)
            await this.executeBets(optimized);

            // Settle with actual results
            const results = this.dataLake.getGameResults(dayGames.map(g => g.gameId));
            await this.settleBets(results);

            backtestResults.daily.push({
                date,
                games: dayGames.length,
                betsPlaced: optimized.bets.filter(b => b.amount > 0).length,
                bankroll: this.currentBankroll
            });

            backtestResults.bets.push(...optimized.bets);
        }

        // Compute final statistics
        backtestResults.summary = this.computeBacktestSummary();

        return backtestResults;
    }

    // === Helper Methods ===

    computeTunnelEfficiency(tunnelScores) {
        if (!tunnelScores || tunnelScores.length === 0) return 0;

        // Weighted average of tunnel scores by pitch pair frequency
        const totalWeight = tunnelScores.reduce((sum, ts) => sum + ts.frequency, 0);
        const weightedSum = tunnelScores.reduce(
            (sum, ts) => sum + ts.score * ts.frequency, 0
        );

        return weightedSum / totalWeight;
    }

    computeSeamExposure(sprayChart, voronoi) {
        // CRITICAL FIX: Validate inputs
        if (!sprayChart || !sprayChart.points || sprayChart.points.length === 0) {
            return 0;
        }
        if (!voronoi || typeof voronoi.distanceToNearestEdge !== 'function') {
            return 0;
        }

        // Compute overlap between spray density and Voronoi edges
        let seamExposure = 0;

        for (const point of sprayChart.points) {
            if (!point) continue;

            const distToEdge = voronoi.distanceToNearestEdge(point);

            // CRITICAL FIX: Validate distToEdge result
            if (distToEdge === null || distToEdge === undefined || isNaN(distToEdge)) {
                continue;
            }

            if (distToEdge < 15) { // Within 15 feet of a seam
                const density = (sprayChart.density && sprayChart.density[point.idx]) || 0;
                seamExposure += density * (1 - distToEdge / 15);
            }
        }

        // CRITICAL FIX: Prevent division by zero
        return sprayChart.points.length > 0 ? seamExposure / sprayChart.points.length : 0;
    }

    deltaREToWinProbability(deltaRE) {
        // Logistic transformation of run differential to win probability
        // Based on historical Pythagorean expectation with exponent ~1.83
        const k = 0.35; // Steepness parameter
        return 1 / (1 + Math.exp(-k * deltaRE));
    }

    oddsToProb(americanOdds) {
        if (americanOdds > 0) {
            return 100 / (americanOdds + 100);
        } else {
            return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
        }
    }

    computeConfidence(homeFeatures, awayFeatures) {
        // Confidence based on data quality and sample sizes
        let confidence = 1.0;

        // Reduce confidence if arsenal data is sparse
        if (homeFeatures.arsenal.sampleSize < 100) {
            confidence *= 0.8;
        }
        if (awayFeatures.arsenal.sampleSize < 100) {
            confidence *= 0.8;
        }

        // Reduce confidence for unusual environmental conditions
        if (homeFeatures.environmental.isExtreme) {
            confidence *= 0.9;
        }

        return confidence;
    }

    groupByDate(games) {
        const grouped = {};
        for (const game of games) {
            const date = game.gameDate.split('T')[0];
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(game);
        }
        return grouped;
    }

    synchronizeOdds(games, historicalOdds, targetDate) {
        // Implement merge_asof logic
        const synchronized = [];

        for (const game of games) {
            const gameOdds = historicalOdds.filter(o => o.gameId === game.gameId);

            // Find most recent odds before game time
            const available = gameOdds
                .filter(o => new Date(o.timestamp) < new Date(game.gameTime))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

            if (available) {
                synchronized.push(available);
            }
        }

        return synchronized;
    }

    computeBacktestSummary() {
        const roi = (this.metrics.totalReturns - this.metrics.totalWagered) /
            this.metrics.totalWagered;
        const winRate = this.metrics.wins / this.metrics.totalBets;
        const avgClv = this.metrics.clvSum / this.metrics.totalBets;

        return {
            totalBets: this.metrics.totalBets,
            wins: this.metrics.wins,
            losses: this.metrics.losses,
            winRate,
            totalWagered: this.metrics.totalWagered,
            totalReturns: this.metrics.totalReturns,
            netProfit: this.metrics.totalReturns - this.metrics.totalWagered,
            roi,
            averageCLV: avgClv,
            maxDrawdown: this.metrics.maxDrawdown,
            finalBankroll: this.currentBankroll,
            bankrollGrowth: (this.currentBankroll - this.config.bankroll) /
                this.config.bankroll
        };
    }

    /**
     * Get current engine state for debugging/logging
     */
    getState() {
        return {
            config: this.config,
            loadedSeasons: Array.from(this.loadedSeasons),
            modelTrained: this.modelTrained,
            currentBankroll: this.currentBankroll,
            metrics: this.metrics
        };
    }
}
