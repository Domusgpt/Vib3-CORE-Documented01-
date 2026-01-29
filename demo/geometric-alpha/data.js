/**
 * Sample MLB Betting Data for Geometric Alpha Demo
 *
 * This data simulates realistic betting opportunities with:
 * - Actual MLB team matchups
 * - Realistic odds and probabilities
 * - Varying confidence levels
 * - Different edge scenarios
 */

// Sample MLB Games (realistic 2024 season matchups)
const SAMPLE_MLB_GAMES = [
    {
        gameId: 'NYY-BOS-20240615',
        homeTeam: 'BOS',
        awayTeam: 'NYY',
        homeTeamFull: 'Boston Red Sox',
        awayTeamFull: 'New York Yankees',
        startTime: '2024-06-15T19:10:00Z',
        venue: 'Fenway Park',
        // Moneyline odds
        homeOdds: 105,      // +105
        awayOdds: -125,     // -125
        // Model predictions
        homeWinProb: 0.48,  // Model says 48% home win
        awayWinProb: 0.52,
        // Totals
        totalLine: 9.5,
        overOdds: -110,
        underOdds: -110,
        modelTotal: 9.8,    // Model projects 9.8 runs
        // Context
        homePitcher: 'Tanner Houck',
        awayPitcher: 'Gerrit Cole',
        weather: 'Clear, 72°F'
    },
    {
        gameId: 'LAD-SF-20240615',
        homeTeam: 'SF',
        awayTeam: 'LAD',
        homeTeamFull: 'San Francisco Giants',
        awayTeamFull: 'Los Angeles Dodgers',
        startTime: '2024-06-15T21:45:00Z',
        venue: 'Oracle Park',
        homeOdds: 145,
        awayOdds: -165,
        homeWinProb: 0.42,
        awayWinProb: 0.58,
        totalLine: 7.5,
        overOdds: -105,
        underOdds: -115,
        modelTotal: 7.2,
        homePitcher: 'Logan Webb',
        awayPitcher: 'Yoshinobu Yamamoto',
        weather: 'Fog, 58°F'
    },
    {
        gameId: 'HOU-TEX-20240615',
        homeTeam: 'TEX',
        awayTeam: 'HOU',
        homeTeamFull: 'Texas Rangers',
        awayTeamFull: 'Houston Astros',
        startTime: '2024-06-15T20:05:00Z',
        venue: 'Globe Life Field',
        homeOdds: -105,
        awayOdds: -115,
        homeWinProb: 0.51,
        awayWinProb: 0.49,
        totalLine: 8.5,
        overOdds: -108,
        underOdds: -112,
        modelTotal: 9.1,
        homePitcher: 'Nathan Eovaldi',
        awayPitcher: 'Framber Valdez',
        weather: 'Dome, 72°F'
    },
    {
        gameId: 'ATL-PHI-20240615',
        homeTeam: 'PHI',
        awayTeam: 'ATL',
        homeTeamFull: 'Philadelphia Phillies',
        awayTeamFull: 'Atlanta Braves',
        startTime: '2024-06-15T18:05:00Z',
        venue: 'Citizens Bank Park',
        homeOdds: -130,
        awayOdds: 110,
        homeWinProb: 0.58,
        awayWinProb: 0.42,
        totalLine: 9.0,
        overOdds: -115,
        underOdds: -105,
        modelTotal: 9.3,
        homePitcher: 'Zack Wheeler',
        awayPitcher: 'Spencer Strider',
        weather: 'Partly Cloudy, 78°F'
    },
    {
        gameId: 'SD-ARI-20240615',
        homeTeam: 'ARI',
        awayTeam: 'SD',
        homeTeamFull: 'Arizona Diamondbacks',
        awayTeamFull: 'San Diego Padres',
        startTime: '2024-06-15T21:40:00Z',
        venue: 'Chase Field',
        homeOdds: -120,
        awayOdds: 100,
        homeWinProb: 0.53,
        awayWinProb: 0.47,
        totalLine: 9.0,
        overOdds: -110,
        underOdds: -110,
        modelTotal: 9.5,
        homePitcher: 'Zac Gallen',
        awayPitcher: 'Yu Darvish',
        weather: 'Dome, 78°F'
    }
];

/**
 * Convert American odds to implied probability
 */
function americanToProb(odds) {
    if (odds > 0) {
        return 100 / (odds + 100);
    } else {
        return Math.abs(odds) / (Math.abs(odds) + 100);
    }
}

/**
 * Generate betting opportunities from game data
 */
function generateOpportunities(games, config = {}) {
    const {
        includeMoneyline = true,
        includeTotals = true,
        addNoise = true
    } = config;

    const opportunities = [];

    for (const game of games) {
        // Moneyline opportunities
        if (includeMoneyline) {
            const homeImplied = americanToProb(game.homeOdds);
            const awayImplied = americanToProb(game.awayOdds);

            // Home moneyline
            const homeEdge = game.homeWinProb - homeImplied;
            if (Math.abs(homeEdge) > 0.01) {
                opportunities.push({
                    gameId: game.gameId,
                    betType: 'moneyline',
                    side: 'home',
                    team: game.homeTeam,
                    teamFull: game.homeTeamFull,
                    opponent: game.awayTeamFull,
                    odds: game.homeOdds,
                    modelProb: game.homeWinProb + (addNoise ? (Math.random() - 0.5) * 0.02 : 0),
                    impliedProb: homeImplied,
                    edge: homeEdge,
                    confidence: 0.5 + Math.random() * 0.4,
                    venue: game.venue,
                    pitcher: game.homePitcher,
                    startTime: game.startTime
                });
            }

            // Away moneyline
            const awayEdge = game.awayWinProb - awayImplied;
            if (Math.abs(awayEdge) > 0.01) {
                opportunities.push({
                    gameId: game.gameId,
                    betType: 'moneyline',
                    side: 'away',
                    team: game.awayTeam,
                    teamFull: game.awayTeamFull,
                    opponent: game.homeTeamFull,
                    odds: game.awayOdds,
                    modelProb: game.awayWinProb + (addNoise ? (Math.random() - 0.5) * 0.02 : 0),
                    impliedProb: awayImplied,
                    edge: awayEdge,
                    confidence: 0.5 + Math.random() * 0.4,
                    venue: game.venue,
                    pitcher: game.awayPitcher,
                    startTime: game.startTime
                });
            }
        }

        // Totals opportunities
        if (includeTotals) {
            const overImplied = americanToProb(game.overOdds);
            const underImplied = americanToProb(game.underOdds);

            // Calculate over/under probability based on model total
            const totalDiff = game.modelTotal - game.totalLine;
            const overProb = 0.5 + totalDiff * 0.15; // Simplified conversion

            // Over
            const overEdge = overProb - overImplied;
            if (Math.abs(overEdge) > 0.01) {
                opportunities.push({
                    gameId: game.gameId,
                    betType: 'total',
                    side: 'over',
                    team: `${game.awayTeam}@${game.homeTeam}`,
                    teamFull: `${game.awayTeamFull} @ ${game.homeTeamFull}`,
                    line: game.totalLine,
                    odds: game.overOdds,
                    modelProb: Math.min(0.65, Math.max(0.35, overProb + (addNoise ? (Math.random() - 0.5) * 0.02 : 0))),
                    impliedProb: overImplied,
                    edge: overEdge,
                    confidence: 0.45 + Math.random() * 0.35,
                    venue: game.venue,
                    modelTotal: game.modelTotal,
                    startTime: game.startTime
                });
            }

            // Under
            const underEdge = (1 - overProb) - underImplied;
            if (Math.abs(underEdge) > 0.01) {
                opportunities.push({
                    gameId: game.gameId,
                    betType: 'total',
                    side: 'under',
                    team: `${game.awayTeam}@${game.homeTeam}`,
                    teamFull: `${game.awayTeamFull} @ ${game.homeTeamFull}`,
                    line: game.totalLine,
                    odds: game.underOdds,
                    modelProb: Math.min(0.65, Math.max(0.35, 1 - overProb + (addNoise ? (Math.random() - 0.5) * 0.02 : 0))),
                    impliedProb: underImplied,
                    edge: underEdge,
                    confidence: 0.45 + Math.random() * 0.35,
                    venue: game.venue,
                    modelTotal: game.modelTotal,
                    startTime: game.startTime
                });
            }
        }
    }

    return opportunities;
}

/**
 * Preset opportunity scenarios for demonstration
 */
const SCENARIO_PRESETS = {
    // Strong edge scenario - should trigger STABLE_EDGE
    strongEdge: [
        {
            gameId: 'DEMO-STRONG-1',
            betType: 'moneyline',
            side: 'home',
            team: 'NYY',
            teamFull: 'New York Yankees',
            opponent: 'Boston Red Sox',
            odds: 120,
            modelProb: 0.52,
            impliedProb: 0.455,
            edge: 0.065,
            confidence: 0.78,
            venue: 'Yankee Stadium'
        },
        {
            gameId: 'DEMO-STRONG-2',
            betType: 'moneyline',
            side: 'away',
            team: 'LAD',
            teamFull: 'Los Angeles Dodgers',
            opponent: 'San Francisco Giants',
            odds: -140,
            modelProb: 0.62,
            impliedProb: 0.583,
            edge: 0.037,
            confidence: 0.72,
            venue: 'Oracle Park'
        }
    ],

    // Emerging edge - should trigger EMERGING_EDGE
    emergingEdge: [
        {
            gameId: 'DEMO-EMERGE-1',
            betType: 'moneyline',
            side: 'home',
            team: 'ATL',
            teamFull: 'Atlanta Braves',
            opponent: 'Philadelphia Phillies',
            odds: 105,
            modelProb: 0.51,
            impliedProb: 0.488,
            edge: 0.022,
            confidence: 0.58,
            venue: 'Truist Park'
        }
    ],

    // Time pressure - should trigger CLOSING_WINDOW
    closingWindow: [
        {
            gameId: 'DEMO-CLOSE-1',
            betType: 'total',
            side: 'over',
            team: 'HOU@TEX',
            teamFull: 'Houston Astros @ Texas Rangers',
            line: 8.5,
            odds: -105,
            modelProb: 0.56,
            impliedProb: 0.512,
            edge: 0.048,
            confidence: 0.68,
            venue: 'Globe Life Field',
            minutesToClose: 3  // Only 3 minutes!
        }
    ],

    // Correlated bets - should trigger CORRELATED_CLUSTER
    correlated: [
        {
            gameId: 'DEMO-CORR-1',
            betType: 'moneyline',
            side: 'home',
            team: 'CHC',
            teamFull: 'Chicago Cubs',
            opponent: 'St. Louis Cardinals',
            odds: -110,
            modelProb: 0.54,
            impliedProb: 0.524,
            edge: 0.016,
            confidence: 0.62,
            venue: 'Wrigley Field'
        },
        {
            gameId: 'DEMO-CORR-1',  // Same game!
            betType: 'total',
            side: 'over',
            team: 'STL@CHC',
            teamFull: 'St. Louis Cardinals @ Chicago Cubs',
            line: 9.0,
            odds: -108,
            modelProb: 0.55,
            impliedProb: 0.519,
            edge: 0.031,
            confidence: 0.60,
            venue: 'Wrigley Field'
        }
    ],

    // No edge - should trigger EFFICIENT_MARKET
    efficient: [
        {
            gameId: 'DEMO-EFF-1',
            betType: 'moneyline',
            side: 'home',
            team: 'MIA',
            teamFull: 'Miami Marlins',
            opponent: 'Washington Nationals',
            odds: -105,
            modelProb: 0.513,
            impliedProb: 0.512,
            edge: 0.001,
            confidence: 0.55,
            venue: 'loanDepot Park'
        }
    ],

    // Low confidence - should trigger UNSTABLE_CHAOS
    chaos: [
        {
            gameId: 'DEMO-CHAOS-1',
            betType: 'moneyline',
            side: 'away',
            team: 'COL',
            teamFull: 'Colorado Rockies',
            opponent: 'Arizona Diamondbacks',
            odds: 180,
            modelProb: 0.42,
            impliedProb: 0.357,
            edge: 0.063,
            confidence: 0.35,  // Very low confidence!
            venue: 'Chase Field'
        }
    ]
};

/**
 * Simulate market movement (odds changing over time)
 */
function simulateMarketMovement(opportunities, intensity = 0.5) {
    return opportunities.map(opp => {
        const newOpp = { ...opp };

        // Randomly adjust model probability (simulating new information)
        const probDelta = (Math.random() - 0.5) * 0.03 * intensity;
        newOpp.modelProb = Math.max(0.1, Math.min(0.9, opp.modelProb + probDelta));

        // Randomly adjust implied probability (market movement)
        const impliedDelta = (Math.random() - 0.5) * 0.02 * intensity;
        newOpp.impliedProb = Math.max(0.1, Math.min(0.9, opp.impliedProb + impliedDelta));

        // Recalculate edge
        newOpp.edge = newOpp.modelProb - newOpp.impliedProb;

        // Adjust confidence based on consistency
        if (Math.sign(newOpp.edge) === Math.sign(opp.edge)) {
            // Edge direction consistent - increase confidence
            newOpp.confidence = Math.min(0.95, opp.confidence + 0.02 * intensity);
        } else {
            // Edge direction changed - decrease confidence
            newOpp.confidence = Math.max(0.3, opp.confidence - 0.05 * intensity);
        }

        return newOpp;
    });
}

/**
 * Generate random opportunities for testing
 */
function generateRandomOpportunities(count = 5) {
    const teams = ['NYY', 'BOS', 'LAD', 'SF', 'HOU', 'TEX', 'ATL', 'PHI', 'SD', 'ARI', 'CHC', 'STL', 'MIN', 'CLE'];
    const opportunities = [];

    for (let i = 0; i < count; i++) {
        const homeIdx = Math.floor(Math.random() * teams.length);
        let awayIdx = Math.floor(Math.random() * teams.length);
        while (awayIdx === homeIdx) {
            awayIdx = Math.floor(Math.random() * teams.length);
        }

        const modelProb = 0.35 + Math.random() * 0.3;
        const impliedProb = modelProb + (Math.random() - 0.5) * 0.1;

        opportunities.push({
            gameId: `RANDOM-${i}-${Date.now()}`,
            betType: Math.random() > 0.5 ? 'moneyline' : 'total',
            side: Math.random() > 0.5 ? 'home' : 'away',
            team: teams[homeIdx],
            teamFull: `${teams[homeIdx]} Team`,
            opponent: `${teams[awayIdx]} Team`,
            odds: Math.round((Math.random() - 0.5) * 200),
            modelProb,
            impliedProb,
            edge: modelProb - impliedProb,
            confidence: 0.4 + Math.random() * 0.5,
            venue: 'Demo Stadium'
        });
    }

    return opportunities;
}

// Export for use in other scripts
window.SAMPLE_MLB_GAMES = SAMPLE_MLB_GAMES;
window.SCENARIO_PRESETS = SCENARIO_PRESETS;
window.generateOpportunities = generateOpportunities;
window.simulateMarketMovement = simulateMarketMovement;
window.generateRandomOpportunities = generateRandomOpportunities;
window.americanToProb = americanToProb;
