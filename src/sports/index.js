/**
 * Geometric Alpha: Polytopal Projection Processing for Sports Derivatives
 *
 * A comprehensive architecture for polytopal analysis in sports analytics,
 * integrating geometric cognition principles with market efficiency theory.
 *
 * @module GeometricAlpha
 * @version 1.0.0
 * @author VIB3+ Engine Team
 *
 * Core Components:
 * - PolytopalFeatures: Pitch tunneling, convex hull zones, Voronoi tessellation
 * - DataIntegration: pybaseball patterns, odds API synchronization
 * - PredictiveEngine: ML models for delta run expectancy
 * - FinancialEngine: Simultaneous Kelly criterion optimization
 * - Visualization: Player profiles as geometric signatures
 */

// Data Integration Layer
export { DataLakeManager } from './data/DataLakeManager.js';
export { StatcastIntegration } from './data/StatcastIntegration.js';
export { OddsIntegration } from './data/OddsIntegration.js';
export { TimeSynchronizer } from './data/TimeSynchronizer.js';

// Polytopal Feature Engineering
export { TunnelAnalyzer } from './features/TunnelAnalyzer.js';
export { UmpireZoneHull } from './features/UmpireZoneHull.js';
export { DefensiveVoronoi } from './features/DefensiveVoronoi.js';
export { ArsenalTopology } from './features/ArsenalTopology.js';
export { GeometricFeatureEngine } from './features/GeometricFeatureEngine.js';

// Predictive Engine
export { DeltaRunExpectancy } from './prediction/DeltaRunExpectancy.js';
export { GeometricPredictor } from './prediction/GeometricPredictor.js';
export { ModelTrainer } from './prediction/ModelTrainer.js';
export { BacktestEngine } from './prediction/BacktestEngine.js';

// Financial Engineering
export { KellyCriterion } from './finance/KellyCriterion.js';
export { PortfolioOptimizer } from './finance/PortfolioOptimizer.js';
export { RiskManager } from './finance/RiskManager.js';
export { PaperTrader } from './finance/PaperTrader.js';

// Visualization Integration
export { PlayerGeometricProfile } from './visualization/PlayerGeometricProfile.js';
export { MatchupVisualizer } from './visualization/MatchupVisualizer.js';
export { MarketHeatmap } from './visualization/MarketHeatmap.js';

// Main Orchestrator
export { GeometricAlphaEngine } from './GeometricAlphaEngine.js';

/**
 * Quick Start:
 *
 * ```javascript
 * import { GeometricAlphaEngine } from '@vib3/sdk/sports';
 *
 * const engine = new GeometricAlphaEngine({
 *   dataPath: './data/statcast/',
 *   bankroll: 10000,
 *   maxExposure: 0.25
 * });
 *
 * // Load historical data
 * await engine.loadSeason(2024);
 *
 * // Compute geometric features for a game
 * const features = engine.computeFeatures({
 *   pitcherId: 592662,  // Gerrit Cole
 *   batterId: 545361,   // Mike Trout
 *   umpireId: 427125,
 *   venueId: 3313
 * });
 *
 * // Get optimal bet sizing
 * const bets = engine.optimizeBets(todaysSlate, currentOdds);
 * ```
 */
