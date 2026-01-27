/**
 * PortfolioOptimizer - Simultaneous Kelly Criterion Solver
 *
 * PRODUCTION UPGRADE: Covariance-Aware Risk Management
 * =====================================================
 * The original implementation used a "diagonal approximation" that treated
 * all bets as independent. This is dangerous because:
 * - Yankees ML and Yankees Team Total Over are CORRELATED
 * - Both are positive when Yankees score many runs
 * - Treating them as independent leads to 10%+ overexposure on one game script
 *
 * This upgrade explicitly models inter-bet relationships using a Covariance
 * Matrix (Sigma) in the objective function:
 *
 * maximize: E[growth] - λ * f' * Σ * f
 *
 * Where:
 * - E[growth] = expected log wealth growth
 * - λ = risk aversion parameter
 * - Σ = covariance matrix of bet returns
 * - f = vector of bet fractions
 *
 * The covariance term penalizes concentrated exposure on correlated outcomes,
 * forcing the solver to recognize linked risks and prevent bankruptcy.
 *
 * @class PortfolioOptimizer
 */

import { KellyCriterion } from './KellyCriterion.js';

export class PortfolioOptimizer {
    constructor(config = {}) {
        this.config = {
            // Maximum total exposure
            maxExposure: config.maxExposure || 0.25,

            // Maximum single bet
            maxSingleBet: config.maxSingleBet || 0.05,

            // Kelly fraction
            kellyFraction: config.kellyFraction || 0.25,

            // Optimization parameters
            maxIterations: config.maxIterations || 100,
            convergenceThreshold: config.convergenceThreshold || 1e-6,
            stepSize: config.stepSize || 0.001,

            // UPGRADED: Risk aversion parameter for covariance penalty
            riskAversion: config.riskAversion || 0.5,  // λ in the objective

            // Legacy correlation penalty (kept for compatibility)
            correlationPenalty: config.correlationPenalty || 0.1,

            // Use covariance matrix (production) vs simple penalty (legacy)
            useCovarianceMatrix: config.useCovarianceMatrix !== false,

            // Same-game correlation estimate
            sameGameCorrelation: config.sameGameCorrelation || 0.7,

            // Same-team different-game correlation
            sameTeamCorrelation: config.sameTeamCorrelation || 0.2,

            // Max per-game exposure (prevents single game blowup)
            maxGameExposure: config.maxGameExposure || 0.08,

            ...config
        };

        this.kelly = new KellyCriterion({
            fraction: this.config.kellyFraction,
            maxSingleBet: this.config.maxSingleBet
        });
    }

    /**
     * Solve for optimal bet allocations
     * UPGRADED: Uses covariance-aware optimization by default
     *
     * @param {Array} opportunities - Array of bet opportunities
     * @param {number} bankroll - Current bankroll
     * @returns {Object} Optimal allocations and metrics
     */
    solve(opportunities, bankroll) {
        // Use covariance-aware method by default (production)
        if (this.config.useCovarianceMatrix) {
            return this.solveWithCovariance(opportunities, bankroll);
        }

        // Legacy diagonal approximation
        return this.solveLegacy(opportunities, bankroll);
    }

    /**
     * Legacy solver (diagonal approximation - treats bets as independent)
     * WARNING: This underestimates risk for correlated bets!
     */
    solveLegacy(opportunities, bankroll) {
        if (opportunities.length === 0) {
            return {
                allocations: [],
                totalExposure: 0,
                expectedGrowth: 0
            };
        }

        // Initialize with single-bet Kelly stakes
        const n = opportunities.length;
        const fractions = new Array(n).fill(0);

        // Calculate individual Kelly stakes
        for (let i = 0; i < n; i++) {
            const opp = opportunities[i];
            fractions[i] = this.kelly.calculateSingleKelly(opp.modelProb, opp.odds);
        }

        // Scale down if total exceeds max exposure
        const totalKelly = fractions.reduce((s, f) => s + f, 0);
        if (totalKelly > this.config.maxExposure) {
            const scale = this.config.maxExposure / totalKelly;
            for (let i = 0; i < n; i++) {
                fractions[i] *= scale;
            }
        }

        // Refine with coordinate descent
        const refined = this.coordinateDescent(opportunities, fractions);

        // Convert to dollar amounts
        const allocations = opportunities.map((opp, i) => ({
            ...opp,
            fraction: refined[i],
            amount: refined[i] * bankroll,
            expectedValue: this.kelly.calculateEdge(opp.modelProb, opp.odds) * refined[i] * bankroll
        }));

        // Calculate portfolio metrics
        const totalExposure = refined.reduce((s, f) => s + f, 0);
        const expectedGrowth = this.calculateExpectedGrowth(opportunities, refined);

        return {
            allocations,
            totalExposure,
            expectedGrowth,
            totalEV: allocations.reduce((s, a) => s + a.expectedValue, 0),
            numBets: allocations.filter(a => a.amount > 0).length,
            method: 'legacy_diagonal'
        };
    }

    /**
     * Coordinate descent optimization
     */
    coordinateDescent(opportunities, initialFractions) {
        const n = opportunities.length;
        let fractions = [...initialFractions];
        let prevGrowth = this.calculateExpectedGrowth(opportunities, fractions);

        for (let iter = 0; iter < this.config.maxIterations; iter++) {
            // Optimize each coordinate
            for (let i = 0; i < n; i++) {
                fractions[i] = this.optimizeCoordinate(opportunities, fractions, i);
            }

            // Check convergence
            const growth = this.calculateExpectedGrowth(opportunities, fractions);
            if (Math.abs(growth - prevGrowth) < this.config.convergenceThreshold) {
                break;
            }
            prevGrowth = growth;
        }

        return fractions;
    }

    /**
     * Optimize a single coordinate (bet) while holding others fixed
     */
    optimizeCoordinate(opportunities, fractions, idx) {
        const opp = opportunities[idx];
        const others = fractions.filter((_, i) => i !== idx);
        const othersSum = others.reduce((s, f) => s + f, 0);

        // Maximum we can bet on this opportunity
        const maxFraction = Math.min(
            this.config.maxSingleBet,
            this.config.maxExposure - othersSum
        );

        if (maxFraction <= 0) return 0;

        // Grid search for optimal fraction
        let bestFraction = 0;
        let bestGrowth = -Infinity;

        for (let f = 0; f <= maxFraction; f += this.config.stepSize) {
            const testFractions = [...fractions];
            testFractions[idx] = f;

            const growth = this.calculateExpectedGrowth(opportunities, testFractions);
            if (growth > bestGrowth) {
                bestGrowth = growth;
                bestFraction = f;
            }
        }

        return bestFraction;
    }

    /**
     * Calculate expected log growth for a portfolio
     * Approximation for independent events
     */
    calculateExpectedGrowth(opportunities, fractions) {
        let growth = 0;

        for (let i = 0; i < opportunities.length; i++) {
            const opp = opportunities[i];
            const f = fractions[i];

            if (f <= 0) continue;

            const decimal = this.kelly.americanToDecimal(opp.odds);
            const p = opp.modelProb;
            const q = 1 - p;

            // E[log] for this bet
            growth += p * Math.log(1 + f * (decimal - 1));
            growth += q * Math.log(1 - f);
        }

        // Apply correlation penalty
        const correlationTerm = this.calculateCorrelationPenalty(opportunities, fractions);
        growth -= correlationTerm;

        return growth;
    }

    /**
     * Calculate penalty for correlated bets
     */
    calculateCorrelationPenalty(opportunities, fractions) {
        let penalty = 0;

        // Check for same-game bets (highly correlated)
        for (let i = 0; i < opportunities.length; i++) {
            for (let j = i + 1; j < opportunities.length; j++) {
                if (opportunities[i].gameId === opportunities[j].gameId) {
                    // Same game - apply penalty
                    penalty += this.config.correlationPenalty *
                        fractions[i] * fractions[j];
                }
            }
        }

        return penalty;
    }

    /**
     * PRODUCTION METHOD: Solve with full Covariance Matrix
     *
     * This properly models correlated bets by:
     * 1. Building a covariance matrix from bet relationships
     * 2. Including f' * Σ * f in the objective (penalizes correlated exposure)
     * 3. Adding per-game exposure constraints
     *
     * @param {Array} opportunities - Bet opportunities
     * @param {number} bankroll - Current bankroll
     * @param {Array} covarianceMatrix - Optional explicit covariance matrix
     */
    solveWithCovariance(opportunities, bankroll, covarianceMatrix = null) {
        if (opportunities.length === 0) {
            return { allocations: [], totalExposure: 0, expectedGrowth: 0 };
        }

        const n = opportunities.length;

        // Build covariance matrix if not provided
        const sigma = covarianceMatrix || this.buildCovarianceMatrix(opportunities);

        // Initialize with single-bet Kelly stakes
        let fractions = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            const opp = opportunities[i];
            fractions[i] = this.kelly.calculateSingleKelly(opp.modelProb, opp.odds);
        }

        // Scale down if total exceeds max exposure
        const totalKelly = fractions.reduce((s, f) => s + f, 0);
        if (totalKelly > this.config.maxExposure) {
            const scale = this.config.maxExposure / totalKelly;
            fractions = fractions.map(f => f * scale);
        }

        // Refine with covariance-aware coordinate descent
        const refined = this.coordinateDescentWithCovariance(opportunities, fractions, sigma);

        // Apply per-game exposure limits
        const gameConstrained = this.applyGameConstraints(opportunities, refined);

        // Convert to dollar amounts
        const allocations = opportunities.map((opp, i) => ({
            ...opp,
            fraction: gameConstrained[i],
            amount: gameConstrained[i] * bankroll,
            expectedValue: this.kelly.calculateEdge(opp.modelProb, opp.odds) *
                gameConstrained[i] * bankroll
        }));

        // Calculate portfolio metrics
        const totalExposure = gameConstrained.reduce((s, f) => s + f, 0);
        const expectedGrowth = this.calculateRiskAdjustedGrowth(
            opportunities, gameConstrained, sigma
        );
        const portfolioRisk = this.calculatePortfolioRiskWithCovariance(
            opportunities, gameConstrained, sigma
        );

        return {
            allocations,
            totalExposure,
            expectedGrowth,
            portfolioRisk,
            riskAdjustedReturn: expectedGrowth / (Math.sqrt(portfolioRisk) + 0.001),
            totalEV: allocations.reduce((s, a) => s + a.expectedValue, 0),
            numBets: allocations.filter(a => a.amount > 0).length,
            method: 'covariance_aware'
        };
    }

    /**
     * Build covariance matrix from bet relationships
     * Sigma[i][j] = Cov(return_i, return_j)
     * @param {Array} opportunities - Bet opportunities
     * @returns {Array} Covariance matrix (positive semi-definite)
     */
    buildCovarianceMatrix(opportunities) {
        const n = opportunities.length;
        const sigma = Array.from({ length: n }, () => new Array(n).fill(0));

        // Pre-calculate variances to avoid redundant computation
        const variances = opportunities.map(opp => {
            const v = this.calculateSingleBetVariance(opp);
            // CRITICAL FIX: Ensure variance is non-negative
            return Math.max(0, v);
        });

        for (let i = 0; i < n; i++) {
            const oppI = opportunities[i];
            const varI = variances[i];

            for (let j = 0; j < n; j++) {
                if (i === j) {
                    // Diagonal: variance of bet i
                    sigma[i][j] = varI;
                } else {
                    // Off-diagonal: covariance between bets i and j
                    const oppJ = opportunities[j];
                    const varJ = variances[j];
                    const correlation = this.estimateCorrelation(oppI, oppJ);

                    // Cov(i,j) = ρ * σ_i * σ_j
                    // CRITICAL FIX: Handle zero/negative variance edge cases
                    const stdI = Math.sqrt(Math.max(0, varI));
                    const stdJ = Math.sqrt(Math.max(0, varJ));
                    sigma[i][j] = correlation * stdI * stdJ;
                }
            }
        }

        // Validate matrix is valid (symmetric with non-negative diagonal)
        this.validateCovarianceMatrix(sigma);

        return sigma;
    }

    /**
     * Validate covariance matrix properties
     * @param {Array} sigma - Covariance matrix to validate
     */
    validateCovarianceMatrix(sigma) {
        const n = sigma.length;

        for (let i = 0; i < n; i++) {
            // Diagonal must be non-negative
            if (sigma[i][i] < 0) {
                console.warn(`Negative variance at position [${i}][${i}], setting to 0`);
                sigma[i][i] = 0;
            }

            // Matrix must be symmetric
            for (let j = i + 1; j < n; j++) {
                const diff = Math.abs(sigma[i][j] - sigma[j][i]);
                if (diff > 1e-10) {
                    // Enforce symmetry by averaging
                    const avg = (sigma[i][j] + sigma[j][i]) / 2;
                    sigma[i][j] = avg;
                    sigma[j][i] = avg;
                }
            }
        }
    }

    /**
     * Estimate correlation between two bets based on their characteristics
     * @param {Object} oppA - First bet opportunity
     * @param {Object} oppB - Second bet opportunity
     * @returns {number} Correlation coefficient in range [-1, 1]
     */
    estimateCorrelation(oppA, oppB) {
        // Input validation
        if (!oppA || !oppB) {
            return 0;
        }

        let correlation = 0;

        // Same game = highly correlated
        if (oppA.gameId && oppB.gameId && oppA.gameId === oppB.gameId) {
            // Same side of same game = very high correlation
            if (oppA.side === oppB.side || oppA.team === oppB.team) {
                correlation = this.config.sameGameCorrelation;
            }
            // Opposite sides of same game (e.g., ML vs spread on same team)
            else if (oppA.team === oppB.team) {
                correlation = this.config.sameGameCorrelation * 0.8;
            }
            // Different bets on same game (e.g., home ML and total over)
            // These have moderate correlation - both benefit from high scoring
            else {
                correlation = this.config.sameGameCorrelation * 0.5;
            }
        }
        // Same team, different game = slight correlation
        else if (oppA.team && oppB.team && oppA.team === oppB.team) {
            correlation = this.config.sameTeamCorrelation;
        }
        // Different teams, different games = essentially independent
        else {
            correlation = 0;
        }

        // CRITICAL FIX: Clamp correlation to valid range [-1, 1]
        // This ensures covariance matrix remains positive semi-definite
        return Math.max(-1, Math.min(1, correlation));
    }

    /**
     * Calculate single bet variance
     */
    calculateSingleBetVariance(opp) {
        const decimal = this.kelly.americanToDecimal(opp.odds);
        const p = opp.modelProb;
        const q = 1 - p;

        // Win amount and loss amount
        const winReturn = decimal - 1;
        const lossReturn = -1;

        // Expected return
        const expectedReturn = p * winReturn + q * lossReturn;

        // Variance = E[X²] - E[X]²
        const EX2 = p * winReturn * winReturn + q * lossReturn * lossReturn;
        const variance = EX2 - expectedReturn * expectedReturn;

        return variance;
    }

    /**
     * Coordinate descent with covariance matrix
     */
    coordinateDescentWithCovariance(opportunities, initialFractions, sigma) {
        const n = opportunities.length;
        let fractions = [...initialFractions];
        let prevObjective = this.calculateRiskAdjustedGrowth(opportunities, fractions, sigma);

        for (let iter = 0; iter < this.config.maxIterations; iter++) {
            // Optimize each coordinate
            for (let i = 0; i < n; i++) {
                fractions[i] = this.optimizeCoordinateWithCovariance(
                    opportunities, fractions, i, sigma
                );
            }

            // Check convergence
            const objective = this.calculateRiskAdjustedGrowth(opportunities, fractions, sigma);
            if (Math.abs(objective - prevObjective) < this.config.convergenceThreshold) {
                break;
            }
            prevObjective = objective;
        }

        return fractions;
    }

    /**
     * Optimize single coordinate with covariance awareness
     */
    optimizeCoordinateWithCovariance(opportunities, fractions, idx, sigma) {
        const others = fractions.filter((_, i) => i !== idx);
        const othersSum = others.reduce((s, f) => s + f, 0);

        // Maximum we can bet on this opportunity
        const maxFraction = Math.min(
            this.config.maxSingleBet,
            this.config.maxExposure - othersSum
        );

        if (maxFraction <= 0) return 0;

        // Golden section search for optimal fraction (faster than grid)
        const phi = (1 + Math.sqrt(5)) / 2;
        let a = 0;
        let b = maxFraction;

        // CRITICAL FIX: Prevent infinite loop with max iterations
        const maxGoldenIterations = 100;
        let iterations = 0;

        const evaluate = (f) => {
            const testFractions = [...fractions];
            testFractions[idx] = f;
            const result = this.calculateRiskAdjustedGrowth(opportunities, testFractions, sigma);
            // Handle NaN/Infinity
            if (!isFinite(result)) {
                return -Infinity;
            }
            return result;
        };

        let c = b - (b - a) / phi;
        let d = a + (b - a) / phi;

        while (Math.abs(b - a) > this.config.stepSize && iterations < maxGoldenIterations) {
            iterations++;

            const evalC = evaluate(c);
            const evalD = evaluate(d);

            if (evalC > evalD) {
                b = d;
            } else {
                a = c;
            }
            c = b - (b - a) / phi;
            d = a + (b - a) / phi;
        }

        if (iterations >= maxGoldenIterations) {
            console.warn(`Golden section search hit max iterations for index ${idx}`);
        }

        return (a + b) / 2;
    }

    /**
     * Calculate risk-adjusted growth (with covariance penalty)
     * Objective: E[growth] - λ * f' * Σ * f
     */
    calculateRiskAdjustedGrowth(opportunities, fractions, sigma) {
        // Expected growth term
        let growth = 0;
        for (let i = 0; i < opportunities.length; i++) {
            const opp = opportunities[i];
            const f = fractions[i];

            if (f <= 0) continue;

            const decimal = this.kelly.americanToDecimal(opp.odds);
            const p = opp.modelProb;
            const q = 1 - p;

            growth += p * Math.log(1 + f * (decimal - 1));
            growth += q * Math.log(1 - f);
        }

        // Risk penalty: λ * f' * Σ * f (quadratic form)
        let riskPenalty = 0;
        for (let i = 0; i < fractions.length; i++) {
            for (let j = 0; j < fractions.length; j++) {
                riskPenalty += fractions[i] * sigma[i][j] * fractions[j];
            }
        }

        return growth - this.config.riskAversion * riskPenalty;
    }

    /**
     * Calculate portfolio risk (variance) with covariance matrix
     */
    calculatePortfolioRiskWithCovariance(opportunities, fractions, sigma) {
        let variance = 0;
        for (let i = 0; i < fractions.length; i++) {
            for (let j = 0; j < fractions.length; j++) {
                variance += fractions[i] * sigma[i][j] * fractions[j];
            }
        }
        return variance;
    }

    /**
     * Apply per-game exposure constraints
     */
    applyGameConstraints(opportunities, fractions) {
        const constrained = [...fractions];
        const gameExposure = {};

        // Calculate current exposure per game
        for (let i = 0; i < opportunities.length; i++) {
            const gameId = opportunities[i].gameId;
            if (!gameExposure[gameId]) {
                gameExposure[gameId] = { total: 0, indices: [] };
            }
            gameExposure[gameId].total += fractions[i];
            gameExposure[gameId].indices.push(i);
        }

        // Scale down if any game exceeds max
        for (const game of Object.values(gameExposure)) {
            if (game.total > this.config.maxGameExposure) {
                const scale = this.config.maxGameExposure / game.total;
                for (const idx of game.indices) {
                    constrained[idx] *= scale;
                }
            }
        }

        return constrained;
    }

    /**
     * Legacy: Solve with simple correlation penalty (deprecated)
     */
    solveWithCorrelation(opportunities, bankroll, correlationMatrix) {
        // Redirect to new covariance-aware method
        return this.solveWithCovariance(opportunities, bankroll, correlationMatrix);
    }

    /**
     * Calculate portfolio variance (legacy method, kept for compatibility)
     */
    calculatePortfolioVariance(opportunities, fractions) {
        let variance = 0;

        // Individual variances (diagonal only - ignores correlations)
        for (let i = 0; i < opportunities.length; i++) {
            const opp = opportunities[i];
            const f = fractions[i];
            const decimal = this.kelly.americanToDecimal(opp.odds);
            const p = opp.modelProb;

            // Var = p * (b^2) + q * 1 - (p*b - q)^2
            const betVariance = p * (decimal - 1) ** 2 + (1 - p) -
                (p * (decimal - 1) - (1 - p)) ** 2;

            variance += f ** 2 * betVariance;
        }

        return variance;
    }

    /**
     * Calculate Sharpe-like ratio for the portfolio
     */
    calculateSharpe(opportunities, fractions) {
        const expectedReturn = opportunities.reduce((sum, opp, i) => {
            return sum + fractions[i] * this.kelly.calculateEdge(opp.modelProb, opp.odds);
        }, 0);

        const variance = this.calculatePortfolioVariance(opportunities, fractions);

        if (variance === 0) return 0;

        return expectedReturn / Math.sqrt(variance);
    }

    /**
     * Analyze portfolio composition
     */
    analyzePortfolio(allocations) {
        const analysis = {
            byBetType: {},
            byTeam: {},
            byGame: {},
            exposureProfile: {
                total: 0,
                largest: 0,
                average: 0
            }
        };

        for (const alloc of allocations) {
            if (alloc.amount <= 0) continue;

            // By bet type
            if (!analysis.byBetType[alloc.betType]) {
                analysis.byBetType[alloc.betType] = { count: 0, exposure: 0 };
            }
            analysis.byBetType[alloc.betType].count++;
            analysis.byBetType[alloc.betType].exposure += alloc.fraction;

            // By team
            if (alloc.team) {
                if (!analysis.byTeam[alloc.team]) {
                    analysis.byTeam[alloc.team] = { count: 0, exposure: 0 };
                }
                analysis.byTeam[alloc.team].count++;
                analysis.byTeam[alloc.team].exposure += alloc.fraction;
            }

            // By game
            if (!analysis.byGame[alloc.gameId]) {
                analysis.byGame[alloc.gameId] = { count: 0, exposure: 0 };
            }
            analysis.byGame[alloc.gameId].count++;
            analysis.byGame[alloc.gameId].exposure += alloc.fraction;

            // Exposure profile
            analysis.exposureProfile.total += alloc.fraction;
            analysis.exposureProfile.largest = Math.max(
                analysis.exposureProfile.largest,
                alloc.fraction
            );
        }

        const numBets = allocations.filter(a => a.amount > 0).length;
        analysis.exposureProfile.average = numBets > 0 ?
            analysis.exposureProfile.total / numBets : 0;

        return analysis;
    }
}
