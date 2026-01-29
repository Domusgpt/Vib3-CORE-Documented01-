/**
 * TunnelAnalyzer - Pitch Tunneling Manifold Intersection Analysis
 *
 * PRODUCTION UPGRADE: Angular Divergence at Fixed Distance
 * =========================================================
 * The original implementation measured Euclidean distance at a fixed TIME
 * (t = 0.175s), which is flawed because it ignores velocity differentials.
 * A 100 mph fastball travels much farther than a 75 mph curveball in the
 * same time, so the metric didn't model what the batter actually perceives.
 *
 * This upgrade shifts to ANGULAR DIVERGENCE at a FIXED DISTANCE from the
 * batter's eye. This directly models the biological reality of vision:
 * - Human fovea resolution limit: ~0.2 degrees
 * - If two pitches subtend < 0.2° when crossing a fixed plane (e.g., 20ft
 *   from pitcher), they are physically indistinguishable to the batter
 *
 * The Math:
 * - θ = arctan(d / D) where d = separation, D = distance from batter
 * - True Tunnel: θ < 0.2° at decision plane
 * - Tunnel Score = θ_plate / θ_tunnel (angular deception ratio)
 *
 * @class TunnelAnalyzer
 */

export class TunnelAnalyzer {
    constructor(config = {}) {
        this.config = {
            // Distance from pitcher's mound to plate: 60.5 feet
            moundToPlate: 60.5,

            // UPGRADED: Use fixed distance planes instead of fixed time
            // Decision plane distance from plate (where batter commits)
            decisionPointDistance: 23.8,

            // Tunnel measurement plane (distance from pitcher's release)
            tunnelPlaneDistance: 20.0,  // feet from release

            // Batter's eye position (for angular calculations)
            batterEyePosition: {
                x: 0,      // Center of plate
                y: 1.33,   // 16 inches behind plate
                z: 4.5     // Eye height (feet)
            },

            // Human fovea resolution limit (degrees)
            foveaResolution: 0.2,

            // Angular thresholds for tunnel quality
            trueTunnelThreshold: 0.2,     // < 0.2° = optically identical
            goodTunnelThreshold: 0.5,     // < 0.5° = difficult to distinguish
            decentTunnelThreshold: 1.0,   // < 1.0° = some deception

            // Time parameters (kept for compatibility)
            defaultDecisionTime: 0.175, // seconds
            defaultPlateTime: 0.400,     // seconds

            // Release point tolerance for same-slot analysis
            releasePointTolerance: 0.3,  // feet

            // Minimum pitches required for reliable tunnel analysis
            minPitchesPerType: 20,

            // Use angular divergence method (production) vs euclidean (legacy)
            useAngularDivergence: true,

            ...config
        };
    }

    /**
     * Compute tunnel scores for all pitch pairs in a pitcher's arsenal
     * @param {Array} pitches - Array of pitch data objects
     * @returns {Array} Tunnel scores between each pitch type pair
     */
    computeTunnelScores(pitches) {
        // Group pitches by type
        const byType = this.groupByPitchType(pitches);
        const types = Object.keys(byType);

        if (types.length < 2) {
            return []; // Need at least 2 pitch types
        }

        const tunnelScores = [];

        // Compute pairwise tunnel scores
        for (let i = 0; i < types.length; i++) {
            for (let j = i + 1; j < types.length; j++) {
                const typeA = types[i];
                const typeB = types[j];

                const score = this.computePairTunnelScore(
                    byType[typeA],
                    byType[typeB]
                );

                if (score !== null) {
                    tunnelScores.push({
                        pitchA: typeA,
                        pitchB: typeB,
                        score: score.tunnelScore,
                        tunnelDistance: score.avgTunnelDistance,
                        plateDistance: score.avgPlateDistance,
                        frequency: score.pairFrequency,
                        releasePointSimilarity: score.releasePointSimilarity
                    });
                }
            }
        }

        return tunnelScores;
    }

    /**
     * Compute tunnel score between two pitch types
     * UPGRADED: Uses Angular Divergence at Fixed Distance for biological accuracy
     *
     * @param {Array} pitchesA - First pitch type samples
     * @param {Array} pitchesB - Second pitch type samples
     * @returns {Object} Tunnel analysis results
     */
    computePairTunnelScore(pitchesA, pitchesB) {
        if (pitchesA.length < this.config.minPitchesPerType ||
            pitchesB.length < this.config.minPitchesPerType) {
            return null;
        }

        // Use Angular Divergence method (production) or legacy Euclidean
        if (this.config.useAngularDivergence) {
            return this.computePairTunnelScoreAngular(pitchesA, pitchesB);
        } else {
            return this.computePairTunnelScoreLegacy(pitchesA, pitchesB);
        }
    }

    /**
     * PRODUCTION METHOD: Angular Divergence at Fixed Distance
     *
     * Models what the batter actually sees by computing the angular
     * separation between pitches as seen from the batter's eye position.
     *
     * Key insight: The human fovea has a resolution of ~0.2 degrees.
     * If two pitches subtend less than this angle at the tunnel plane,
     * they are PHYSICALLY INDISTINGUISHABLE to the batter.
     */
    computePairTunnelScoreAngular(pitchesA, pitchesB) {
        const { batterEyePosition, tunnelPlaneDistance, moundToPlate } = this.config;

        // Compute centroid trajectories for each type
        const centroidA = this.computeCentroidTrajectory(pitchesA);
        const centroidB = this.computeCentroidTrajectory(pitchesB);

        // Project to tunnel plane (fixed distance from release, NOT fixed time)
        const tunnelA = this.projectToFixedDistance(centroidA, tunnelPlaneDistance);
        const tunnelB = this.projectToFixedDistance(centroidB, tunnelPlaneDistance);

        // Get plate positions
        const plateA = this.getPlatePosition(centroidA);
        const plateB = this.getPlatePosition(centroidB);

        // Calculate angular divergence from batter's eye at tunnel plane
        const tunnelAngle = this.computeAngularDivergence(
            tunnelA, tunnelB, batterEyePosition, moundToPlate - tunnelPlaneDistance
        );

        // Calculate angular divergence at plate
        const plateAngle = this.computeAngularDivergence2D(
            plateA, plateB, batterEyePosition
        );

        // Angular Tunnel Score: ratio of plate angle to tunnel angle
        // High ratio = pitches appear identical early but separate late
        // CRITICAL FIX: Use epsilon relative to foveal resolution for precision
        const epsilon = this.config.foveaResolution * 0.01; // 0.002 degrees
        const angularTunnelScore = plateAngle / (tunnelAngle + epsilon);

        // Also compute physical distances for reference
        const tunnelDistance = this.euclideanDistance3D(tunnelA, tunnelB);
        const plateDistance = this.euclideanDistance2D(plateA, plateB);

        // Classify tunnel quality based on foveal resolution
        const tunnelQuality = this.classifyTunnelQuality(tunnelAngle);

        // Release point similarity
        const releaseA = this.computeMeanReleasePoint(pitchesA);
        const releaseB = this.computeMeanReleasePoint(pitchesB);
        const releasePointSimilarity = 1 / (1 + this.euclideanDistance3D(releaseA, releaseB));

        // Pair frequency
        const pairFrequency = this.computePairFrequency(pitchesA, pitchesB);

        return {
            // Primary metric (angular)
            tunnelScore: angularTunnelScore,
            tunnelAngle,         // Degrees at tunnel plane
            plateAngle,          // Degrees at plate
            tunnelQuality,       // 'true_tunnel', 'good', 'decent', 'poor'
            isTrueTunnel: tunnelAngle < this.config.trueTunnelThreshold,

            // Physical distances (for reference)
            avgTunnelDistance: tunnelDistance,
            avgPlateDistance: plateDistance,

            // Legacy score for compatibility
            legacyScore: plateDistance / (tunnelDistance + 0.001),

            releasePointSimilarity,
            pairFrequency,

            // Method used
            method: 'angular_divergence'
        };
    }

    /**
     * Project trajectory to a fixed distance from release
     * (Unlike projectToDecisionPoint which uses fixed time)
     */
    projectToFixedDistance(trajectory, distanceFromRelease) {
        const velocity = trajectory.velocity || 90;
        const velocityFtS = velocity * 1.467;

        // Key fix: Different velocities reach the same distance at different times
        // This is the core insight - we want positions at the SAME DISTANCE
        const timeToDistance = distanceFromRelease / velocityFtS;

        return {
            x: trajectory.release_pos_x +
                trajectory.vx0 * timeToDistance +
                0.5 * trajectory.ax * timeToDistance * timeToDistance,
            y: (trajectory.release_pos_y || 50) +
                trajectory.vy0 * timeToDistance +
                0.5 * trajectory.ay * timeToDistance * timeToDistance,
            z: trajectory.release_pos_z +
                trajectory.vz0 * timeToDistance +
                0.5 * trajectory.az * timeToDistance * timeToDistance
        };
    }

    /**
     * Compute angular divergence between two points as seen from observer
     * @param {Object} pointA - First 3D point
     * @param {Object} pointB - Second 3D point
     * @param {Object} observer - Observer position
     * @param {number} distanceFromPlate - Distance of points from plate
     * @returns {number} Angular separation in degrees
     */
    computeAngularDivergence(pointA, pointB, observer, distanceFromPlate) {
        // Vector from observer to point A
        const vecA = {
            x: pointA.x - observer.x,
            y: distanceFromPlate - observer.y,  // Y is distance along pitch trajectory
            z: pointA.z - observer.z
        };

        // Vector from observer to point B
        const vecB = {
            x: pointB.x - observer.x,
            y: distanceFromPlate - observer.y,
            z: pointB.z - observer.z
        };

        // Magnitudes
        const magA = Math.sqrt(vecA.x ** 2 + vecA.y ** 2 + vecA.z ** 2);
        const magB = Math.sqrt(vecB.x ** 2 + vecB.y ** 2 + vecB.z ** 2);

        // Dot product
        const dot = vecA.x * vecB.x + vecA.y * vecB.y + vecA.z * vecB.z;

        // Angle in radians (clamp to avoid NaN from floating point errors)
        const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)));
        const angleRad = Math.acos(cosAngle);

        // Convert to degrees
        return angleRad * 180 / Math.PI;
    }

    /**
     * Compute 2D angular divergence at the plate
     */
    computeAngularDivergence2D(plateA, plateB, observer) {
        // Separation at plate
        const dx = (plateA.x - plateB.x);
        const dz = (plateA.z - plateB.z);
        const separation = Math.sqrt(dx * dx + dz * dz);

        // Distance from batter's eye to plate (plate is at y=0)
        const distToPlate = Math.abs(observer.y);

        // Angular separation: θ = arctan(separation / distance)
        const angleRad = Math.atan(separation / distToPlate);
        return angleRad * 180 / Math.PI;
    }

    /**
     * Classify tunnel quality based on foveal resolution
     */
    classifyTunnelQuality(tunnelAngle) {
        if (tunnelAngle < this.config.trueTunnelThreshold) {
            return 'true_tunnel';  // < 0.2° - physically indistinguishable
        } else if (tunnelAngle < this.config.goodTunnelThreshold) {
            return 'good';         // < 0.5° - very difficult to distinguish
        } else if (tunnelAngle < this.config.decentTunnelThreshold) {
            return 'decent';       // < 1.0° - some deception
        } else {
            return 'poor';         // > 1.0° - easily distinguishable
        }
    }

    /**
     * Legacy Euclidean-based tunnel score (for comparison)
     */
    computePairTunnelScoreLegacy(pitchesA, pitchesB) {
        // Compute centroid trajectories for each type
        const centroidA = this.computeCentroidTrajectory(pitchesA);
        const centroidB = this.computeCentroidTrajectory(pitchesB);

        // Compute positions at decision point and plate
        const decisionA = this.projectToDecisionPoint(centroidA);
        const decisionB = this.projectToDecisionPoint(centroidB);

        const plateA = this.getPlatePosition(centroidA);
        const plateB = this.getPlatePosition(centroidB);

        // Euclidean distances
        const tunnelDistance = this.euclideanDistance3D(decisionA, decisionB);
        const plateDistance = this.euclideanDistance2D(plateA, plateB);

        // Tunnel score: how much the pitches diverge after the decision point
        const tunnelScore = plateDistance / (tunnelDistance + 0.001);

        // Release point similarity
        const releaseA = this.computeMeanReleasePoint(pitchesA);
        const releaseB = this.computeMeanReleasePoint(pitchesB);
        const releasePointSimilarity = 1 / (1 + this.euclideanDistance3D(releaseA, releaseB));

        // Pair frequency
        const pairFrequency = this.computePairFrequency(pitchesA, pitchesB);

        return {
            tunnelScore,
            avgTunnelDistance: tunnelDistance,
            avgPlateDistance: plateDistance,
            releasePointSimilarity,
            pairFrequency,
            method: 'euclidean_legacy'
        };
    }

    /**
     * Vectorized tunnel score computation for large datasets
     * Optimized for performance using typed arrays
     * @param {Float32Array} kinematicData - Flat array of pitch kinematics
     * @param {Int32Array} pitchTypes - Pitch type indices
     * @returns {Object} Tunnel score matrix
     */
    computeTunnelScoresVectorized(kinematicData, pitchTypes) {
        const numPitches = pitchTypes.length;
        const numFeatures = 12; // vx0, vy0, vz0, ax, ay, az, release_x, release_y, release_z, plate_x, plate_z, velocity

        // Decision point time calculation based on velocity
        const decisionTimes = new Float32Array(numPitches);
        const plateTimes = new Float32Array(numPitches);

        for (let i = 0; i < numPitches; i++) {
            const velocity = kinematicData[i * numFeatures + 11];
            // Time to decision point (from release) based on velocity
            // Distance to decision point ≈ 60.5 - 23.8 = 36.7 feet from release
            const distToDecision = 36.7;
            decisionTimes[i] = distToDecision / (velocity * 1.467); // mph to ft/s
            plateTimes[i] = 60.5 / (velocity * 1.467);
        }

        // Position at decision point (vectorized)
        const decisionPositions = new Float32Array(numPitches * 3);

        for (let i = 0; i < numPitches; i++) {
            const offset = i * numFeatures;
            const t = decisionTimes[i];

            // x(t) = x0 + vx0*t + 0.5*ax*t²
            decisionPositions[i * 3 + 0] = kinematicData[offset + 6] + // release_x
                kinematicData[offset + 0] * t +   // vx0 * t
                0.5 * kinematicData[offset + 3] * t * t; // 0.5 * ax * t²

            decisionPositions[i * 3 + 1] = kinematicData[offset + 7] + // release_y
                kinematicData[offset + 1] * t +
                0.5 * kinematicData[offset + 4] * t * t;

            decisionPositions[i * 3 + 2] = kinematicData[offset + 8] + // release_z
                kinematicData[offset + 2] * t +
                0.5 * kinematicData[offset + 5] * t * t;
        }

        // Group indices by pitch type
        const typeIndices = this.groupIndicesByType(pitchTypes);
        const types = Object.keys(typeIndices);

        // Compute pairwise tunnel scores
        const tunnelMatrix = {};

        for (let i = 0; i < types.length; i++) {
            for (let j = i + 1; j < types.length; j++) {
                const typeA = types[i];
                const typeB = types[j];

                const indicesA = typeIndices[typeA];
                const indicesB = typeIndices[typeB];

                // Mean decision point positions
                const meanDecA = this.meanPosition(decisionPositions, indicesA);
                const meanDecB = this.meanPosition(decisionPositions, indicesB);

                // Mean plate positions (from raw data)
                const meanPlateA = this.meanPlatePosition(kinematicData, indicesA, numFeatures);
                const meanPlateB = this.meanPlatePosition(kinematicData, indicesB, numFeatures);

                const tunnelDist = Math.sqrt(
                    (meanDecA[0] - meanDecB[0]) ** 2 +
                    (meanDecA[1] - meanDecB[1]) ** 2 +
                    (meanDecA[2] - meanDecB[2]) ** 2
                );

                const plateDist = Math.sqrt(
                    (meanPlateA[0] - meanPlateB[0]) ** 2 +
                    (meanPlateA[1] - meanPlateB[1]) ** 2
                );

                tunnelMatrix[`${typeA}_${typeB}`] = {
                    tunnelScore: plateDist / (tunnelDist + 0.001),
                    tunnelDistance: tunnelDist,
                    plateDistance: plateDist,
                    sampleSizeA: indicesA.length,
                    sampleSizeB: indicesB.length
                };
            }
        }

        return tunnelMatrix;
    }

    /**
     * Compute the "tunnel graph" - a network representation of arsenal connectivity
     * @param {Array} tunnelScores - Pairwise tunnel scores
     * @returns {Object} Graph representation with nodes and edges
     */
    buildTunnelGraph(tunnelScores) {
        const nodes = new Set();
        const edges = [];

        for (const ts of tunnelScores) {
            nodes.add(ts.pitchA);
            nodes.add(ts.pitchB);

            edges.push({
                source: ts.pitchA,
                target: ts.pitchB,
                weight: ts.score * ts.releasePointSimilarity,
                tunnelScore: ts.score,
                frequency: ts.frequency
            });
        }

        // Compute graph metrics
        const connectivity = this.computeGraphConnectivity(Array.from(nodes), edges);

        return {
            nodes: Array.from(nodes),
            edges,
            metrics: {
                avgTunnelScore: tunnelScores.reduce((sum, ts) => sum + ts.score, 0) / tunnelScores.length,
                maxTunnelScore: Math.max(...tunnelScores.map(ts => ts.score)),
                graphDensity: edges.length / (nodes.size * (nodes.size - 1) / 2),
                connectivity
            }
        };
    }

    /**
     * Analyze tunnel evolution over a game (fatigue effects)
     * @param {Array} pitches - Chronologically ordered pitches
     * @param {number} windowSize - Rolling window size
     * @returns {Array} Tunnel scores over time
     */
    analyzeTunnelEvolution(pitches, windowSize = 20) {
        const evolution = [];

        for (let i = windowSize; i <= pitches.length; i++) {
            const window = pitches.slice(i - windowSize, i);
            const scores = this.computeTunnelScores(window);

            if (scores.length > 0) {
                evolution.push({
                    pitchNumber: i,
                    avgTunnelScore: scores.reduce((sum, s) => sum + s.score, 0) / scores.length,
                    pitchCount: i
                });
            }
        }

        // Detect fatigue (declining tunnel efficiency)
        const fatiguePoint = this.detectFatiguePoint(evolution);

        return {
            evolution,
            fatiguePoint,
            initialTunnelEfficiency: evolution[0]?.avgTunnelScore || 0,
            finalTunnelEfficiency: evolution[evolution.length - 1]?.avgTunnelScore || 0,
            degradation: evolution.length > 1 ?
                (evolution[0].avgTunnelScore - evolution[evolution.length - 1].avgTunnelScore) /
                evolution[0].avgTunnelScore : 0
        };
    }

    // === Helper Methods ===

    groupByPitchType(pitches) {
        const grouped = {};
        for (const pitch of pitches) {
            const type = pitch.pitch_type || pitch.pitchType;
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(pitch);
        }
        return grouped;
    }

    groupIndicesByType(pitchTypes) {
        const grouped = {};
        for (let i = 0; i < pitchTypes.length; i++) {
            const type = pitchTypes[i];
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(i);
        }
        return grouped;
    }

    computeCentroidTrajectory(pitches) {
        const n = pitches.length;

        return {
            vx0: pitches.reduce((s, p) => s + (p.vx0 || 0), 0) / n,
            vy0: pitches.reduce((s, p) => s + (p.vy0 || 0), 0) / n,
            vz0: pitches.reduce((s, p) => s + (p.vz0 || 0), 0) / n,
            ax: pitches.reduce((s, p) => s + (p.ax || 0), 0) / n,
            ay: pitches.reduce((s, p) => s + (p.ay || 0), 0) / n,
            az: pitches.reduce((s, p) => s + (p.az || 0), 0) / n,
            release_pos_x: pitches.reduce((s, p) => s + (p.release_pos_x || 0), 0) / n,
            release_pos_y: pitches.reduce((s, p) => s + (p.release_pos_y || 0), 0) / n,
            release_pos_z: pitches.reduce((s, p) => s + (p.release_pos_z || 0), 0) / n,
            plate_x: pitches.reduce((s, p) => s + (p.plate_x || 0), 0) / n,
            plate_z: pitches.reduce((s, p) => s + (p.plate_z || 0), 0) / n,
            velocity: pitches.reduce((s, p) => s + (p.release_speed || p.velocity || 0), 0) / n
        };
    }

    projectToDecisionPoint(trajectory) {
        // Calculate time to decision point based on velocity
        const velocity = trajectory.velocity || 90; // Default to 90 mph
        const velocityFtS = velocity * 1.467; // Convert mph to ft/s
        const distToDecision = this.config.moundToPlate - this.config.decisionPointDistance;
        const t = distToDecision / velocityFtS;

        return {
            x: trajectory.release_pos_x + trajectory.vx0 * t + 0.5 * trajectory.ax * t * t,
            y: trajectory.release_pos_y + trajectory.vy0 * t + 0.5 * trajectory.ay * t * t,
            z: trajectory.release_pos_z + trajectory.vz0 * t + 0.5 * trajectory.az * t * t
        };
    }

    getPlatePosition(trajectory) {
        return {
            x: trajectory.plate_x,
            z: trajectory.plate_z
        };
    }

    computeMeanReleasePoint(pitches) {
        const n = pitches.length;
        return {
            x: pitches.reduce((s, p) => s + (p.release_pos_x || 0), 0) / n,
            y: pitches.reduce((s, p) => s + (p.release_pos_y || 0), 0) / n,
            z: pitches.reduce((s, p) => s + (p.release_pos_z || 0), 0) / n
        };
    }

    euclideanDistance3D(a, b) {
        return Math.sqrt(
            (a.x - b.x) ** 2 +
            (a.y - b.y) ** 2 +
            (a.z - b.z) ** 2
        );
    }

    euclideanDistance2D(a, b) {
        return Math.sqrt(
            (a.x - b.x) ** 2 +
            (a.z - b.z) ** 2
        );
    }

    computePairFrequency(pitchesA, pitchesB) {
        // Estimate how often these pitch types are thrown in sequence
        // Would need sequential data to compute accurately
        const totalPitches = pitchesA.length + pitchesB.length;
        return (pitchesA.length * pitchesB.length) / (totalPitches * totalPitches);
    }

    meanPosition(positions, indices) {
        const sum = [0, 0, 0];
        for (const idx of indices) {
            sum[0] += positions[idx * 3 + 0];
            sum[1] += positions[idx * 3 + 1];
            sum[2] += positions[idx * 3 + 2];
        }
        return [sum[0] / indices.length, sum[1] / indices.length, sum[2] / indices.length];
    }

    meanPlatePosition(data, indices, stride) {
        const sum = [0, 0];
        for (const idx of indices) {
            sum[0] += data[idx * stride + 9];  // plate_x
            sum[1] += data[idx * stride + 10]; // plate_z
        }
        return [sum[0] / indices.length, sum[1] / indices.length];
    }

    computeGraphConnectivity(nodes, edges) {
        // Simple connectivity measure: average weighted degree
        const degrees = {};
        for (const node of nodes) {
            degrees[node] = 0;
        }

        for (const edge of edges) {
            degrees[edge.source] += edge.weight;
            degrees[edge.target] += edge.weight;
        }

        const avgDegree = Object.values(degrees).reduce((s, d) => s + d, 0) / nodes.length;
        return avgDegree;
    }

    detectFatiguePoint(evolution) {
        // Find inflection point where tunnel efficiency drops significantly
        if (evolution.length < 5) return null;

        // Compute rolling derivative
        for (let i = 3; i < evolution.length - 1; i++) {
            const prevSlope = (evolution[i].avgTunnelScore - evolution[i-2].avgTunnelScore) / 2;
            const currSlope = (evolution[i+1].avgTunnelScore - evolution[i-1].avgTunnelScore) / 2;

            // Significant negative change in slope
            if (prevSlope > -0.01 && currSlope < -0.03) {
                return {
                    pitchNumber: evolution[i].pitchNumber,
                    tunnelScoreAtFatigue: evolution[i].avgTunnelScore
                };
            }
        }

        return null;
    }
}
