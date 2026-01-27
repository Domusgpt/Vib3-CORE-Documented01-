/**
 * GeometricFeatureEngine - Unified Feature Engineering Coordinator
 *
 * Orchestrates all polytopal feature computations and prepares
 * feature vectors for the predictive model.
 *
 * @class GeometricFeatureEngine
 */

import { TunnelAnalyzer } from './TunnelAnalyzer.js';
import { UmpireZoneHull } from './UmpireZoneHull.js';
import { DefensiveVoronoi } from './DefensiveVoronoi.js';
import { ArsenalTopology } from './ArsenalTopology.js';

export class GeometricFeatureEngine {
    constructor(config = {}) {
        this.config = {
            // Feature extraction settings
            trailingWindowDays: 30,
            minPitchSample: 100,
            includeEnvironmental: true,
            ...config
        };

        // Initialize sub-engines
        this.tunnelAnalyzer = new TunnelAnalyzer(config.tunnel);
        this.umpireHull = new UmpireZoneHull(config.umpire);
        this.defensiveVoronoi = new DefensiveVoronoi(config.defense);
        this.arsenalTopology = new ArsenalTopology(config.arsenal);

        // Caches
        this.arsenalCache = new Map();
        this.umpireCache = new Map();
        this.environmentalCache = new Map();
    }

    /**
     * Precompute arsenals for a set of pitchers
     * @param {Array} pitchers - Array of {pitcherId, pitches}
     */
    async precomputeArsenals(pitchers) {
        for (const { pitcherId, pitches } of pitchers) {
            const topology = this.arsenalTopology.computeArsenalTopology(
                pitches,
                pitcherId
            );
            this.arsenalCache.set(pitcherId, topology);
        }
    }

    /**
     * Get cached arsenal polytope
     */
    getArsenalPolytope(pitcherId) {
        return this.arsenalCache.get(pitcherId);
    }

    /**
     * Compute tunnel scores for pitcher data
     */
    computeTunnelScores(pitcherData) {
        if (!pitcherData || pitcherData.length === 0) return [];
        return this.tunnelAnalyzer.computeTunnelScores(pitcherData);
    }

    /**
     * Compute umpire zone hull
     */
    computeUmpireHull(umpireData) {
        if (!umpireData || umpireData.length === 0) {
            return { expansionFactor: 1, centroid: [0, 2.5], area: 2.125 };
        }

        const calledStrikes = umpireData.filter(p =>
            p.description === 'called_strike' ||
            p.type === 'S'
        );

        return this.umpireHull.computeHull(calledStrikes);
    }

    /**
     * Compute defensive Voronoi
     */
    computeDefensiveVoronoi(lineupIds, fielderData) {
        const fielders = lineupIds.map((id, idx) => ({
            playerId: id,
            position: ['1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'][idx % 7],
            ...fielderData[id]
        }));

        return this.defensiveVoronoi.computeVoronoi(fielders);
    }

    /**
     * Compute batter spray chart
     */
    computeSprayChart(batterData) {
        if (!batterData || batterData.length === 0) {
            return { points: [], density: {} };
        }

        const battedBalls = batterData.filter(p =>
            p.type === 'X' ||
            p.description?.includes('hit') ||
            p.events
        );

        const points = battedBalls.map((b, idx) => ({
            idx,
            x: b.hc_x || 0,
            y: b.hc_y || 0,
            launchAngle: b.launch_angle || 0,
            exitVelo: b.launch_speed || 0,
            outcome: b.events || 'unknown'
        }));

        // Compute density on grid
        const density = {};
        const gridSize = 20;

        for (const point of points) {
            const key = `${Math.floor(point.x / gridSize)}_${Math.floor(point.y / gridSize)}`;
            density[key] = (density[key] || 0) + 1;
        }

        // Normalize
        const total = points.length || 1;
        for (const key of Object.keys(density)) {
            density[key] /= total;
        }

        return { points, density, totalBattedBalls: battedBalls.length };
    }

    /**
     * Get environmental factors for a venue
     */
    getEnvironmentalFactors(venueId, temperature, windSpeed, windDirection) {
        // Lookup venue characteristics
        const venueFactors = this.getVenueFactors(venueId);

        // Compute air density adjustment
        const airDensity = this.computeAirDensity(
            temperature || 72,
            venueFactors.elevation
        );

        // Wind effect on fly balls
        const windEffect = this.computeWindEffect(
            windSpeed || 0,
            windDirection || 0
        );

        return {
            venue: venueFactors,
            airDensity,
            windEffect,
            temperature: temperature || 72,
            isExtreme: temperature < 50 || temperature > 95 || windSpeed > 15,

            // Adjustments to apply
            flyBallMultiplier: airDensity.flyBallFactor * windEffect.flyBallFactor,
            homeRunMultiplier: venueFactors.parkFactor * airDensity.hrFactor
        };
    }

    /**
     * Compute training set features from historical data
     * @param {Object} dataLake - Data source
     * @param {Array} years - Years to include
     */
    async computeTrainingSet(dataLake, years) {
        const features = [];

        for (const year of years) {
            const games = dataLake.getGames(year);

            for (const game of games) {
                try {
                    const gameFeatures = await this.computeGameFeatures(
                        game,
                        dataLake
                    );

                    if (gameFeatures) {
                        features.push({
                            ...gameFeatures,
                            gameId: game.gameId,
                            year,
                            actualResult: game.result
                        });
                    }
                } catch (e) {
                    // Skip games with missing data
                    continue;
                }
            }
        }

        return features;
    }

    /**
     * Compute all features for a single game
     */
    async computeGameFeatures(game, dataLake) {
        // Get pitcher data
        const homePitcherData = dataLake.getPitcherData(game.homePitcherId);
        const awayPitcherData = dataLake.getPitcherData(game.awayPitcherId);

        if (!homePitcherData || !awayPitcherData) return null;

        // Compute pitcher features
        const homePitcher = {
            arsenal: this.arsenalCache.get(game.homePitcherId) ||
                this.arsenalTopology.computeArsenalTopology(homePitcherData),
            tunnelScores: this.computeTunnelScores(homePitcherData)
        };

        const awayPitcher = {
            arsenal: this.arsenalCache.get(game.awayPitcherId) ||
                this.arsenalTopology.computeArsenalTopology(awayPitcherData),
            tunnelScores: this.computeTunnelScores(awayPitcherData)
        };

        // Umpire features
        const umpireData = dataLake.getUmpireData(game.umpireId);
        const umpireFeatures = this.computeUmpireHull(umpireData);

        // Environmental features
        const environmental = this.getEnvironmentalFactors(
            game.venueId,
            game.temperature,
            game.windSpeed,
            game.windDirection
        );

        // Flatten to feature vector
        return this.flattenFeatures({
            homePitcher,
            awayPitcher,
            umpire: umpireFeatures,
            environmental
        });
    }

    /**
     * Flatten nested features into a flat vector for ML
     */
    flattenFeatures(features) {
        const flat = {};

        // Home pitcher features
        if (features.homePitcher?.arsenal?.metrics) {
            flat.home_arsenal_volume = features.homePitcher.arsenal.metrics.arsenalVolume;
            flat.home_arsenal_spread = features.homePitcher.arsenal.metrics.arsenalSpread;
            flat.home_cluster_separation = features.homePitcher.arsenal.metrics.clusterSeparation;
            flat.home_stability = features.homePitcher.arsenal.metrics.stabilityScore;
        }

        if (features.homePitcher?.tunnelScores?.length > 0) {
            const tunnels = features.homePitcher.tunnelScores;
            flat.home_avg_tunnel = tunnels.reduce((s, t) => s + t.score, 0) / tunnels.length;
            flat.home_max_tunnel = Math.max(...tunnels.map(t => t.score));
            flat.home_tunnel_pairs = tunnels.length;
        }

        // Away pitcher features
        if (features.awayPitcher?.arsenal?.metrics) {
            flat.away_arsenal_volume = features.awayPitcher.arsenal.metrics.arsenalVolume;
            flat.away_arsenal_spread = features.awayPitcher.arsenal.metrics.arsenalSpread;
            flat.away_cluster_separation = features.awayPitcher.arsenal.metrics.clusterSeparation;
            flat.away_stability = features.awayPitcher.arsenal.metrics.stabilityScore;
        }

        if (features.awayPitcher?.tunnelScores?.length > 0) {
            const tunnels = features.awayPitcher.tunnelScores;
            flat.away_avg_tunnel = tunnels.reduce((s, t) => s + t.score, 0) / tunnels.length;
            flat.away_max_tunnel = Math.max(...tunnels.map(t => t.score));
            flat.away_tunnel_pairs = tunnels.length;
        }

        // Umpire features
        if (features.umpire) {
            flat.umpire_zone_expansion = features.umpire.expansionFactor || 1;
            flat.umpire_centroid_x = features.umpire.centroid?.[0] || 0;
            flat.umpire_centroid_z = features.umpire.centroid?.[1] || 2.5;
            flat.umpire_asymmetry = features.umpire.asymmetry?.magnitude || 0;
        }

        // Environmental features
        if (features.environmental) {
            flat.air_density_factor = features.environmental.airDensity?.factor || 1;
            flat.wind_effect = features.environmental.windEffect?.factor || 1;
            flat.park_factor = features.environmental.venue?.parkFactor || 1;
            flat.fly_ball_mult = features.environmental.flyBallMultiplier || 1;
            flat.home_run_mult = features.environmental.homeRunMultiplier || 1;
        }

        return flat;
    }

    // === Helper Methods ===

    getVenueFactors(venueId) {
        // MLB park factors (simplified)
        const parkFactors = {
            3313: { name: 'Yankee Stadium', parkFactor: 1.05, elevation: 55 },
            15: { name: 'Coors Field', parkFactor: 1.38, elevation: 5280 },
            2680: { name: 'Oracle Park', parkFactor: 0.88, elevation: 10 },
            2394: { name: 'Dodger Stadium', parkFactor: 0.98, elevation: 515 },
            // Default for unknown venues
            default: { name: 'Unknown', parkFactor: 1.0, elevation: 500 }
        };

        return parkFactors[venueId] || parkFactors.default;
    }

    computeAirDensity(temperature, elevation) {
        // Simplified air density calculation
        // Reference: sea level at 59°F
        const refDensity = 0.0765; // lb/ft³

        // Temperature adjustment (less dense when hot)
        const tempFactor = 1 - (temperature - 59) * 0.0012;

        // Elevation adjustment (less dense at altitude)
        const elevFactor = Math.exp(-elevation / 27000);

        const density = refDensity * tempFactor * elevFactor;

        // Effect on fly ball distance (less drag = more distance)
        const flyBallFactor = 1 + (refDensity - density) * 2;

        // Effect on home runs
        const hrFactor = 1 + (refDensity - density) * 5;

        return {
            density,
            factor: density / refDensity,
            flyBallFactor,
            hrFactor
        };
    }

    computeWindEffect(speed, direction) {
        // Direction: 0 = from home, 90 = from left, 180 = from center, 270 = from right
        // Normalize to effect on center field fly balls

        const radDirection = (direction * Math.PI) / 180;

        // Wind from center field (180°) hurts fly balls
        // Wind to center field (0°) helps fly balls
        const componentOut = Math.cos(radDirection) * speed;

        // mph to ft/s = 1.467
        // Rough approximation: 10 mph wind adds/subtracts ~10-15 feet
        const distanceEffect = componentOut * 1.5;

        return {
            factor: 1 + distanceEffect / 400, // As fraction of typical HR distance
            flyBallFactor: 1 + distanceEffect / 350,
            description: componentOut > 0 ? 'Blowing out' : 'Blowing in'
        };
    }
}
