/**
 * Altitude-Adjusted Physics Engine
 *
 * Provides venue-specific physics calculations that account for:
 * - Altitude effects on air density
 * - Temperature and humidity adjustments
 * - Venue-specific carry factors
 * - Real-time weather integration
 *
 * Key insight: A ball hit at Coors Field (5,280 ft) travels ~9% farther
 * than the same ball hit at sea level due to reduced air resistance.
 *
 * @module AltitudePhysics
 * @version 1.0.0
 */

import { MLB_PARK_FACTORS, getAdjustedPhysics } from '../data/MLBParkFactors.js';
import {
    GRAVITY,
    AIR_DENSITY_SEA_LEVEL,
    BALL_MASS,
    BALL_RADIUS,
    DRAG_COEFFICIENT,
    MAGNUS_COEFFICIENT,
    getAirDensityMultiplier
} from '../constants/GameConstants.js';

// ============================================================================
// PHYSICS ENGINE CLASS
// ============================================================================

export class AltitudePhysics {
    constructor(config = {}) {
        this.config = {
            // Base physics (sea level, standard conditions)
            baseGravity: GRAVITY,
            baseAirDensity: AIR_DENSITY_SEA_LEVEL,
            ballMass: BALL_MASS,
            ballRadius: BALL_RADIUS,
            baseDragCoeff: DRAG_COEFFICIENT,
            baseMagnusCoeff: MAGNUS_COEFFICIENT,

            // Standard conditions
            standardTemp: 70,          // °F
            standardHumidity: 50,      // %
            standardPressure: 29.92,   // inHg

            // Enable/disable adjustments
            useAltitudeAdjustment: true,
            useTemperatureAdjustment: true,
            useHumidityAdjustment: true,

            ...config
        };

        // Cache for venue physics
        this._venueCache = new Map();
    }

    /**
     * Get physics constants adjusted for a specific venue
     *
     * @param {string} team - Team abbreviation (e.g., 'COL')
     * @param {Object} conditions - Optional weather conditions
     * @returns {Object} Adjusted physics constants
     */
    getVenuePhysics(team, conditions = {}) {
        // Check cache
        const cacheKey = `${team}_${JSON.stringify(conditions)}`;
        if (this._venueCache.has(cacheKey)) {
            return this._venueCache.get(cacheKey);
        }

        const park = MLB_PARK_FACTORS[team];
        if (!park) {
            console.warn(`Unknown venue for team ${team}, using sea level physics`);
            return this._getSeaLevelPhysics();
        }

        // Start with base physics
        let physics = { ...this._getSeaLevelPhysics() };

        // Apply altitude adjustment
        if (this.config.useAltitudeAdjustment) {
            physics = this._applyAltitudeAdjustment(physics, park.altitude);
        }

        // Apply temperature adjustment
        if (this.config.useTemperatureAdjustment && conditions.temperature) {
            physics = this._applyTemperatureAdjustment(physics, conditions.temperature);
        }

        // Apply humidity adjustment
        if (this.config.useHumidityAdjustment && conditions.humidity) {
            physics = this._applyHumidityAdjustment(physics, conditions.humidity);
        }

        // Apply venue-specific carry factor
        physics.carryFactor = park.carryFactor;

        // Add venue metadata
        physics.venue = park.venue;
        physics.altitude = park.altitude;
        physics.team = team;

        // Cache result
        this._venueCache.set(cacheKey, physics);

        return physics;
    }

    /**
     * Get base sea level physics
     */
    _getSeaLevelPhysics() {
        return {
            gravity: this.config.baseGravity,
            airDensity: this.config.baseAirDensity,
            ballMass: this.config.ballMass,
            ballRadius: this.config.ballRadius,
            dragCoeff: this.config.baseDragCoeff,
            magnusCoeff: this.config.baseMagnusCoeff,
            carryFactor: 1.0,
            altitude: 0,
            altitudeMultiplier: 1.0,
            temperatureMultiplier: 1.0,
            humidityMultiplier: 1.0
        };
    }

    /**
     * Apply altitude adjustment to physics
     *
     * Air density decreases with altitude according to the barometric formula.
     * This affects both drag and Magnus force proportionally.
     *
     * @param {Object} physics - Current physics constants
     * @param {number} altitude - Altitude in feet
     * @returns {Object} Adjusted physics
     */
    _applyAltitudeAdjustment(physics, altitude) {
        const altitudeMultiplier = getAirDensityMultiplier(altitude);

        return {
            ...physics,
            airDensity: physics.airDensity * altitudeMultiplier,
            // Drag is proportional to air density
            dragCoeff: physics.dragCoeff * Math.sqrt(altitudeMultiplier),
            // Magnus is also proportional to air density
            magnusCoeff: physics.magnusCoeff * altitudeMultiplier,
            altitude,
            altitudeMultiplier
        };
    }

    /**
     * Apply temperature adjustment to physics
     *
     * Air density is inversely proportional to absolute temperature.
     * Hot air is less dense = ball travels farther.
     *
     * Formula: ρ/ρ₀ = T₀/T (at constant pressure)
     *
     * @param {Object} physics - Current physics constants
     * @param {number} temp - Temperature in °F
     * @returns {Object} Adjusted physics
     */
    _applyTemperatureAdjustment(physics, temp) {
        // Convert to Rankine (absolute temperature)
        const tempRankine = temp + 459.67;
        const standardRankine = this.config.standardTemp + 459.67;

        // Air density ratio
        const tempMultiplier = standardRankine / tempRankine;

        return {
            ...physics,
            airDensity: physics.airDensity * tempMultiplier,
            temperatureMultiplier: tempMultiplier
        };
    }

    /**
     * Apply humidity adjustment to physics
     *
     * Counterintuitively, humid air is LESS dense than dry air!
     * Water vapor (MW=18) displaces nitrogen (MW=28) and oxygen (MW=32).
     *
     * Effect is small (~1-2%) but can matter for long fly balls.
     *
     * @param {Object} physics - Current physics constants
     * @param {number} humidity - Relative humidity (0-100)
     * @returns {Object} Adjusted physics
     */
    _applyHumidityAdjustment(physics, humidity) {
        // Simplified: 1% less dense per 25% RH above 50%
        const humidityDiff = (humidity - 50) / 100;
        const humidityMultiplier = 1 - (humidityDiff * 0.01);

        return {
            ...physics,
            airDensity: physics.airDensity * humidityMultiplier,
            humidityMultiplier
        };
    }

    // ========================================================================
    // TRAJECTORY CALCULATIONS
    // ========================================================================

    /**
     * Calculate pitch trajectory with venue-specific physics
     *
     * @param {Object} initialConditions - Pitch initial state
     * @param {string} team - Venue team
     * @param {Object} conditions - Weather conditions
     * @returns {Array} Trajectory points
     */
    calculatePitchTrajectory(initialConditions, team, conditions = {}) {
        const physics = this.getVenuePhysics(team, conditions);

        const {
            vx0, vy0, vz0,        // Initial velocity (ft/s)
            x0, y0, z0,          // Initial position (ft)
            spinRate,            // RPM
            spinAxis             // Degrees
        } = initialConditions;

        const trajectory = [];
        const dt = 0.001; // 1ms time step

        let x = x0, y = y0, z = z0;
        let vx = vx0, vy = vy0, vz = vz0;

        // Convert spin to radians/s and spin vector
        const omega = spinRate * 2 * Math.PI / 60;
        const spinAxisRad = spinAxis * Math.PI / 180;
        const wx = omega * Math.sin(spinAxisRad);
        const wz = omega * Math.cos(spinAxisRad);

        while (y > 0 && z > 0) {
            // Store current point
            trajectory.push({ x, y, z, vx, vy, vz, t: trajectory.length * dt });

            // Velocity magnitude
            const v = Math.sqrt(vx * vx + vy * vy + vz * vz);

            if (v < 1) break; // Stalled

            // Drag acceleration (opposite to velocity)
            const dragMag = physics.dragCoeff * physics.airDensity *
                Math.PI * physics.ballRadius ** 2 * v ** 2 /
                (2 * physics.ballMass);

            const ax_drag = -dragMag * vx / v;
            const ay_drag = -dragMag * vy / v;
            const az_drag = -dragMag * vz / v;

            // Magnus acceleration (spin cross velocity)
            const ax_magnus = physics.magnusCoeff * (wz * vy);
            const ay_magnus = physics.magnusCoeff * (-wz * vx + wx * vz);
            const az_magnus = physics.magnusCoeff * (-wx * vy);

            // Total acceleration
            const ax = ax_drag + ax_magnus;
            const ay = ay_drag + ay_magnus;
            const az = physics.gravity + az_drag + az_magnus;

            // Update velocity
            vx += ax * dt;
            vy += ay * dt;
            vz += az * dt;

            // Update position
            x += vx * dt;
            y += vy * dt;
            z += vz * dt;

            // Safety limit
            if (trajectory.length > 10000) break;
        }

        return trajectory;
    }

    /**
     * Calculate batted ball trajectory with venue-specific physics
     *
     * @param {Object} launch - Launch conditions
     * @param {string} team - Venue team
     * @param {Object} conditions - Weather conditions
     * @returns {Object} Trajectory and landing point
     */
    calculateBattedBallTrajectory(launch, team, conditions = {}) {
        const physics = this.getVenuePhysics(team, conditions);

        const {
            launchSpeed,      // mph
            launchAngle,      // degrees
            sprayAngle = 0,   // degrees (0 = center, positive = right)
            spinRate = 2000,  // RPM (backspin)
            x0 = 0,           // Contact point
            y0 = 0,
            z0 = 3.0          // ~bat height
        } = launch;

        // Convert launch speed to ft/s
        const v0 = launchSpeed * 1.467;

        // Convert angles to radians
        const launchRad = launchAngle * Math.PI / 180;
        const sprayRad = sprayAngle * Math.PI / 180;

        // Initial velocity components
        const vy0 = v0 * Math.cos(launchRad) * Math.cos(sprayRad);
        const vx0 = v0 * Math.cos(launchRad) * Math.sin(sprayRad);
        const vz0 = v0 * Math.sin(launchRad);

        // Simulate trajectory
        const trajectory = [];
        const dt = 0.01; // 10ms time step

        let x = x0, y = y0, z = z0;
        let vx = vx0, vy = vy0, vz = vz0;

        // Backspin creates upward Magnus force
        const omega = spinRate * 2 * Math.PI / 60;

        while (z > 0 || trajectory.length === 0) {
            trajectory.push({
                x, y, z,
                vx, vy, vz,
                t: trajectory.length * dt
            });

            const v = Math.sqrt(vx * vx + vy * vy + vz * vz);
            if (v < 1) break;

            // Drag
            const dragMag = physics.dragCoeff * physics.airDensity *
                Math.PI * physics.ballRadius ** 2 * v ** 2 /
                (2 * physics.ballMass);

            const ax_drag = -dragMag * vx / v;
            const ay_drag = -dragMag * vy / v;
            const az_drag = -dragMag * vz / v;

            // Magnus (backspin creates lift)
            // For pure backspin: ω × v points upward when v is forward
            const ax_magnus = 0;
            const ay_magnus = 0;
            const az_magnus = physics.magnusCoeff * omega * Math.sqrt(vx * vx + vy * vy);

            // Apply venue carry factor to Magnus
            const carriedMagnus = az_magnus * physics.carryFactor;

            // Total acceleration
            const ax = ax_drag + ax_magnus;
            const ay = ay_drag + ay_magnus;
            const az = physics.gravity + az_drag + carriedMagnus;

            // Update
            vx += ax * dt;
            vy += ay * dt;
            vz += az * dt;
            x += vx * dt;
            y += vy * dt;
            z += vz * dt;

            if (trajectory.length > 2000) break; // ~20 seconds
        }

        // Calculate landing point
        const landing = trajectory[trajectory.length - 1];
        const distance = Math.sqrt(landing.x ** 2 + landing.y ** 2);
        const hangTime = trajectory.length * dt;

        return {
            trajectory,
            landing: { x: landing.x, y: landing.y },
            distance,
            hangTime,
            maxHeight: Math.max(...trajectory.map(p => p.z)),
            physics: {
                venue: physics.venue,
                altitude: physics.altitude,
                altitudeMultiplier: physics.altitudeMultiplier,
                carryFactor: physics.carryFactor
            }
        };
    }

    /**
     * Compare same hit at different venues
     *
     * @param {Object} launch - Launch conditions
     * @param {string[]} teams - Team abbreviations to compare
     * @returns {Object} Comparison results
     */
    compareVenues(launch, teams = ['SF', 'COL', 'MIA', 'NYY']) {
        const results = {};

        for (const team of teams) {
            const result = this.calculateBattedBallTrajectory(launch, team);
            results[team] = {
                distance: result.distance,
                hangTime: result.hangTime,
                maxHeight: result.maxHeight,
                venue: result.physics.venue,
                altitude: result.physics.altitude
            };
        }

        // Sort by distance
        const sorted = Object.entries(results)
            .sort((a, b) => b[1].distance - a[1].distance);

        // Calculate differences from sea level reference
        const seaLevel = this.calculateBattedBallTrajectory(launch, 'MIA');
        for (const team of teams) {
            results[team].distanceDiff = results[team].distance - seaLevel.distance;
            results[team].percentDiff = ((results[team].distance / seaLevel.distance) - 1) * 100;
        }

        return {
            results,
            sorted,
            seaLevelDistance: seaLevel.distance,
            maxDifference: sorted[0][1].distance - sorted[sorted.length - 1][1].distance
        };
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Get physics summary for all venues
     */
    getAllVenuePhysics() {
        const summary = {};

        for (const team of Object.keys(MLB_PARK_FACTORS)) {
            const physics = this.getVenuePhysics(team);
            summary[team] = {
                venue: physics.venue,
                altitude: physics.altitude,
                airDensity: physics.airDensity.toFixed(4),
                altitudeMultiplier: physics.altitudeMultiplier.toFixed(3),
                carryFactor: physics.carryFactor.toFixed(2)
            };
        }

        return summary;
    }

    /**
     * Clear venue physics cache
     */
    clearCache() {
        this._venueCache.clear();
    }

    /**
     * Estimate home run probability adjustment for venue
     *
     * @param {string} team - Venue team
     * @param {number} exitVelo - Exit velocity (mph)
     * @param {number} launchAngle - Launch angle (degrees)
     * @returns {number} HR probability multiplier (1.0 = neutral)
     */
    getHRProbabilityMultiplier(team, exitVelo, launchAngle) {
        // Simulate "barrel" hit
        const result = this.calculateBattedBallTrajectory({
            launchSpeed: exitVelo,
            launchAngle: launchAngle,
            spinRate: 2500
        }, team);

        // Compare to sea level
        const seaLevel = this.calculateBattedBallTrajectory({
            launchSpeed: exitVelo,
            launchAngle: launchAngle,
            spinRate: 2500
        }, 'MIA');

        // Distance ratio
        return result.distance / seaLevel.distance;
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick function to get venue-adjusted physics
 */
export function getPhysicsForVenue(team, conditions = {}) {
    const engine = new AltitudePhysics();
    return engine.getVenuePhysics(team, conditions);
}

/**
 * Compare a fly ball across all venues
 */
export function compareFlyBallAcrossVenues(launch) {
    const engine = new AltitudePhysics();
    return engine.compareVenues(launch, Object.keys(MLB_PARK_FACTORS));
}

/**
 * Get Coors Field distance boost
 */
export function getCoorsBoost(exitVelo, launchAngle) {
    const engine = new AltitudePhysics();
    return engine.getHRProbabilityMultiplier('COL', exitVelo, launchAngle);
}

// ============================================================================
// EXPORT
// ============================================================================

export default AltitudePhysics;
