# Geometric Alpha: Polytopal Projection Processing for Sports Analytics

A comprehensive sports analytics engine that applies **geometric cognition** and **topological data analysis** to baseball prediction and betting optimization.

## Overview

The Geometric Alpha system represents the "shape of skill" - treating player performance not as rows in a database, but as **polytopes in high-dimensional space**. By modeling the geometry of pitch arsenals, umpire zones, and defensive coverage, we uncover alpha that regression-based models miss.

### Core Concepts

1. **Pitch Tunneling (Manifold Intersection)**: Measures how long two pitch types share the same trajectory before diverging. High tunnel scores indicate elite deception.

2. **Umpire Zone Hull (Convex Hull Analysis)**: Models the actual strike zone as a polygon, computing expansion factors and centroid drift for totals prediction.

3. **Defensive Voronoi (Tessellation)**: Partitions the field by fielder coverage, identifying "seams" where hits are most likely to fall.

4. **Arsenal Topology (TDA)**: Uses persistence homology to extract the "shape" of a pitcher's arsenal in kinematic space.

## Installation

```bash
# The sports module is part of the VIB3+ SDK
npm install @vib3/sdk

# For Python data fetching (optional)
pip install pybaseball pandas numpy
```

## Quick Start

```javascript
import { GeometricAlphaEngine } from '@vib3/sdk/sports';

// Initialize engine
const engine = new GeometricAlphaEngine({
  bankroll: 10000,
  maxExposure: 0.25,
  kellyFraction: 0.25
});

// Load historical data
await engine.loadSeason(2024);

// Train predictive model
await engine.trainModels({
  trainYears: [2021, 2022, 2023],
  validationYear: 2024
});

// Get predictions for today's slate
const predictions = await engine.predictSlate(todaysGames);

// Find value bets
const valueBets = engine.findValueBets(predictions, currentOdds);

// Optimize bet sizes
const optimized = engine.optimizeBets(valueBets);

console.log(optimized);
// {
//   bets: [...],
//   totalExposure: 0.18,
//   expectedGrowth: 0.023,
//   numBets: 4
// }
```

## Architecture

```
src/sports/
├── index.js                    # Main exports
├── GeometricAlphaEngine.js     # Unified orchestrator
│
├── data/                       # Data Integration Layer
│   ├── DataLakeManager.js      # Local data storage
│   ├── StatcastIntegration.js  # pybaseball patterns
│   ├── OddsIntegration.js      # The-Odds-API client
│   └── TimeSynchronizer.js     # merge_asof implementation
│
├── features/                   # Polytopal Feature Engineering
│   ├── TunnelAnalyzer.js       # Pitch tunneling computation
│   ├── UmpireZoneHull.js       # Convex hull strike zones
│   ├── DefensiveVoronoi.js     # Fielder coverage tessellation
│   ├── ArsenalTopology.js      # TDA for pitcher arsenals
│   └── GeometricFeatureEngine.js # Feature coordination
│
├── prediction/                 # Predictive Engine
│   ├── DeltaRunExpectancy.js   # RE24 matrix calculations
│   ├── GeometricPredictor.js   # Gradient boosting model
│   ├── BacktestEngine.js       # Historical validation
│   └── ModelTrainer.js         # Training pipeline
│
├── finance/                    # Financial Engineering
│   ├── KellyCriterion.js       # Optimal bet sizing
│   ├── PortfolioOptimizer.js   # Simultaneous Kelly solver
│   ├── RiskManager.js          # Risk controls
│   └── PaperTrader.js          # Simulated execution
│
├── visualization/              # VIB3+ Integration
│   ├── PlayerGeometricProfile.js # Player → 4D geometry
│   ├── MatchupVisualizer.js    # Game matchup display
│   └── MarketHeatmap.js        # Edge distribution viz
│
└── tools/                      # MCP Tools
    └── index.js                # Agentic interface
```

## Key Features

### Pitch Tunneling Analysis

```javascript
import { TunnelAnalyzer } from '@vib3/sdk/sports';

const analyzer = new TunnelAnalyzer();
const scores = analyzer.computeTunnelScores(pitcherData);

// Returns pairs with tunnel scores
// High score = pitches look identical until late divergence
console.log(scores);
// [
//   { pitchA: 'FF', pitchB: 'SL', score: 2.4, frequency: 0.15 },
//   { pitchA: 'FF', pitchB: 'CH', score: 1.8, frequency: 0.22 },
//   ...
// ]

// Build tunnel graph
const graph = analyzer.buildTunnelGraph(scores);
// Graph metrics reveal arsenal connectivity
```

### Umpire Zone Hull

```javascript
import { UmpireZoneHull } from '@vib3/sdk/sports';

const hull = new UmpireZoneHull();
const zone = hull.computeHull(calledStrikes, umpireId);

console.log(zone);
// {
//   area: 2.45,
//   expansionFactor: 1.15,  // Zone 15% larger than rulebook
//   centroid: [0.02, 2.35], // Shifted low
//   insights: [
//     { type: 'zone_expansion', message: 'Zone expanded 15% - Under value' }
//   ]
// }
```

### Defensive Voronoi

```javascript
import { DefensiveVoronoi } from '@vib3/sdk/sports';

const voronoi = new DefensiveVoronoi();
const coverage = voronoi.computeVoronoi(fielders);
const exposure = voronoi.computeSeamExposure(batterSprayChart, coverage);

console.log(exposure);
// {
//   seamExposure: 0.23,      // 23% of hits near seams
//   seamHitRate: 0.18,
//   hotZones: [...]          // Areas of high hit density
// }
```

### Simultaneous Kelly Optimization

```javascript
import { PortfolioOptimizer } from '@vib3/sdk/sports';

const optimizer = new PortfolioOptimizer({
  maxExposure: 0.25,
  kellyFraction: 0.25
});

const result = optimizer.solve(valueBets, bankroll);

// Optimal allocations respecting portfolio constraints
console.log(result);
// {
//   allocations: [
//     { team: 'Yankees', amount: 150, fraction: 0.015, edge: 0.04 },
//     { team: 'Dodgers', amount: 220, fraction: 0.022, edge: 0.06 },
//     ...
//   ],
//   totalExposure: 0.18,
//   expectedGrowth: 0.023
// }
```

## Data Integration

### Fetching Statcast Data (Python)

```python
# Generate fetch script
from statcast_integration import StatcastIntegration

integration = StatcastIntegration()
script = integration.generatePythonScript({
    'startDate': '2024-04-01',
    'endDate': '2024-10-01',
    'outputPath': 'statcast_2024.json'
})

# Run the generated script to fetch data
exec(script)
```

### Loading Data (JavaScript)

```javascript
import { DataLakeManager, StatcastIntegration } from '@vib3/sdk/sports';

const dataLake = new DataLakeManager('./data/');
const statcast = new StatcastIntegration();

// Load JSON exported from pybaseball
const rawData = JSON.parse(fs.readFileSync('statcast_2024.json'));
const normalized = statcast.parseStatcastJSON(rawData);

// Load into data lake
await dataLake.loadSeason(2024, { pitches: normalized });
```

## Backtesting

```javascript
import { BacktestEngine } from '@vib3/sdk/sports';

const backtest = new BacktestEngine({
  startingBankroll: 10000,
  verbose: true
});

const results = await backtest.run(engine, {
  startDate: '2024-04-01',
  endDate: '2024-09-30',
  dataLake,
  oddsHistory
});

console.log(results.summary);
// {
//   totalBets: 342,
//   wins: 188,
//   losses: 154,
//   winRate: 0.55,
//   roi: 0.082,
//   averageCLV: 0.018,
//   maxDrawdown: 0.12,
//   sharpeRatio: 1.45
// }
```

## VIB3+ Visualization Integration

Player arsenals and matchups can be visualized using the VIB3+ geometric engine:

```javascript
import { PlayerGeometricProfile, MatchupVisualizer } from '@vib3/sdk/sports';

const profiler = new PlayerGeometricProfile();
const params = profiler.generateProfile(pitcherArsenal);

// Apply to VIB3+ engine
vib3Engine.setParameters(params);

// Result: 4D geometric shape representing the pitcher's "signature"
// - Geometry type encodes dominant pitch
// - Rotation speed encodes tunnel efficiency
// - Morphing encodes arsenal stability
```

## MCP Tools

The system exposes tools for agentic automation:

```javascript
import { registerTools } from '@vib3/sdk/sports/tools';

// Register with MCP server
registerTools(mcpServer);

// Available tools:
// - analyze_pitcher: Arsenal topology analysis
// - analyze_umpire: Zone hull computation
// - compute_tunnel_scores: Tunneling analysis
// - find_value_bets: Value identification
// - optimize_kelly: Bet sizing
// - generate_player_visualization: VIB3+ params
// - compute_defensive_coverage: Voronoi analysis
```

## Key Metrics

### Geometric Alpha Sources

| Feature | Market | Insight |
|---------|--------|---------|
| Tunnel Efficiency | Strikeouts, ERA | High tunneling → soft contact |
| Zone Expansion | Totals (Under) | Large zone → fewer runs |
| Zone Centroid | Pitcher matchups | Low zone → sinkerball advantage |
| Seam Exposure | Batter hits | High exposure → more hits |
| Arsenal Stability | Game spreads | Instability → high variance |

### Validation Metrics

- **CLV% (Closing Line Value)**: Primary edge validation metric
- **ROI**: Return on investment
- **Sharpe Ratio**: Risk-adjusted returns
- **Max Drawdown**: Peak-to-trough bankroll loss

## References

- Topological Data Analysis: Carlsson, G. (2009)
- Kelly Criterion: Kelly, J.L. (1956)
- Run Expectancy Matrix: Tango, Lichtman, Dolphin (2007)
- Pitch Tunneling: Baseball Savant methodology

---

**Geometric Alpha** - Where the shape of data reveals the edge.

*Part of the VIB3+ Unified Visualization Engine*
