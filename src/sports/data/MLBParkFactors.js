/**
 * MLB Park Factors Database
 *
 * Complete database of all 30 MLB venues with:
 * - Physical dimensions
 * - Altitude and location
 * - Park factors (runs, HR, hits)
 * - Environmental characteristics
 * - Physics adjustments for trajectory calculations
 *
 * Data sources:
 * - ESPN Park Factors (2019-2024 averages)
 * - Baseball Savant environmental data
 * - Official MLB stadium specifications
 *
 * @module MLBParkFactors
 * @version 1.0.0
 */

/**
 * Complete MLB Park Factors Database
 * All values are 5-year rolling averages (2019-2024, excluding 2020 shortened season)
 *
 * Park Factor Scale:
 * - 100 = League average
 * - >100 = Favors offense (more runs/hits/HRs)
 * - <100 = Favors pitching (fewer runs/hits/HRs)
 */
export const MLB_PARK_FACTORS = {
    // ========================================================================
    // AMERICAN LEAGUE EAST
    // ========================================================================

    'BAL': {
        venue: 'Oriole Park at Camden Yards',
        team: 'BAL',
        city: 'Baltimore',
        state: 'MD',

        // Location
        altitude: 20,              // feet above sea level
        latitude: 39.2838,
        longitude: -76.6218,

        // Dimensions (feet)
        leftField: 333,
        leftCenter: 364,
        center: 400,
        rightCenter: 373,
        rightField: 318,

        // Wall heights (feet)
        leftWall: 7,
        centerWall: 7,
        rightWall: 21,             // Famous warehouse wall

        // Park factors (100 = neutral)
        runFactor: 101,
        hrFactor: 112,             // HR-friendly, especially to left
        hitFactor: 99,

        // Handedness splits
        lhbHrFactor: 105,
        rhbHrFactor: 118,          // Short right field porch

        // Environmental
        roofType: 'open',
        surfaceType: 'grass',

        // Physics adjustments
        airDensityMultiplier: 1.00,
        carryFactor: 1.00
    },

    'BOS': {
        venue: 'Fenway Park',
        team: 'BOS',
        city: 'Boston',
        state: 'MA',

        altitude: 21,
        latitude: 39.3467,
        longitude: -71.0972,

        leftField: 310,            // Short left field
        leftCenter: 379,
        center: 390,
        rightCenter: 380,
        rightField: 302,           // Pesky's Pole

        leftWall: 37,              // Green Monster
        centerWall: 17,
        rightWall: 3,

        runFactor: 104,
        hrFactor: 96,              // Monster suppresses HRs to left
        hitFactor: 108,            // Extra doubles off Monster

        lhbHrFactor: 108,          // Short right field
        rhbHrFactor: 88,           // Monster effect

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 1.00,
        carryFactor: 0.98          // Ocean air can be heavy
    },

    'NYY': {
        venue: 'Yankee Stadium',
        team: 'NYY',
        city: 'Bronx',
        state: 'NY',

        altitude: 55,
        latitude: 40.8296,
        longitude: -73.9262,

        leftField: 318,
        leftCenter: 399,
        center: 408,
        rightCenter: 385,
        rightField: 314,           // Short porch

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 104,
        hrFactor: 116,             // Very HR-friendly
        hitFactor: 99,

        lhbHrFactor: 121,          // Short right porch
        rhbHrFactor: 111,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 1.00,
        carryFactor: 1.02          // Good carry to right
    },

    'TB': {
        venue: 'Tropicana Field',
        team: 'TB',
        city: 'St. Petersburg',
        state: 'FL',

        altitude: 9,
        latitude: 27.7682,
        longitude: -82.6534,

        leftField: 315,
        leftCenter: 370,
        center: 404,
        rightCenter: 370,
        rightField: 322,

        leftWall: 9.5,
        centerWall: 9.5,
        rightWall: 9.5,

        runFactor: 95,
        hrFactor: 92,              // Dome suppresses HR
        hitFactor: 97,

        lhbHrFactor: 94,
        rhbHrFactor: 90,

        roofType: 'dome',          // Fixed dome
        surfaceType: 'turf',

        airDensityMultiplier: 1.02, // Climate controlled
        carryFactor: 0.95          // Dome effect
    },

    'TOR': {
        venue: 'Rogers Centre',
        team: 'TOR',
        city: 'Toronto',
        state: 'ON',

        altitude: 269,
        latitude: 43.6414,
        longitude: -79.3894,

        leftField: 328,
        leftCenter: 375,
        center: 400,
        rightCenter: 375,
        rightField: 328,

        leftWall: 10,
        centerWall: 10,
        rightWall: 10,

        runFactor: 100,
        hrFactor: 103,
        hitFactor: 99,

        lhbHrFactor: 102,
        rhbHrFactor: 104,

        roofType: 'retractable',
        surfaceType: 'turf',

        airDensityMultiplier: 1.01,
        carryFactor: 0.98
    },

    // ========================================================================
    // AMERICAN LEAGUE CENTRAL
    // ========================================================================

    'CHW': {
        venue: 'Guaranteed Rate Field',
        team: 'CHW',
        city: 'Chicago',
        state: 'IL',

        altitude: 595,
        latitude: 41.8299,
        longitude: -87.6338,

        leftField: 330,
        leftCenter: 377,
        center: 400,
        rightCenter: 372,
        rightField: 335,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 102,
        hrFactor: 108,
        hitFactor: 100,

        lhbHrFactor: 106,
        rhbHrFactor: 110,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.99,
        carryFactor: 1.01
    },

    'CLE': {
        venue: 'Progressive Field',
        team: 'CLE',
        city: 'Cleveland',
        state: 'OH',

        altitude: 653,
        latitude: 41.4962,
        longitude: -81.6852,

        leftField: 325,
        leftCenter: 370,
        center: 400,
        rightCenter: 375,
        rightField: 325,

        leftWall: 19,
        centerWall: 9,
        rightWall: 9,

        runFactor: 97,
        hrFactor: 97,
        hitFactor: 98,

        lhbHrFactor: 99,
        rhbHrFactor: 95,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.99,
        carryFactor: 0.99
    },

    'DET': {
        venue: 'Comerica Park',
        team: 'DET',
        city: 'Detroit',
        state: 'MI',

        altitude: 600,
        latitude: 42.3390,
        longitude: -83.0485,

        leftField: 345,
        leftCenter: 370,
        center: 420,
        rightCenter: 365,
        rightField: 330,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 95,
        hrFactor: 89,              // Very pitcher-friendly
        hitFactor: 98,

        lhbHrFactor: 92,
        rhbHrFactor: 86,           // Deep center hurts RHB

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.99,
        carryFactor: 0.97
    },

    'KC': {
        venue: 'Kauffman Stadium',
        team: 'KC',
        city: 'Kansas City',
        state: 'MO',

        altitude: 750,
        latitude: 39.0517,
        longitude: -94.4803,

        leftField: 330,
        leftCenter: 387,
        center: 410,
        rightCenter: 387,
        rightField: 330,

        leftWall: 9,
        centerWall: 9,
        rightWall: 9,

        runFactor: 99,
        hrFactor: 94,
        hitFactor: 100,

        lhbHrFactor: 96,
        rhbHrFactor: 92,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.98,
        carryFactor: 1.00
    },

    'MIN': {
        venue: 'Target Field',
        team: 'MIN',
        city: 'Minneapolis',
        state: 'MN',

        altitude: 815,
        latitude: 44.9817,
        longitude: -93.2776,

        leftField: 339,
        leftCenter: 377,
        center: 404,
        rightCenter: 367,
        rightField: 328,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 101,
        hrFactor: 104,
        hitFactor: 100,

        lhbHrFactor: 107,
        rhbHrFactor: 101,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.98,
        carryFactor: 1.02          // Higher altitude helps
    },

    // ========================================================================
    // AMERICAN LEAGUE WEST
    // ========================================================================

    'HOU': {
        venue: 'Minute Maid Park',
        team: 'HOU',
        city: 'Houston',
        state: 'TX',

        altitude: 43,
        latitude: 29.7573,
        longitude: -95.3555,

        leftField: 315,
        leftCenter: 362,
        center: 409,
        rightCenter: 373,
        rightField: 326,

        leftWall: 19,              // Crawford Boxes
        centerWall: 8,
        rightWall: 7,

        runFactor: 103,
        hrFactor: 111,             // Crawford Boxes
        hitFactor: 101,

        lhbHrFactor: 103,
        rhbHrFactor: 118,          // Short left field

        roofType: 'retractable',
        surfaceType: 'grass',

        airDensityMultiplier: 1.01,
        carryFactor: 1.03
    },

    'LAA': {
        venue: 'Angel Stadium',
        team: 'LAA',
        city: 'Anaheim',
        state: 'CA',

        altitude: 160,
        latitude: 33.8003,
        longitude: -117.8827,

        leftField: 330,
        leftCenter: 387,
        center: 400,
        rightCenter: 370,
        rightField: 330,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 97,
        hrFactor: 96,
        hitFactor: 98,

        lhbHrFactor: 98,
        rhbHrFactor: 94,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 1.00,
        carryFactor: 0.98          // Marine layer
    },

    'OAK': {
        venue: 'Oakland Coliseum',
        team: 'OAK',
        city: 'Oakland',
        state: 'CA',

        altitude: 22,
        latitude: 37.7516,
        longitude: -122.2005,

        leftField: 330,
        leftCenter: 388,
        center: 400,
        rightCenter: 388,
        rightField: 330,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 91,
        hrFactor: 85,              // Very pitcher-friendly
        hitFactor: 95,

        lhbHrFactor: 87,
        rhbHrFactor: 83,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 1.01,
        carryFactor: 0.92          // Heavy marine air
    },

    'SEA': {
        venue: 'T-Mobile Park',
        team: 'SEA',
        city: 'Seattle',
        state: 'WA',

        altitude: 14,
        latitude: 47.5914,
        longitude: -122.3326,

        leftField: 331,
        leftCenter: 378,
        center: 401,
        rightCenter: 381,
        rightField: 326,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 93,
        hrFactor: 90,
        hitFactor: 96,

        lhbHrFactor: 94,
        rhbHrFactor: 86,

        roofType: 'retractable',
        surfaceType: 'grass',

        airDensityMultiplier: 1.01,
        carryFactor: 0.94          // Marine layer + roof
    },

    'TEX': {
        venue: 'Globe Life Field',
        team: 'TEX',
        city: 'Arlington',
        state: 'TX',

        altitude: 551,
        latitude: 32.7473,
        longitude: -97.0845,

        leftField: 329,
        leftCenter: 372,
        center: 407,
        rightCenter: 374,
        rightField: 326,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 102,
        hrFactor: 107,
        hitFactor: 101,

        lhbHrFactor: 105,
        rhbHrFactor: 109,

        roofType: 'retractable',
        surfaceType: 'grass',

        airDensityMultiplier: 0.99,
        carryFactor: 1.02
    },

    // ========================================================================
    // NATIONAL LEAGUE EAST
    // ========================================================================

    'ATL': {
        venue: 'Truist Park',
        team: 'ATL',
        city: 'Atlanta',
        state: 'GA',

        altitude: 1050,
        latitude: 33.8907,
        longitude: -84.4677,

        leftField: 335,
        leftCenter: 385,
        center: 400,
        rightCenter: 375,
        rightField: 325,

        leftWall: 8,
        centerWall: 8,
        rightWall: 6,

        runFactor: 101,
        hrFactor: 107,
        hitFactor: 99,

        lhbHrFactor: 110,
        rhbHrFactor: 104,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.97,
        carryFactor: 1.04          // Higher altitude
    },

    'MIA': {
        venue: 'loanDepot park',
        team: 'MIA',
        city: 'Miami',
        state: 'FL',

        altitude: 7,
        latitude: 25.7781,
        longitude: -80.2197,

        leftField: 344,
        leftCenter: 386,
        center: 407,
        rightCenter: 392,
        rightField: 335,

        leftWall: 7,
        centerWall: 7,
        rightWall: 7,

        runFactor: 91,
        hrFactor: 82,              // One of the most pitcher-friendly
        hitFactor: 96,

        lhbHrFactor: 84,
        rhbHrFactor: 80,

        roofType: 'retractable',
        surfaceType: 'grass',

        airDensityMultiplier: 1.02,
        carryFactor: 0.90          // Humid, dense air
    },

    'NYM': {
        venue: 'Citi Field',
        team: 'NYM',
        city: 'Queens',
        state: 'NY',

        altitude: 12,
        latitude: 40.7571,
        longitude: -73.8458,

        leftField: 335,
        leftCenter: 379,
        center: 408,
        rightCenter: 375,
        rightField: 330,

        leftWall: 12,
        centerWall: 8,
        rightWall: 8,

        runFactor: 95,
        hrFactor: 94,
        hitFactor: 97,

        lhbHrFactor: 96,
        rhbHrFactor: 92,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 1.00,
        carryFactor: 0.97
    },

    'PHI': {
        venue: 'Citizens Bank Park',
        team: 'PHI',
        city: 'Philadelphia',
        state: 'PA',

        altitude: 20,
        latitude: 39.9061,
        longitude: -75.1665,

        leftField: 329,
        leftCenter: 374,
        center: 401,
        rightCenter: 369,
        rightField: 330,

        leftWall: 10,
        centerWall: 8,
        rightWall: 8,

        runFactor: 106,
        hrFactor: 115,             // One of the best HR parks
        hitFactor: 103,

        lhbHrFactor: 113,
        rhbHrFactor: 117,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 1.00,
        carryFactor: 1.04
    },

    'WSH': {
        venue: 'Nationals Park',
        team: 'WSH',
        city: 'Washington',
        state: 'DC',

        altitude: 25,
        latitude: 38.8730,
        longitude: -77.0074,

        leftField: 336,
        leftCenter: 377,
        center: 402,
        rightCenter: 370,
        rightField: 335,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 99,
        hrFactor: 101,
        hitFactor: 99,

        lhbHrFactor: 103,
        rhbHrFactor: 99,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 1.00,
        carryFactor: 1.00
    },

    // ========================================================================
    // NATIONAL LEAGUE CENTRAL
    // ========================================================================

    'CHC': {
        venue: 'Wrigley Field',
        team: 'CHC',
        city: 'Chicago',
        state: 'IL',

        altitude: 600,
        latitude: 41.9484,
        longitude: -87.6553,

        leftField: 355,
        leftCenter: 368,
        center: 400,
        rightCenter: 368,
        rightField: 353,

        leftWall: 11.5,            // Ivy-covered walls
        centerWall: 11.5,
        rightWall: 11.5,

        runFactor: 103,
        hrFactor: 105,             // Wind-dependent
        hitFactor: 102,

        lhbHrFactor: 107,
        rhbHrFactor: 103,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.99,
        carryFactor: 1.05          // Wind blowing out is huge
    },

    'CIN': {
        venue: 'Great American Ball Park',
        team: 'CIN',
        city: 'Cincinnati',
        state: 'OH',

        altitude: 551,
        latitude: 39.0979,
        longitude: -84.5080,

        leftField: 328,
        leftCenter: 379,
        center: 404,
        rightCenter: 370,
        rightField: 325,

        leftWall: 12,
        centerWall: 8,
        rightWall: 8,

        runFactor: 107,
        hrFactor: 122,             // Best HR park in MLB
        hitFactor: 103,

        lhbHrFactor: 118,
        rhbHrFactor: 126,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.99,
        carryFactor: 1.08          // Ball carries very well
    },

    'MIL': {
        venue: 'American Family Field',
        team: 'MIL',
        city: 'Milwaukee',
        state: 'WI',

        altitude: 617,
        latitude: 43.0284,
        longitude: -87.9712,

        leftField: 344,
        leftCenter: 371,
        center: 400,
        rightCenter: 374,
        rightField: 345,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 100,
        hrFactor: 102,
        hitFactor: 99,

        lhbHrFactor: 104,
        rhbHrFactor: 100,

        roofType: 'retractable',
        surfaceType: 'grass',

        airDensityMultiplier: 0.99,
        carryFactor: 1.00
    },

    'PIT': {
        venue: 'PNC Park',
        team: 'PIT',
        city: 'Pittsburgh',
        state: 'PA',

        altitude: 730,
        latitude: 40.4469,
        longitude: -80.0057,

        leftField: 325,
        leftCenter: 383,
        center: 399,
        rightCenter: 375,
        rightField: 320,

        leftWall: 6,
        centerWall: 6,
        rightWall: 21,             // Right field clemente wall

        runFactor: 95,
        hrFactor: 92,
        hitFactor: 98,

        lhbHrFactor: 94,
        rhbHrFactor: 90,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.98,
        carryFactor: 0.98
    },

    'STL': {
        venue: 'Busch Stadium',
        team: 'STL',
        city: 'St. Louis',
        state: 'MO',

        altitude: 455,
        latitude: 38.6226,
        longitude: -90.1928,

        leftField: 336,
        leftCenter: 375,
        center: 400,
        rightCenter: 375,
        rightField: 335,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 97,
        hrFactor: 95,
        hitFactor: 98,

        lhbHrFactor: 97,
        rhbHrFactor: 93,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.99,
        carryFactor: 0.99
    },

    // ========================================================================
    // NATIONAL LEAGUE WEST
    // ========================================================================

    'ARI': {
        venue: 'Chase Field',
        team: 'ARI',
        city: 'Phoenix',
        state: 'AZ',

        altitude: 1082,            // Highest MLB park (indoor)
        latitude: 33.4453,
        longitude: -112.0667,

        leftField: 330,
        leftCenter: 374,
        center: 407,
        rightCenter: 376,
        rightField: 335,

        leftWall: 7.5,
        centerWall: 25,            // Pool area
        rightWall: 7.5,

        runFactor: 106,
        hrFactor: 110,
        hitFactor: 103,

        lhbHrFactor: 108,
        rhbHrFactor: 112,

        roofType: 'retractable',
        surfaceType: 'grass',

        airDensityMultiplier: 0.96, // Thin air + climate controlled
        carryFactor: 1.06
    },

    'COL': {
        venue: 'Coors Field',
        team: 'COL',
        city: 'Denver',
        state: 'CO',

        altitude: 5280,            // Mile High!
        latitude: 39.7559,
        longitude: -104.9942,

        leftField: 347,
        leftCenter: 390,
        center: 415,
        rightCenter: 375,
        rightField: 350,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 116,            // Highest in MLB
        hrFactor: 119,
        hitFactor: 113,

        lhbHrFactor: 117,
        rhbHrFactor: 121,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.83, // 17% less air density!
        carryFactor: 1.20          // Balls carry significantly more
    },

    'LAD': {
        venue: 'Dodger Stadium',
        team: 'LAD',
        city: 'Los Angeles',
        state: 'CA',

        altitude: 512,
        latitude: 34.0739,
        longitude: -118.2400,

        leftField: 330,
        leftCenter: 385,
        center: 395,
        rightCenter: 385,
        rightField: 330,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 94,
        hrFactor: 92,              // Pitcher's park
        hitFactor: 96,

        lhbHrFactor: 95,
        rhbHrFactor: 89,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 0.99,
        carryFactor: 0.96          // Night games are pitcher-friendly
    },

    'SD': {
        venue: 'Petco Park',
        team: 'SD',
        city: 'San Diego',
        state: 'CA',

        altitude: 22,
        latitude: 32.7076,
        longitude: -117.1570,

        leftField: 336,
        leftCenter: 390,
        center: 396,
        rightCenter: 387,
        rightField: 322,

        leftWall: 8,
        centerWall: 8,
        rightWall: 8,

        runFactor: 93,
        hrFactor: 86,              // Very pitcher-friendly
        hitFactor: 96,

        lhbHrFactor: 89,
        rhbHrFactor: 83,

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 1.01,
        carryFactor: 0.92          // Marine layer suppresses fly balls
    },

    'SF': {
        venue: 'Oracle Park',
        team: 'SF',
        city: 'San Francisco',
        state: 'CA',

        altitude: 8,
        latitude: 37.7786,
        longitude: -122.3893,

        leftField: 339,
        leftCenter: 364,
        center: 399,
        rightCenter: 421,          // Triples Alley
        rightField: 309,           // Short to McCovey Cove

        leftWall: 8,
        centerWall: 8,
        rightWall: 25,             // Splash hit wall

        runFactor: 90,
        hrFactor: 82,              // One of the toughest HR parks
        hitFactor: 94,

        lhbHrFactor: 86,
        rhbHrFactor: 78,           // Triples Alley kills RHB power

        roofType: 'open',
        surfaceType: 'grass',

        airDensityMultiplier: 1.02,
        carryFactor: 0.88          // Heavy marine air, wind blows in
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get park factors by team abbreviation
 * @param {string} team - Team abbreviation (e.g., 'NYY')
 * @returns {Object} Park factors or null
 */
export function getParkFactors(team) {
    return MLB_PARK_FACTORS[team] || null;
}

/**
 * Get park factors by venue name (fuzzy match)
 * @param {string} venueName - Venue name
 * @returns {Object} Park factors or null
 */
export function getParkByVenue(venueName) {
    const normalized = venueName.toLowerCase();
    for (const [team, park] of Object.entries(MLB_PARK_FACTORS)) {
        if (park.venue.toLowerCase().includes(normalized)) {
            return park;
        }
    }
    return null;
}

/**
 * Get adjusted physics constants for a venue
 * @param {string} team - Team abbreviation
 * @param {Object} basePhysics - Base physics constants
 * @returns {Object} Adjusted physics constants
 */
export function getAdjustedPhysics(team, basePhysics) {
    const park = MLB_PARK_FACTORS[team];
    if (!park) return basePhysics;

    return {
        ...basePhysics,
        airDensity: basePhysics.airDensity * park.airDensityMultiplier,
        altitude: park.altitude,
        altitudeMultiplier: park.airDensityMultiplier,
        carryFactor: park.carryFactor
    };
}

/**
 * Calculate expected HR rate adjustment for a batter/pitcher
 * @param {string} team - Team abbreviation
 * @param {string} batterHand - 'L' or 'R'
 * @returns {number} Multiplier (1.0 = neutral)
 */
export function getHRRateAdjustment(team, batterHand) {
    const park = MLB_PARK_FACTORS[team];
    if (!park) return 1.0;

    const factor = batterHand === 'L' ? park.lhbHrFactor : park.rhbHrFactor;
    return factor / 100;
}

/**
 * Get all parks sorted by HR factor
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted parks
 */
export function getParksByHRFactor(order = 'desc') {
    const parks = Object.entries(MLB_PARK_FACTORS).map(([team, park]) => ({
        team,
        ...park
    }));

    return parks.sort((a, b) =>
        order === 'desc' ? b.hrFactor - a.hrFactor : a.hrFactor - b.hrFactor
    );
}

/**
 * Get all parks sorted by altitude
 * @returns {Array} Parks sorted by altitude (highest first)
 */
export function getParksByAltitude() {
    return Object.entries(MLB_PARK_FACTORS)
        .map(([team, park]) => ({ team, ...park }))
        .sort((a, b) => b.altitude - a.altitude);
}

/**
 * Validate park factors are complete
 * @returns {Object} Validation results
 */
export function validateParkFactors() {
    const teams = Object.keys(MLB_PARK_FACTORS);
    const requiredFields = [
        'venue', 'team', 'altitude', 'leftField', 'center', 'rightField',
        'runFactor', 'hrFactor', 'hitFactor', 'lhbHrFactor', 'rhbHrFactor',
        'airDensityMultiplier', 'carryFactor'
    ];

    const issues = [];

    for (const team of teams) {
        const park = MLB_PARK_FACTORS[team];
        for (const field of requiredFields) {
            if (park[field] === undefined || park[field] === null) {
                issues.push(`${team}: missing ${field}`);
            }
        }
    }

    return {
        valid: issues.length === 0,
        teamCount: teams.length,
        expectedCount: 30,
        issues
    };
}

// ============================================================================
// EXPORT
// ============================================================================

export default MLB_PARK_FACTORS;
