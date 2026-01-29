/**
 * Geometric Alpha Sports Analytics Engine - TypeScript Type Definitions
 *
 * Comprehensive type definitions for all modules in the Geometric Alpha system.
 * These types provide compile-time safety and enhanced IDE support.
 *
 * @module GeometricAlphaTypes
 * @version 2.0.0
 */

// ============================================================================
// CORE DATA TYPES
// ============================================================================

/**
 * MLB Team abbreviations (all 30 teams)
 */
export type MLBTeam =
    | 'ARI' | 'ATL' | 'BAL' | 'BOS' | 'CHC' | 'CHW' | 'CIN' | 'CLE'
    | 'COL' | 'DET' | 'HOU' | 'KC' | 'LAA' | 'LAD' | 'MIA' | 'MIL'
    | 'MIN' | 'NYM' | 'NYY' | 'OAK' | 'PHI' | 'PIT' | 'SD' | 'SF'
    | 'SEA' | 'STL' | 'TB' | 'TEX' | 'TOR' | 'WSH';

/**
 * Pitch type codes from Statcast
 */
export type PitchType =
    | 'FF' // Four-seam fastball
    | 'SI' // Sinker
    | 'FC' // Cutter
    | 'SL' // Slider
    | 'CU' // Curveball
    | 'KC' // Knuckle-curve
    | 'CH' // Changeup
    | 'FS' // Splitter
    | 'KN' // Knuckleball
    | 'EP' // Eephus
    | 'SC' // Screwball
    | 'ST' // Sweeper
    | 'SV' // Slurve
    | 'CS' // Slow curve
    | 'FA' // Fastball (generic)
    | 'PO' // Pitchout
    | 'IN' // Intentional ball
    | 'UN'; // Unknown

/**
 * Handedness for pitchers and batters
 */
export type Handedness = 'L' | 'R' | 'S'; // Left, Right, Switch

/**
 * Bet types supported by the system
 */
export type BetType = 'moneyline' | 'total' | 'spread' | 'prop' | 'parlay';

/**
 * Bet side (which team or outcome)
 */
export type BetSide = 'home' | 'away' | 'over' | 'under';

/**
 * Order/bet status
 */
export type BetStatus = 'open' | 'settled' | 'cancelled' | 'voided';

// ============================================================================
// PITCH & PLAYER DATA
// ============================================================================

/**
 * Normalized pitch data from Statcast
 */
export interface StatcastPitch {
    // Identifiers
    game_pk: number;
    at_bat_number: number;
    pitch_number: number;
    game_date: string;

    // Players
    pitcher: number;
    batter: number;
    pitcher_name: string;
    batter_name: string;

    // Pitch classification
    pitch_type: PitchType;
    type: 'B' | 'S' | 'X'; // Ball, Strike, In-play
    description: string;
    events: string | null;

    // Kinematics
    release_speed: number | null;
    release_spin_rate: number | null;
    release_extension: number | null;

    // Initial velocity components (ft/s)
    vx0: number | null;
    vy0: number | null;
    vz0: number | null;

    // Acceleration components (ft/s²)
    ax: number | null;
    ay: number | null;
    az: number | null;

    // Release point (feet)
    release_pos_x: number | null;
    release_pos_y: number;
    release_pos_z: number | null;

    // Movement (inches)
    pfx_x: number | null;
    pfx_z: number | null;

    // Plate location (feet from center)
    plate_x: number | null;
    plate_z: number | null;
    sz_top: number | null;
    sz_bot: number | null;

    // Batted ball
    hc_x: number | null;
    hc_y: number | null;
    hit_distance_sc: number | null;
    launch_speed: number | null;
    launch_angle: number | null;

    // Game context
    balls: number;
    strikes: number;
    outs_when_up: number;
    inning: number;
    inning_topbot: 'Top' | 'Bot';
    on_1b: number | null;
    on_2b: number | null;
    on_3b: number | null;

    // Teams
    home_team: MLBTeam;
    away_team: MLBTeam;

    // Umpire & handedness
    umpire: string;
    p_throws: Handedness;
    stand: Handedness;

    // Spin
    spin_axis: number | null;

    // Imputation metadata
    _imputation?: 'physics' | 'knn' | 'fallback' | 'back-calc';
    _spin_imputed?: boolean;
    _spin_fallback?: boolean;
}

/**
 * 3D vector for geometric calculations
 */
export interface Vector3D {
    x: number;
    y: number;
    z: number;
}

/**
 * 2D point for spray charts, zone analysis
 */
export interface Point2D {
    x: number;
    y: number;
    idx?: number;
}

// ============================================================================
// GEOMETRIC FEATURE TYPES
// ============================================================================

/**
 * Pitch tunnel analysis result
 */
export interface TunnelAnalysis {
    pitcherId: number;
    pairKey: string;
    typeA: PitchType;
    typeB: PitchType;

    // Angular divergence metrics
    tunnelAngle: number;       // Degrees at tunnel point
    plateAngle: number;        // Degrees at plate
    angularTunnelScore: number;

    // Trajectory data
    trajectoryA: Vector3D[];
    trajectoryB: Vector3D[];

    // Classification
    isTrueTunnel: boolean;     // < 0.2° at tunnel
    tunnelEfficiency: number;  // 0-1 score

    // Sample sizes
    samplesA: number;
    samplesB: number;
}

/**
 * Umpire strike zone convex hull
 */
export interface UmpireZone {
    umpireId: string;
    umpireName: string;

    // Hull vertices (2D plate coordinates)
    vertices: Point2D[];

    // Zone metrics
    area: number;              // Square feet
    centroid: Point2D;

    // Bias metrics
    horizontalBias: number;    // Positive = favors inside
    verticalBias: number;      // Positive = favors high

    // Split zones (LHB vs RHB)
    lhbZone?: UmpireZone;
    rhbZone?: UmpireZone;

    // Sample size
    calledStrikes: number;
    totalCalls: number;
}

/**
 * Defensive Voronoi tessellation
 */
export interface DefensiveVoronoi {
    gameId: string;
    inning: number;

    // Fielder positions
    fielderPositions: Map<number, Point2D>;

    // Voronoi cells
    cells: VoronoiCell[];

    // Gap analysis
    gaps: VoronoiGap[];
    totalGapArea: number;

    // Methods
    distanceToNearestEdge(point: Point2D): number;
    getResponsibleFielder(point: Point2D): number;
}

export interface VoronoiCell {
    fielderId: number;
    vertices: Point2D[];
    area: number;
    centroid: Point2D;
}

export interface VoronoiGap {
    vertices: Point2D[];
    area: number;
    adjacentFielders: number[];
}

/**
 * Arsenal topology (TDA) analysis
 */
export interface ArsenalTopology {
    pitcherId: number;
    asOfDate: string;

    // Topological features
    connectedComponents: number;
    persistencePoints: PersistencePoint[];

    // Cluster analysis
    clusters: ArsenalCluster[];

    // Stability metrics
    stabilityScore: number;
    instabilityAlerts: InstabilityAlert[];

    // Rolling window metadata
    windowSize: number;
    pitchesAnalyzed: number;
}

export interface PersistencePoint {
    birth: number;
    death: number;
    dimension: number;
    persistence: number;
}

export interface ArsenalCluster {
    pitchType: PitchType;
    centroid: Vector3D;
    variance: number;
    intraVariance: number;
    pitchCount: number;
}

export interface InstabilityAlert {
    type: 'high_variance' | 'dumbbell' | 'drift' | 'missing_pitch';
    pitchType?: PitchType;
    message: string;
    severity: 'low' | 'medium' | 'high';
}

// ============================================================================
// BETTING & ODDS TYPES
// ============================================================================

/**
 * Parsed odds data for a game
 */
export interface GameOdds {
    gameId: string;
    sportKey: string;
    commenceTime: string;
    homeTeam: string;
    awayTeam: string;

    // Per-bookmaker odds
    bookmakers: Record<string, BookmakerOdds>;

    // Consensus odds
    consensus: ConsensusOdds;
}

export interface BookmakerOdds {
    name: string;
    lastUpdate: string;
    markets: {
        h2h?: MarketOdds;
        totals?: MarketOdds;
        spreads?: MarketOdds;
    };
}

export interface MarketOdds {
    key: string;
    outcomes: Record<string, OutcomeOdds>;
}

export interface OutcomeOdds {
    name: string;
    price: number;      // American odds
    point?: number;     // Line (for totals/spreads)
}

export interface ConsensusOdds {
    h2h: {
        homeOdds: number | null;
        awayOdds: number | null;
    };
    totals: {
        line: number | null;
        overOdds: number | null;
        underOdds: number | null;
    };
    spreads: {
        line: number | null;
        homeOdds: number | null;
        awayOdds: number | null;
    };
}

/**
 * Betting opportunity identified by the engine
 */
export interface BettingOpportunity {
    gameId: string;
    betType: BetType;
    side: BetSide;
    team?: string;

    // Probabilities
    modelProb: number;          // Our model's probability
    impliedProb: number;        // Market implied probability
    edge: number;               // modelProb - impliedProb

    // Odds
    odds: number;               // American odds
    line?: number;              // For totals/spreads

    // Sizing
    kellyFraction: number;      // Raw Kelly
    adjustedFraction: number;   // After risk adjustments

    // Confidence
    confidence: number;         // 0-1 model confidence
    featureContributions?: Record<string, number>;
}

/**
 * Bet order placed with paper trader
 */
export interface BetOrder {
    orderId: string;
    gameId: string;
    betType: BetType;
    side: BetSide;
    team?: string;

    // Bet details
    line?: number;
    odds: number;
    amount: number;

    // Model info
    modelProb: number;
    edge: number;
    fraction: number;

    // Status
    status: BetStatus;
    placedAt: number;
    settledAt: number | null;
    cancelledAt?: number;

    // Settlement
    result?: GameResult;
    won: boolean | null;
    payout: number;
    profit?: number;
    clv?: number;               // Closing line value
    closingOdds?: number;
}

export interface GameResult {
    homeScore: number;
    awayScore: number;
    totalRuns?: number;
}

// ============================================================================
// KELLY & PORTFOLIO TYPES
// ============================================================================

/**
 * Kelly criterion calculation result
 */
export interface KellyResult {
    fraction: number;           // Optimal fraction
    edge: number;              // Expected edge
    expectedGrowth: number;    // Log growth rate

    // Adjusted fractions
    halfKelly: number;
    quarterKelly: number;

    // Risk metrics
    probabilityOfRuin: number;
    maxDrawdown: number;
}

/**
 * Portfolio allocation after optimization
 */
export interface PortfolioAllocation {
    opportunity: BettingOpportunity;
    fraction: number;
    dollarAmount: number;
    expectedValue: number;
    riskContribution: number;
}

/**
 * Covariance matrix for correlated bets
 */
export interface CovarianceMatrix {
    opportunities: string[];    // Game IDs
    matrix: number[][];        // Symmetric covariance
    correlations: number[][];  // Correlation matrix
    isPositiveSemiDefinite: boolean;
}

// ============================================================================
// BACKTEST TYPES
// ============================================================================

/**
 * Backtest configuration
 */
export interface BacktestConfig {
    startDate: string;
    endDate: string;
    initialBankroll: number;

    // Strategy parameters
    kellyMultiplier: number;
    maxBetFraction: number;
    minEdge: number;
    minConfidence: number;

    // Risk limits
    maxDailyBets: number;
    maxExposurePerGame: number;
    stopLossPercent: number;
}

/**
 * Backtest results
 */
export interface BacktestResults {
    config: BacktestConfig;

    // Performance
    finalBankroll: number;
    netProfit: number;
    roi: number;
    roiPercent: string;

    // Win/loss
    totalBets: number;
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;

    // Risk metrics
    sharpeRatio: number;
    maxDrawdown: number;
    maxDrawdownPercent: string;
    calmarRatio: number;

    // CLV analysis
    avgCLV: number;
    avgCLVPercent: string;
    clvCorrelation: number;

    // Daily breakdown
    dailyResults: DailyResult[];
    equityCurve: EquityPoint[];

    // Bet log
    bets: BetOrder[];
}

export interface DailyResult {
    date: string;
    bets: number;
    wins: number;
    losses: number;
    profit: number;
    bankroll: number;
}

export interface EquityPoint {
    timestamp: number;
    bankroll: number;
    drawdown: number;
}

// ============================================================================
// PHYSICS & PARK FACTORS
// ============================================================================

/**
 * Physics constants for trajectory calculations
 */
export interface PhysicsConstants {
    gravity: number;            // ft/s² (negative = down)
    airDensity: number;        // lb/ft³
    ballMass: number;          // lb
    ballRadius: number;        // ft
    dragCoeff: number;         // Dimensionless
    magnusCoeff: number;       // Empirical Magnus coefficient

    // Altitude adjustments
    altitude: number;          // feet above sea level
    altitudeMultiplier: number; // Air density multiplier
}

/**
 * MLB park factors
 */
export interface ParkFactors {
    venue: string;
    team: MLBTeam;

    // Location
    altitude: number;          // Feet above sea level
    latitude: number;
    longitude: number;

    // Dimensions (feet)
    leftField: number;
    leftCenter: number;
    center: number;
    rightCenter: number;
    rightField: number;

    // Wall heights (feet)
    leftWall: number;
    centerWall: number;
    rightWall: number;

    // Park factors (100 = neutral)
    runFactor: number;
    hrFactor: number;
    hitFactor: number;

    // Handedness splits
    lhbHrFactor: number;
    rhbHrFactor: number;

    // Environmental
    roofType: 'open' | 'retractable' | 'dome';
    surfaceType: 'grass' | 'turf';

    // Physics adjustments
    airDensityMultiplier: number;
    carryFactor: number;
}

// ============================================================================
// ENGINE CONFIGURATION
// ============================================================================

/**
 * Main engine configuration
 */
export interface GeometricAlphaConfig {
    // Data sources
    statcastPath?: string;
    oddsApiKey?: string;

    // Physics
    physics: PhysicsConstants;
    useAltitudeAdjustment: boolean;

    // Feature engineering
    tunnelConfig: TunnelConfig;
    topologyConfig: TopologyConfig;

    // Prediction
    modelConfig: ModelConfig;

    // Betting
    kellyConfig: KellyConfig;
    riskConfig: RiskConfig;

    // Misc
    randomSeed?: number;
    verbose: boolean;
}

export interface TunnelConfig {
    tunnelPlaneDistance: number;    // Feet from plate
    foveaResolution: number;        // Degrees
    trueTunnelThreshold: number;    // Degrees
    minSamplesPerType: number;
}

export interface TopologyConfig {
    rollingWindowSize: number;      // Pitches
    persistenceThreshold: number;
    clusteringEpsilon: number;
    minClusterSize: number;
}

export interface ModelConfig {
    numTrees: number;
    maxDepth: number;
    minSamplesLeaf: number;
    learningRate: number;
    subsampleRate: number;
    featureSubsampleRate: number;
    earlyStopping: boolean;
    patience: number;
}

export interface KellyConfig {
    multiplier: number;             // Fraction of Kelly (0.25 = quarter Kelly)
    maxFraction: number;            // Cap on any single bet
    minEdge: number;                // Minimum edge to bet
}

export interface RiskConfig {
    maxDailyExposure: number;       // Fraction of bankroll
    maxGameExposure: number;        // Fraction of bankroll per game
    maxCorrelatedExposure: number;  // For same-team bets
    stopLossPercent: number;        // Daily stop loss
    streakReduction: number;        // Reduce sizing after losses
}

// ============================================================================
// API RESPONSES
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
}

/**
 * Prediction response from engine
 */
export interface PredictionResponse {
    gameId: string;
    homeTeam: string;
    awayTeam: string;

    // Probabilities
    homeWinProb: number;
    awayWinProb: number;
    totalProjected: number;

    // Opportunities
    opportunities: BettingOpportunity[];

    // Feature contributions
    topFeatures: FeatureContribution[];

    // Confidence
    modelConfidence: number;
    dataQuality: number;
}

export interface FeatureContribution {
    feature: string;
    value: number;
    contribution: number;
    direction: 'positive' | 'negative';
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // Re-export all types for convenience
    MLBTeam,
    PitchType,
    Handedness,
    BetType,
    BetSide,
    BetStatus,
    StatcastPitch,
    Vector3D,
    Point2D,
    TunnelAnalysis,
    UmpireZone,
    DefensiveVoronoi,
    ArsenalTopology,
    GameOdds,
    BettingOpportunity,
    BetOrder,
    KellyResult,
    PortfolioAllocation,
    BacktestResults,
    PhysicsConstants,
    ParkFactors,
    GeometricAlphaConfig
};
