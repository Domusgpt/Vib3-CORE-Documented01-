/**
 * Geometric Alpha Demo
 *
 * Demonstrates the polytopal projection processing system for sports analytics.
 * This example shows how to:
 * 1. Analyze a pitcher's arsenal topology
 * 2. Compute pitch tunneling scores
 * 3. Analyze umpire strike zone
 * 4. Find value bets
 * 5. Optimize bet sizing with Kelly criterion
 * 6. Generate VIB3+ visualization parameters
 *
 * Run with: node examples/geometric-alpha-demo.js
 */

// Import sports analytics modules
import {
    TunnelAnalyzer,
    UmpireZoneHull,
    ArsenalTopology,
    KellyCriterion,
    PortfolioOptimizer,
    PlayerGeometricProfile
} from '../src/sports/index.js';

console.log('='.repeat(60));
console.log('GEOMETRIC ALPHA DEMO');
console.log('Polytopal Projection Processing for Sports Analytics');
console.log('='.repeat(60));
console.log();

// === 1. Simulated Pitch Data ===
// In production, this would come from pybaseball/Statcast

const simulatedPitches = generateSimulatedPitches();

console.log('[1/6] PITCH TUNNELING ANALYSIS');
console.log('-'.repeat(40));

const tunnelAnalyzer = new TunnelAnalyzer();
const tunnelScores = tunnelAnalyzer.computeTunnelScores(simulatedPitches);

console.log(`Analyzed ${simulatedPitches.length} pitches`);
console.log(`Found ${tunnelScores.length} pitch type pairs\n`);

// Show top tunnel pairs
console.log('Top Tunnel Pairs:');
tunnelScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .forEach(ts => {
        console.log(`  ${ts.pitchA} ↔ ${ts.pitchB}: Score ${ts.score.toFixed(2)} (Frequency: ${(ts.frequency * 100).toFixed(1)}%)`);
    });

// Build tunnel graph
const tunnelGraph = tunnelAnalyzer.buildTunnelGraph(tunnelScores);
console.log(`\nTunnel Graph Metrics:`);
console.log(`  Average Tunnel Score: ${tunnelGraph.metrics.avgTunnelScore.toFixed(2)}`);
console.log(`  Graph Connectivity: ${tunnelGraph.metrics.connectivity.toFixed(2)}`);
console.log();

// === 2. Arsenal Topology ===
console.log('[2/6] ARSENAL TOPOLOGY ANALYSIS');
console.log('-'.repeat(40));

const arsenalTopology = new ArsenalTopology();
const arsenal = arsenalTopology.computeArsenalTopology(simulatedPitches, 'demo_pitcher');

console.log(`Arsenal Metrics:`);
console.log(`  Volume: ${arsenal.metrics.arsenalVolume.toFixed(3)}`);
console.log(`  Spread: ${arsenal.metrics.arsenalSpread.toFixed(3)}`);
console.log(`  Cluster Separation: ${arsenal.metrics.clusterSeparation.toFixed(3)}`);
console.log(`  Stability Score: ${arsenal.metrics.stabilityScore.toFixed(3)}`);

console.log(`\nPitch Type Distribution:`);
Object.entries(arsenal.clusters.byType).forEach(([type, data]) => {
    console.log(`  ${type}: ${(data.frequency * 100).toFixed(1)}% (Compactness: ${data.compactness.toFixed(2)})`);
});
console.log();

// === 3. Umpire Zone Analysis ===
console.log('[3/6] UMPIRE ZONE HULL ANALYSIS');
console.log('-'.repeat(40));

const calledStrikes = generateSimulatedStrikes();
const umpireHull = new UmpireZoneHull();
const zoneAnalysis = umpireHull.computeHull(calledStrikes, 'demo_umpire');

console.log(`Zone Analysis:`);
console.log(`  Hull Area: ${zoneAnalysis.area.toFixed(3)} sq ft`);
console.log(`  Expansion Factor: ${zoneAnalysis.expansionFactor.toFixed(3)}`);
console.log(`  Centroid: (${zoneAnalysis.centroid[0].toFixed(2)}, ${zoneAnalysis.centroid[1].toFixed(2)})`);
console.log(`  Asymmetry: ${zoneAnalysis.asymmetry.magnitude.toFixed(3)}`);

console.log(`\nInsights:`);
zoneAnalysis.insights.forEach(insight => {
    console.log(`  [${insight.severity.toUpperCase()}] ${insight.message}`);
});
console.log();

// === 4. Value Bet Finding ===
console.log('[4/6] VALUE BET IDENTIFICATION');
console.log('-'.repeat(40));

const predictions = [
    {
        gameId: 'game_001',
        homeTeam: 'Yankees',
        awayTeam: 'Red Sox',
        homeWinProb: 0.58,
        awayWinProb: 0.42,
        confidence: 0.75
    },
    {
        gameId: 'game_002',
        homeTeam: 'Dodgers',
        awayTeam: 'Giants',
        homeWinProb: 0.62,
        awayWinProb: 0.38,
        confidence: 0.82
    },
    {
        gameId: 'game_003',
        homeTeam: 'Cubs',
        awayTeam: 'Cardinals',
        homeWinProb: 0.51,
        awayWinProb: 0.49,
        confidence: 0.68
    }
];

const marketOdds = [
    { gameId: 'game_001', homeOdds: -130, awayOdds: +110 },
    { gameId: 'game_002', homeOdds: -145, awayOdds: +125 },
    { gameId: 'game_003', homeOdds: -105, awayOdds: -105 }
];

const kelly = new KellyCriterion({ fraction: 0.25, minEdge: 0.02 });
const valueBets = [];

for (const pred of predictions) {
    const odds = marketOdds.find(o => o.gameId === pred.gameId);
    if (!odds) continue;

    const homeImplied = kelly.impliedProbability(odds.homeOdds);
    const awayImplied = kelly.impliedProbability(odds.awayOdds);

    const homeEdge = pred.homeWinProb - homeImplied;
    const awayEdge = pred.awayWinProb - awayImplied;

    if (homeEdge > 0.02) {
        valueBets.push({
            gameId: pred.gameId,
            team: pred.homeTeam,
            side: 'home',
            modelProb: pred.homeWinProb,
            impliedProb: homeImplied,
            edge: homeEdge,
            odds: odds.homeOdds,
            confidence: pred.confidence
        });
    }

    if (awayEdge > 0.02) {
        valueBets.push({
            gameId: pred.gameId,
            team: pred.awayTeam,
            side: 'away',
            modelProb: pred.awayWinProb,
            impliedProb: awayImplied,
            edge: awayEdge,
            odds: odds.awayOdds,
            confidence: pred.confidence
        });
    }
}

console.log(`Found ${valueBets.length} value opportunities:\n`);
valueBets.forEach(bet => {
    console.log(`  ${bet.team} (${bet.side})`);
    console.log(`    Model: ${(bet.modelProb * 100).toFixed(1)}% vs Market: ${(bet.impliedProb * 100).toFixed(1)}%`);
    console.log(`    Edge: ${(bet.edge * 100).toFixed(2)}% | Odds: ${bet.odds > 0 ? '+' : ''}${bet.odds}`);
});
console.log();

// === 5. Kelly Optimization ===
console.log('[5/6] SIMULTANEOUS KELLY OPTIMIZATION');
console.log('-'.repeat(40));

const bankroll = 10000;
const optimizer = new PortfolioOptimizer({
    maxExposure: 0.25,
    kellyFraction: 0.25
});

const optimized = optimizer.solve(valueBets, bankroll);

console.log(`Bankroll: $${bankroll.toLocaleString()}`);
console.log(`\nOptimal Allocations:`);

optimized.allocations.forEach(alloc => {
    if (alloc.amount > 0) {
        console.log(`  ${alloc.team}: $${alloc.amount.toFixed(2)} (${(alloc.fraction * 100).toFixed(2)}%)`);
    }
});

console.log(`\nPortfolio Summary:`);
console.log(`  Total Exposure: ${(optimized.totalExposure * 100).toFixed(2)}%`);
console.log(`  Number of Bets: ${optimized.numBets}`);
console.log(`  Expected Growth: ${(optimized.expectedGrowth * 100).toFixed(3)}%`);
console.log();

// === 6. VIB3+ Visualization ===
console.log('[6/6] VIB3+ GEOMETRIC VISUALIZATION');
console.log('-'.repeat(40));

const profiler = new PlayerGeometricProfile();
const vib3Params = profiler.generateProfile(arsenal);

console.log(`Generated VIB3+ Parameters:`);
console.log(`  Geometry: ${vib3Params.geometry} (Encoding: core ${Math.floor(vib3Params.geometry / 8)}, base ${vib3Params.geometry % 8})`);
console.log(`  Speed: ${vib3Params.speed.toFixed(2)}`);
console.log(`  Morph Factor: ${vib3Params.morphFactor.toFixed(2)}`);
console.log(`  Chaos: ${vib3Params.chaos.toFixed(2)}`);
console.log(`  Grid Density: ${vib3Params.gridDensity}`);
console.log(`  Hue: ${vib3Params.hue}°`);

console.log(`\n6D Rotation:`);
console.log(`  XY: ${vib3Params.rot4dXY.toFixed(2)} rad`);
console.log(`  XZ: ${vib3Params.rot4dXZ.toFixed(2)} rad`);
console.log(`  YZ: ${vib3Params.rot4dYZ.toFixed(2)} rad`);
console.log(`  XW: ${vib3Params.rot4dXW.toFixed(2)} rad`);
console.log(`  YW: ${vib3Params.rot4dYW.toFixed(2)} rad`);
console.log(`  ZW: ${vib3Params.rot4dZW.toFixed(2)} rad`);
console.log();

console.log('='.repeat(60));
console.log('DEMO COMPLETE');
console.log('='.repeat(60));

// === Helper Functions ===

function generateSimulatedPitches() {
    const pitchTypes = ['FF', 'SL', 'CH', 'CU', 'SI'];
    const pitches = [];

    for (let i = 0; i < 200; i++) {
        const type = pitchTypes[Math.floor(Math.random() * pitchTypes.length)];
        const baseVelo = type === 'FF' ? 95 : type === 'SI' ? 93 : type === 'SL' ? 85 : type === 'CH' ? 84 : 78;

        pitches.push({
            pitch_type: type,
            release_speed: baseVelo + (Math.random() - 0.5) * 4,
            release_spin_rate: 2200 + (Math.random() - 0.5) * 600,
            pfx_x: (Math.random() - 0.5) * 16,
            pfx_z: type === 'FF' ? 12 + Math.random() * 4 : (Math.random() - 0.5) * 10,
            release_pos_x: -2 + (Math.random() - 0.5) * 0.5,
            release_pos_z: 5.8 + (Math.random() - 0.5) * 0.3,
            release_extension: 6.3 + (Math.random() - 0.5) * 0.4,
            plate_x: (Math.random() - 0.5) * 1.5,
            plate_z: 1.5 + Math.random() * 2,
            vx0: (Math.random() - 0.5) * 10,
            vy0: -130 - Math.random() * 10,
            vz0: -5 + Math.random() * 10,
            ax: (Math.random() - 0.5) * 20,
            ay: 25 + Math.random() * 5,
            az: -15 + Math.random() * 10
        });
    }

    return pitches;
}

function generateSimulatedStrikes() {
    const strikes = [];

    for (let i = 0; i < 100; i++) {
        strikes.push({
            plate_x: (Math.random() - 0.5) * 1.8, // Slightly expanded from rulebook
            plate_z: 1.4 + Math.random() * 2.2,
            sz_top: 3.5,
            sz_bot: 1.5
        });
    }

    return strikes;
}
