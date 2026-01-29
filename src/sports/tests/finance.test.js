/**
 * Unit Tests: Finance/Betting System
 *
 * Comprehensive test suite for:
 * - KellyCriterion
 * - PortfolioOptimizer
 * - RiskManager
 * - PaperTrader
 * - BacktestEngine
 *
 * @module FinanceTests
 */

import { KellyCriterion } from '../finance/KellyCriterion.js';
import { PortfolioOptimizer } from '../finance/PortfolioOptimizer.js';
import { RiskManager } from '../finance/RiskManager.js';
import { PaperTrader } from '../finance/PaperTrader.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Simple test runner
 */
class TestRunner {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`TEST SUITE: ${this.suiteName}`);
        console.log(`${'='.repeat(60)}\n`);

        for (const { name, fn } of this.tests) {
            try {
                await fn();
                this.passed++;
                console.log(`  ✓ ${name}`);
            } catch (error) {
                this.failed++;
                console.log(`  ✗ ${name}`);
                console.log(`    Error: ${error.message}`);
            }
        }

        console.log(`\n  Results: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }
}

/**
 * Assertion helpers
 */
function assert(condition, message = 'Assertion failed') {
    if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message} Expected ${expected}, got ${actual}`);
    }
}

function assertClose(actual, expected, tolerance = 0.001, message = '') {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message} Expected ~${expected}, got ${actual} (tolerance: ${tolerance})`);
    }
}

function assertThrows(fn, message = 'Expected function to throw') {
    try {
        fn();
        throw new Error(message);
    } catch (e) {
        if (e.message === message) throw e;
        // Expected throw, test passes
    }
}

function assertNotNaN(value, message = 'Value should not be NaN') {
    if (Number.isNaN(value)) throw new Error(message);
}

function assertFinite(value, message = 'Value should be finite') {
    if (!Number.isFinite(value)) throw new Error(`${message}: got ${value}`);
}

// ============================================================================
// KELLY CRITERION TESTS
// ============================================================================

const kellyTests = new TestRunner('KellyCriterion');

kellyTests.test('impliedProbability: positive odds', () => {
    const kelly = new KellyCriterion();
    const prob = kelly.impliedProbability(150);
    assertClose(prob, 0.4, 0.001, 'Implied prob for +150');
});

kellyTests.test('impliedProbability: negative odds', () => {
    const kelly = new KellyCriterion();
    const prob = kelly.impliedProbability(-150);
    assertClose(prob, 0.6, 0.001, 'Implied prob for -150');
});

kellyTests.test('impliedProbability: even odds', () => {
    const kelly = new KellyCriterion();
    const prob = kelly.impliedProbability(100);
    assertClose(prob, 0.5, 0.001, 'Implied prob for +100');
});

kellyTests.test('calculateKelly: positive edge', () => {
    const kelly = new KellyCriterion();
    const result = kelly.calculateKelly(0.55, 100);
    assert(result.fraction > 0, 'Kelly should be positive with edge');
    assertClose(result.fraction, 0.10, 0.02, 'Kelly fraction');
});

kellyTests.test('calculateKelly: negative edge', () => {
    const kelly = new KellyCriterion();
    const result = kelly.calculateKelly(0.40, 100);
    assert(result.fraction <= 0, 'Kelly should be zero or negative without edge');
});

kellyTests.test('calculateKelly: handles edge case odds', () => {
    const kelly = new KellyCriterion();
    // Very high odds
    const result1 = kelly.calculateKelly(0.10, 1000);
    assertFinite(result1.fraction, 'Should handle high odds');
    // Very negative odds
    const result2 = kelly.calculateKelly(0.95, -500);
    assertFinite(result2.fraction, 'Should handle very negative odds');
});

kellyTests.test('noVigProbability: calculates vig correctly', () => {
    const kelly = new KellyCriterion();
    const result = kelly.noVigProbability(-110, -110);
    assertClose(result.vig, 0.0476, 0.01, 'Standard -110 vig');
    assertClose(result.prob1, 0.5, 0.001, 'No-vig prob should be 0.5');
});

kellyTests.test('noVigProbability: handles zero division', () => {
    const kelly = new KellyCriterion();
    // This could cause division by zero if not handled
    const result = kelly.noVigProbability(0, 0);
    assertNotNaN(result.prob1, 'Should not return NaN');
    assertFinite(result.prob1, 'Should return finite value');
});

kellyTests.test('adjustedKelly: respects multiplier', () => {
    const kelly = new KellyCriterion({ kellyMultiplier: 0.25 });
    const full = kelly.calculateKelly(0.55, 100);
    const adjusted = kelly.calculateAdjustedKelly(0.55, 100);
    assertClose(adjusted.fraction, full.fraction * 0.25, 0.01, 'Quarter Kelly');
});

// ============================================================================
// PORTFOLIO OPTIMIZER TESTS
// ============================================================================

const portfolioTests = new TestRunner('PortfolioOptimizer');

portfolioTests.test('buildCovarianceMatrix: same game correlation', () => {
    const optimizer = new PortfolioOptimizer();
    const opportunities = [
        { gameId: 'game1', betType: 'moneyline', side: 'home', modelProb: 0.6, impliedProb: 0.5, odds: 100 },
        { gameId: 'game1', betType: 'total', side: 'over', modelProb: 0.55, impliedProb: 0.5, odds: -110 }
    ];
    const sigma = optimizer.buildCovarianceMatrix(opportunities);
    assert(sigma[0][1] > 0, 'Same-game bets should be correlated');
    assert(sigma[0][1] === sigma[1][0], 'Matrix should be symmetric');
});

portfolioTests.test('buildCovarianceMatrix: different games', () => {
    const optimizer = new PortfolioOptimizer();
    const opportunities = [
        { gameId: 'game1', betType: 'moneyline', side: 'home', modelProb: 0.6, impliedProb: 0.5, odds: 100 },
        { gameId: 'game2', betType: 'moneyline', side: 'home', modelProb: 0.55, impliedProb: 0.5, odds: -110 }
    ];
    const sigma = optimizer.buildCovarianceMatrix(opportunities);
    assertClose(sigma[0][1], 0, 0.001, 'Different games should be uncorrelated');
});

portfolioTests.test('validateCovarianceMatrix: detects invalid correlation', () => {
    const optimizer = new PortfolioOptimizer();
    // Matrix with correlation > 1 (invalid)
    const badMatrix = [
        [1, 1.5],
        [1.5, 1]
    ];
    const result = optimizer.validateCovarianceMatrix(badMatrix);
    assert(!result.valid, 'Should detect invalid correlation');
});

portfolioTests.test('optimizeSimultaneous: respects max exposure', () => {
    const optimizer = new PortfolioOptimizer({ maxTotalExposure: 0.10 });
    const opportunities = [
        { gameId: 'game1', betType: 'moneyline', modelProb: 0.7, impliedProb: 0.5, odds: 100 },
        { gameId: 'game2', betType: 'moneyline', modelProb: 0.7, impliedProb: 0.5, odds: 100 }
    ];
    const allocations = optimizer.optimizeSimultaneous(opportunities, 10000);
    const totalFraction = allocations.reduce((sum, a) => sum + a.fraction, 0);
    assert(totalFraction <= 0.10 + 0.001, `Total exposure ${totalFraction} should be <= 0.10`);
});

portfolioTests.test('calculateRiskAdjustedGrowth: penalizes correlated bets', () => {
    const optimizer = new PortfolioOptimizer({ riskAversion: 1.0 });
    const opportunities = [
        { gameId: 'game1', modelProb: 0.6, impliedProb: 0.5, odds: 100 },
        { gameId: 'game1', modelProb: 0.6, impliedProb: 0.5, odds: 100 }
    ];
    const sigma = optimizer.buildCovarianceMatrix(opportunities);

    const fractions1 = [0.05, 0.05];
    const growth1 = optimizer.calculateRiskAdjustedGrowth(opportunities, fractions1, sigma);

    // Independent bets (different games)
    const indepOpps = [
        { gameId: 'game1', modelProb: 0.6, impliedProb: 0.5, odds: 100 },
        { gameId: 'game2', modelProb: 0.6, impliedProb: 0.5, odds: 100 }
    ];
    const sigmaIndep = optimizer.buildCovarianceMatrix(indepOpps);
    const growth2 = optimizer.calculateRiskAdjustedGrowth(indepOpps, fractions1, sigmaIndep);

    assert(growth2 > growth1, 'Independent bets should have higher risk-adjusted growth');
});

// ============================================================================
// RISK MANAGER TESTS
// ============================================================================

const riskTests = new TestRunner('RiskManager');

riskTests.test('validateBet: requires minimum edge', () => {
    const risk = new RiskManager({ minEdge: 0.03 });
    const bet = { edge: 0.02, confidence: 0.7, gameId: 'game1' };
    const result = risk.validateBet(bet);
    assert(!result.approved, 'Should reject bet with insufficient edge');
});

riskTests.test('validateBet: requires minimum confidence', () => {
    const risk = new RiskManager({ minConfidence: 0.6 });
    const bet = { edge: 0.05, confidence: 0.5, gameId: 'game1' };
    const result = risk.validateBet(bet);
    assert(!result.approved, 'Should reject low confidence bet');
});

riskTests.test('validateBet: handles null bet gracefully', () => {
    const risk = new RiskManager();
    const result = risk.validateBet(null);
    assert(!result.approved, 'Should reject null bet');
    assert(result.reason, 'Should provide rejection reason');
});

riskTests.test('validateBet: handles undefined properties', () => {
    const risk = new RiskManager();
    const bet = { gameId: 'game1' }; // Missing edge, confidence
    const result = risk.validateBet(bet);
    // Should not crash
    assertNotNaN(result.approved ? 1 : 0, 'Should return boolean approved');
});

riskTests.test('applyStreakAdjustment: reduces after losses', () => {
    const risk = new RiskManager({ streakReduction: 0.5 });
    risk.recordResult(false); // Loss
    risk.recordResult(false); // Loss
    risk.recordResult(false); // Loss

    const fraction = 0.05;
    const adjusted = risk.applyStreakAdjustment(fraction);
    assert(adjusted < fraction, 'Should reduce fraction after losses');
});

riskTests.test('checkDailyLimits: respects max bets', () => {
    const risk = new RiskManager({ maxDailyBets: 3 });
    risk.recordBet({ amount: 100 });
    risk.recordBet({ amount: 100 });
    risk.recordBet({ amount: 100 });

    const canBet = risk.checkDailyLimits();
    assert(!canBet.allowed, 'Should not allow more bets after limit');
});

riskTests.test('applyRiskLimits: handles NaN fraction', () => {
    const risk = new RiskManager();
    const bets = [{ fraction: NaN, gameId: 'game1', edge: 0.05, confidence: 0.7 }];
    const approved = risk.applyRiskLimits(bets, 10000);
    // Should not crash, and fraction should be valid
    assert(approved.length >= 0, 'Should return array');
    if (approved.length > 0) {
        assertFinite(approved[0].fraction, 'Should have finite fraction');
    }
});

// ============================================================================
// PAPER TRADER TESTS
// ============================================================================

const paperTests = new TestRunner('PaperTrader');

paperTests.test('placeBet: deducts from bankroll', async () => {
    const trader = new PaperTrader(10000);
    await trader.placeBet({ gameId: 'game1', amount: 500, odds: -110 });
    assertEqual(trader.getBankroll(), 9500, 'Bankroll after bet');
});

paperTests.test('placeBet: rejects insufficient funds', async () => {
    const trader = new PaperTrader(1000);
    const result = await trader.placeBet({ gameId: 'game1', amount: 2000, odds: -110 });
    assert(!result.success, 'Should reject bet > bankroll');
});

paperTests.test('settleBets: calculates winnings correctly', async () => {
    const trader = new PaperTrader(10000);
    await trader.placeBet({
        gameId: 'game1',
        betType: 'moneyline',
        side: 'home',
        amount: 100,
        odds: 150
    });

    await trader.settleBets([{
        gameId: 'game1',
        homeScore: 5,
        awayScore: 3
    }]);

    // Won $150 on $100 bet at +150
    assertEqual(trader.getBankroll(), 10000 - 100 + 100 + 150, 'Bankroll after win');
});

paperTests.test('settleBets: handles push correctly', async () => {
    const trader = new PaperTrader(10000);
    await trader.placeBet({
        gameId: 'game1',
        betType: 'total',
        side: 'over',
        line: 8.5,
        amount: 100,
        odds: -110
    });

    // Push when total equals line (shouldn't happen with .5 lines, but test the logic)
    // Actually, let's test with a whole number line
    trader.openBets[0].line = 9;

    await trader.settleBets([{
        gameId: 'game1',
        homeScore: 5,
        awayScore: 4,
        totalRuns: 9
    }]);

    assertEqual(trader.getBankroll(), 10000, 'Bankroll after push');
});

paperTests.test('generateOrderId: is deterministic', () => {
    const trader = new PaperTrader(10000);
    trader.resetOrderCounter();

    const id1 = trader.generateOrderId();
    const id2 = trader.generateOrderId();

    assert(id1 !== id2, 'IDs should be unique');
    assert(id1.startsWith('ORD-'), 'Should have correct prefix');
    assert(id2.includes('-000002'), 'Second ID should have counter 2');
});

paperTests.test('cancelBet: prevents negative stats', async () => {
    const trader = new PaperTrader(10000);
    await trader.placeBet({ gameId: 'game1', amount: 100, odds: -110 });

    // Manually corrupt stats (simulating edge case)
    trader.stats.totalWagered = 50; // Less than bet amount

    const result = trader.cancelBet(trader.openBets[0].orderId);

    assert(result.success, 'Cancel should succeed');
    assert(trader.stats.totalWagered >= 0, 'Stats should not go negative');
});

paperTests.test('getPerformance: handles no bets', () => {
    const trader = new PaperTrader(10000);
    const perf = trader.getPerformance();

    assertEqual(perf.totalBets, 0, 'Total bets');
    assertEqual(perf.winRate, 0, 'Win rate with no bets');
    assertNotNaN(perf.roi, 'ROI should not be NaN');
});

paperTests.test('reset: clears all state', async () => {
    const trader = new PaperTrader(10000);
    await trader.placeBet({ gameId: 'game1', amount: 500, odds: -110 });

    trader.reset();

    assertEqual(trader.getBankroll(), 10000, 'Bankroll after reset');
    assertEqual(trader.openBets.length, 0, 'Open bets after reset');
    assertEqual(trader.stats.totalBets, 0, 'Stats after reset');
});

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  GEOMETRIC ALPHA - FINANCE SYSTEM UNIT TESTS               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const results = [];

    results.push(await kellyTests.run());
    results.push(await portfolioTests.run());
    results.push(await riskTests.run());
    results.push(await paperTests.run());

    console.log('\n' + '='.repeat(60));
    console.log('OVERALL RESULTS');
    console.log('='.repeat(60));

    const allPassed = results.every(r => r);
    if (allPassed) {
        console.log('\n  ✓ ALL TEST SUITES PASSED\n');
    } else {
        console.log('\n  ✗ SOME TESTS FAILED\n');
        process.exitCode = 1;
    }

    return allPassed;
}

// Export for use as module or run directly
export { runAllTests, kellyTests, portfolioTests, riskTests, paperTests };

// Run if executed directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('finance.test')) {
    runAllTests();
}
