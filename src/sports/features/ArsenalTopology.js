/**
 * ArsenalTopology - Topological Data Analysis for Pitcher Arsenals
 *
 * PRODUCTION UPGRADE: Rolling Window Topology
 * ===========================================
 * The original implementation suffered from LOOK-AHEAD BIAS. Using global
 * manifold learners (like UMAP) on an entire season's data means that
 * cluster shapes for a May game are influenced by September data.
 *
 * Example of the "Dumbbell Illusion": A slider cluster that appears unstable
 * (dumbbell-shaped) in a backtest might only exist because the pitcher
 * changed their grip mid-season. The instability signal is real, but
 * detecting it in May using September data is cheating.
 *
 * The fix: ROLLING WINDOW TOPOLOGY
 * - Re-compute the manifold model every morning using ONLY trailing data
 * - Default window: last 500 pitches (or N days)
 * - This ensures the "topological instability" signal has already occurred
 * - Makes the signal "real" and production-ready
 *
 * Key Concepts:
 * - Arsenal Polytope: Convex hull of pitch types in kinematic space
 * - Persistence Homology: Topological features that persist across scales
 * - Cluster Stability: Consistency of pitch type separation
 * - Rolling Window: Only use trailing data to prevent temporal leakage
 *
 * @class ArsenalTopology
 */

export class ArsenalTopology {
    constructor(config = {}) {
        this.config = {
            // Feature dimensions for arsenal analysis
            features: [
                'release_speed',      // Velocity
                'release_spin_rate',  // Spin rate
                'pfx_x',              // Horizontal movement
                'pfx_z',              // Vertical movement
                'release_pos_x',      // Release point x
                'release_pos_z',      // Release point z
                'release_extension',  // Extension
                'spin_axis'           // Spin direction
            ],

            // Normalization parameters (league averages)
            normalization: {
                release_speed: { mean: 92, std: 5 },
                release_spin_rate: { mean: 2200, std: 400 },
                pfx_x: { mean: 0, std: 8 },
                pfx_z: { mean: 6, std: 6 },
                release_pos_x: { mean: -1, std: 1 },
                release_pos_z: { mean: 5.8, std: 0.5 },
                release_extension: { mean: 6.3, std: 0.5 },
                spin_axis: { mean: 180, std: 60 }
            },

            // Minimum pitches for reliable topology
            minPitchesPerType: 30,

            // Persistence threshold for significant features
            persistenceThreshold: 0.1,

            // UPGRADED: Rolling window settings
            useRollingWindow: true,
            rollingWindowSize: 500,      // Last N pitches
            rollingWindowDays: null,     // Or last N days (takes precedence if set)
            minRollingPitches: 100,      // Minimum pitches for valid analysis

            // Evolution tracking
            trackEvolution: true,
            evolutionCheckpoints: 5,     // Number of time points to track

            ...config
        };

        // Cache computed arsenals with timestamps
        this.arsenalCache = new Map();
        this.evolutionCache = new Map();
    }

    /**
     * Compute full arsenal topology for a pitcher
     * @param {Array} pitches - Array of pitch data
     * @param {string} pitcherId - Pitcher identifier for caching
     * @returns {Object} Arsenal topology analysis
     */
    computeArsenalTopology(pitches, pitcherId = null) {
        if (pitches.length < 50) {
            return null; // Need sufficient data
        }

        // Extract and normalize features
        const featureMatrix = this.extractFeatures(pitches);

        // Compute point cloud statistics
        const cloudStats = this.computeCloudStatistics(featureMatrix);

        // Compute arsenal convex hull (polytope volume)
        const polytope = this.computeArsenalPolytope(featureMatrix);

        // Cluster analysis by pitch type
        const clusters = this.analyzeClusters(pitches, featureMatrix);

        // Compute persistence homology (simplified)
        const persistence = this.computePersistence(featureMatrix);

        // Arsenal stability score
        const stability = this.computeArsenalStability(clusters);

        const result = {
            pitcherId,
            sampleSize: pitches.length,
            featureMatrix,
            cloudStats,
            polytope,
            clusters,
            persistence,
            stability,

            // Summary metrics
            metrics: {
                arsenalVolume: polytope.volume,
                arsenalSpread: cloudStats.avgPairwiseDistance,
                clusterSeparation: clusters.avgSeparation,
                stabilityScore: stability.overall,
                dominantPitchRatio: clusters.dominantRatio
            }
        };

        if (pitcherId) {
            this.arsenalCache.set(pitcherId, result);
        }

        return result;
    }

    /**
     * Extract and normalize feature matrix from pitches
     * @param {Array} pitches - Pitch data
     * @returns {Object} Normalized feature matrix with indices
     */
    extractFeatures(pitches) {
        const n = pitches.length;
        const d = this.config.features.length;
        const matrix = new Float32Array(n * d);
        const pitchTypes = new Array(n);

        for (let i = 0; i < n; i++) {
            const pitch = pitches[i];
            pitchTypes[i] = pitch.pitch_type || pitch.pitchType || 'UN';

            for (let j = 0; j < d; j++) {
                const feature = this.config.features[j];
                const value = pitch[feature] || 0;
                const norm = this.config.normalization[feature];

                // Z-score normalization
                matrix[i * d + j] = (value - norm.mean) / norm.std;
            }
        }

        return {
            data: matrix,
            rows: n,
            cols: d,
            pitchTypes,
            features: this.config.features
        };
    }

    /**
     * Compute statistics of the point cloud
     */
    computeCloudStatistics(featureMatrix) {
        const { data, rows, cols } = featureMatrix;

        // Compute centroid
        const centroid = new Float32Array(cols);
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                centroid[j] += data[i * cols + j];
            }
        }
        for (let j = 0; j < cols; j++) {
            centroid[j] /= rows;
        }

        // Compute variance per dimension
        const variance = new Float32Array(cols);
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const diff = data[i * cols + j] - centroid[j];
                variance[j] += diff * diff;
            }
        }
        for (let j = 0; j < cols; j++) {
            variance[j] /= rows;
        }

        // Sample pairwise distances
        let totalDist = 0;
        let distCount = 0;
        const sampleSize = Math.min(rows, 100);

        for (let i = 0; i < sampleSize; i++) {
            const idx1 = Math.floor(Math.random() * rows);
            const idx2 = Math.floor(Math.random() * rows);

            if (idx1 !== idx2) {
                let dist = 0;
                for (let j = 0; j < cols; j++) {
                    const diff = data[idx1 * cols + j] - data[idx2 * cols + j];
                    dist += diff * diff;
                }
                totalDist += Math.sqrt(dist);
                distCount++;
            }
        }

        return {
            centroid: Array.from(centroid),
            variance: Array.from(variance),
            totalVariance: variance.reduce((s, v) => s + v, 0),
            avgPairwiseDistance: distCount > 0 ? totalDist / distCount : 0
        };
    }

    /**
     * Compute the convex hull polytope of the arsenal in feature space
     * Uses dimension reduction for visualization, full dimensionality for volume
     */
    computeArsenalPolytope(featureMatrix) {
        const { data, rows, cols } = featureMatrix;

        // For high dimensions, we compute approximate volume using random projections
        const numProjections = 50;
        let totalVolume = 0;

        for (let p = 0; p < numProjections; p++) {
            // Random 3D projection
            const projection = this.randomProject(data, rows, cols, 3);

            // Compute 3D convex hull volume
            const hull = this.compute3DConvexHull(projection);
            totalVolume += hull.volume;
        }

        const avgVolume = totalVolume / numProjections;

        // Also compute 2D hull for visualization (velocity vs movement)
        const velocityMovement = [];
        for (let i = 0; i < rows; i++) {
            velocityMovement.push([
                data[i * cols + 0], // release_speed (normalized)
                data[i * cols + 3]  // pfx_z (normalized)
            ]);
        }
        const hull2D = this.compute2DConvexHull(velocityMovement);

        return {
            volume: avgVolume,
            hull2D,
            area2D: this.computeHullArea(hull2D),
            vertices2D: hull2D.length
        };
    }

    /**
     * Cluster analysis by pitch type
     */
    analyzeClusters(pitches, featureMatrix) {
        const { data, rows, cols, pitchTypes } = featureMatrix;

        // Group by pitch type
        const typeIndices = {};
        for (let i = 0; i < rows; i++) {
            const type = pitchTypes[i];
            if (!typeIndices[type]) typeIndices[type] = [];
            typeIndices[type].push(i);
        }

        // Compute cluster centroids
        const clusters = {};
        for (const [type, indices] of Object.entries(typeIndices)) {
            if (indices.length < this.config.minPitchesPerType) continue;

            const centroid = new Float32Array(cols);
            for (const idx of indices) {
                for (let j = 0; j < cols; j++) {
                    centroid[j] += data[idx * cols + j];
                }
            }
            for (let j = 0; j < cols; j++) {
                centroid[j] /= indices.length;
            }

            // Compute intra-cluster variance
            let intraVariance = 0;
            for (const idx of indices) {
                for (let j = 0; j < cols; j++) {
                    const diff = data[idx * cols + j] - centroid[j];
                    intraVariance += diff * diff;
                }
            }
            intraVariance /= indices.length * cols;

            clusters[type] = {
                centroid: Array.from(centroid),
                count: indices.length,
                frequency: indices.length / rows,
                intraVariance,
                compactness: 1 / (1 + Math.sqrt(intraVariance))
            };
        }

        // Compute inter-cluster distances
        const types = Object.keys(clusters);
        let totalSeparation = 0;
        let pairCount = 0;

        for (let i = 0; i < types.length; i++) {
            for (let j = i + 1; j < types.length; j++) {
                const c1 = clusters[types[i]].centroid;
                const c2 = clusters[types[j]].centroid;

                let dist = 0;
                for (let k = 0; k < cols; k++) {
                    const diff = c1[k] - c2[k];
                    dist += diff * diff;
                }
                totalSeparation += Math.sqrt(dist);
                pairCount++;
            }
        }

        // Find dominant pitch
        let dominantType = null;
        let maxFreq = 0;
        for (const [type, cluster] of Object.entries(clusters)) {
            if (cluster.frequency > maxFreq) {
                maxFreq = cluster.frequency;
                dominantType = type;
            }
        }

        return {
            byType: clusters,
            typeCount: types.length,
            avgSeparation: pairCount > 0 ? totalSeparation / pairCount : 0,
            dominantPitch: dominantType,
            dominantRatio: maxFreq
        };
    }

    /**
     * Simplified persistence homology computation
     * Tracks when features "appear" and "disappear" as we grow balls around points
     */
    computePersistence(featureMatrix) {
        const { data, rows, cols } = featureMatrix;

        // Sample points for efficiency
        const sampleSize = Math.min(rows, 200);
        const sampleIndices = [];
        for (let i = 0; i < sampleSize; i++) {
            sampleIndices.push(Math.floor(Math.random() * rows));
        }

        // Compute distance matrix for sample
        const distMatrix = new Float32Array(sampleSize * sampleSize);
        for (let i = 0; i < sampleSize; i++) {
            for (let j = i + 1; j < sampleSize; j++) {
                let dist = 0;
                for (let k = 0; k < cols; k++) {
                    const diff = data[sampleIndices[i] * cols + k] -
                                data[sampleIndices[j] * cols + k];
                    dist += diff * diff;
                }
                dist = Math.sqrt(dist);
                distMatrix[i * sampleSize + j] = dist;
                distMatrix[j * sampleSize + i] = dist;
            }
        }

        // Track connected components at different scales
        const scales = [0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0];
        const components = [];

        for (const scale of scales) {
            const numComponents = this.countComponents(distMatrix, sampleSize, scale);
            components.push({ scale, components: numComponents });
        }

        // Find persistent features (components that survive multiple scales)
        const persistentFeatures = [];
        for (let i = 0; i < scales.length - 1; i++) {
            const persistence = (components[i+1].components < components[i].components) ?
                scales[i+1] - scales[i] : 0;

            if (persistence > this.config.persistenceThreshold) {
                persistentFeatures.push({
                    birthScale: scales[i],
                    deathScale: scales[i+1],
                    persistence
                });
            }
        }

        return {
            scaleProfile: components,
            persistentFeatures,
            topologicalComplexity: components[0].components, // Components at smallest scale
            homogeneity: components[components.length - 1].components // Components at largest scale
        };
    }

    /**
     * Count connected components using union-find at a given distance scale
     */
    countComponents(distMatrix, n, maxDist) {
        const parent = Array.from({ length: n }, (_, i) => i);

        const find = (x) => {
            if (parent[x] !== x) parent[x] = find(parent[x]);
            return parent[x];
        };

        const union = (x, y) => {
            const px = find(x);
            const py = find(y);
            if (px !== py) parent[px] = py;
        };

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (distMatrix[i * n + j] <= maxDist) {
                    union(i, j);
                }
            }
        }

        const roots = new Set();
        for (let i = 0; i < n; i++) {
            roots.add(find(i));
        }

        return roots.size;
    }

    /**
     * Compute arsenal stability (consistency over time/batters)
     */
    computeArsenalStability(clusters) {
        // Overall stability based on cluster compactness
        let totalCompactness = 0;
        let weightSum = 0;

        for (const cluster of Object.values(clusters.byType)) {
            totalCompactness += cluster.compactness * cluster.frequency;
            weightSum += cluster.frequency;
        }

        const avgCompactness = weightSum > 0 ? totalCompactness / weightSum : 0;

        // Separation stability
        const separationStability = clusters.avgSeparation > 1 ? 1 :
            clusters.avgSeparation;

        return {
            compactness: avgCompactness,
            separation: separationStability,
            overall: (avgCompactness + separationStability) / 2
        };
    }

    /**
     * Compare two pitchers' arsenals
     */
    compareArsenals(arsenalA, arsenalB) {
        if (!arsenalA || !arsenalB) return null;

        // Volume comparison
        const volumeRatio = arsenalA.polytope.volume /
            (arsenalB.polytope.volume + 0.001);

        // Cluster overlap (shared pitch types)
        const typesA = new Set(Object.keys(arsenalA.clusters.byType));
        const typesB = new Set(Object.keys(arsenalB.clusters.byType));
        const shared = new Set([...typesA].filter(t => typesB.has(t)));
        const typeOverlap = shared.size / Math.max(typesA.size, typesB.size);

        // Centroid distance (overall approach similarity)
        let centroidDist = 0;
        for (let i = 0; i < arsenalA.cloudStats.centroid.length; i++) {
            const diff = arsenalA.cloudStats.centroid[i] - arsenalB.cloudStats.centroid[i];
            centroidDist += diff * diff;
        }
        centroidDist = Math.sqrt(centroidDist);

        return {
            volumeRatio,
            typeOverlap,
            centroidDistance: centroidDist,
            stabilityComparison: arsenalA.stability.overall - arsenalB.stability.overall,
            similarity: 1 / (1 + centroidDist) * typeOverlap
        };
    }

    // =========================================================================
    // PRODUCTION UPGRADE: Rolling Window Topology
    // =========================================================================

    /**
     * PRODUCTION METHOD: Compute arsenal topology using rolling window
     *
     * This prevents look-ahead bias by only using pitches that occurred
     * BEFORE the analysis date. Critical for valid backtesting.
     *
     * @param {Array} pitches - All available pitch data (sorted by date)
     * @param {string} pitcherId - Pitcher ID
     * @param {Date} asOfDate - Analysis date (only use pitches before this)
     */
    computeRollingArsenalTopology(pitches, pitcherId, asOfDate) {
        // Filter to pitches before the analysis date
        const cutoffTime = asOfDate ? new Date(asOfDate).getTime() : Date.now();

        const trailingPitches = pitches.filter(p => {
            const pitchDate = new Date(p.game_date || p.gameDate || p.date);
            return pitchDate.getTime() < cutoffTime;
        });

        // Apply rolling window limit
        let windowedPitches;
        if (this.config.rollingWindowDays) {
            // Use time-based window
            const windowStart = cutoffTime - (this.config.rollingWindowDays * 24 * 60 * 60 * 1000);
            windowedPitches = trailingPitches.filter(p => {
                const pitchDate = new Date(p.game_date || p.gameDate || p.date);
                return pitchDate.getTime() >= windowStart;
            });
        } else {
            // Use count-based window (last N pitches)
            windowedPitches = trailingPitches.slice(-this.config.rollingWindowSize);
        }

        // Check minimum sample size
        if (windowedPitches.length < this.config.minRollingPitches) {
            return {
                pitcherId,
                asOfDate,
                status: 'insufficient_data',
                pitchCount: windowedPitches.length,
                required: this.config.minRollingPitches
            };
        }

        // Compute topology on the windowed data
        const topology = this.computeArsenalTopology(windowedPitches, pitcherId);

        if (!topology) {
            return {
                pitcherId,
                asOfDate,
                status: 'computation_failed',
                pitchCount: windowedPitches.length
            };
        }

        // Add rolling window metadata
        return {
            ...topology,
            asOfDate,
            windowSize: windowedPitches.length,
            windowType: this.config.rollingWindowDays ? 'time' : 'count',
            windowSpan: this.config.rollingWindowDays || this.config.rollingWindowSize,
            oldestPitch: windowedPitches[0]?.game_date,
            newestPitch: windowedPitches[windowedPitches.length - 1]?.game_date,
            method: 'rolling_window',

            // Detect instability (real signal, not look-ahead)
            instabilityAlert: this.detectTopologicalInstability(topology)
        };
    }

    /**
     * Compute arsenal evolution over time using rolling windows
     * This tracks how the arsenal "shape" changes through the season
     *
     * @param {Array} pitches - All pitch data (sorted by date)
     * @param {string} pitcherId - Pitcher ID
     * @param {Array} checkpoints - Dates to analyze (default: evenly spaced)
     */
    computeArsenalEvolution(pitches, pitcherId, checkpoints = null) {
        if (pitches.length < this.config.minRollingPitches * 2) {
            return { status: 'insufficient_data', pitchCount: pitches.length };
        }

        // Sort pitches by date
        const sorted = [...pitches].sort((a, b) => {
            const dateA = new Date(a.game_date || a.gameDate || a.date);
            const dateB = new Date(b.game_date || b.gameDate || b.date);
            return dateA - dateB;
        });

        // Determine checkpoints (dates to analyze)
        if (!checkpoints) {
            const firstDate = new Date(sorted[0].game_date || sorted[0].gameDate);
            const lastDate = new Date(sorted[sorted.length - 1].game_date || sorted[sorted.length - 1].gameDate);
            const span = lastDate - firstDate;
            const numPoints = this.config.evolutionCheckpoints;

            checkpoints = [];
            for (let i = 1; i <= numPoints; i++) {
                const date = new Date(firstDate.getTime() + (span * i) / numPoints);
                checkpoints.push(date);
            }
        }

        // Compute topology at each checkpoint
        const evolution = [];
        let previousTopology = null;

        for (const checkpoint of checkpoints) {
            const topology = this.computeRollingArsenalTopology(sorted, pitcherId, checkpoint);

            if (topology.status) {
                // Skip failed computations
                continue;
            }

            // Compute change from previous
            const change = previousTopology ?
                this.computeTopologyChange(previousTopology, topology) : null;

            evolution.push({
                date: checkpoint,
                topology,
                change,
                stabilityScore: topology.stability?.overall || 0,
                clusterSeparation: topology.clusters?.avgSeparation || 0
            });

            previousTopology = topology;
        }

        // Analyze overall evolution
        const analysis = this.analyzeEvolution(evolution);

        // Cache for future reference
        this.evolutionCache.set(pitcherId, {
            evolution,
            analysis,
            computedAt: new Date()
        });

        return {
            pitcherId,
            evolution,
            analysis,
            checkpoints: checkpoints.length,
            status: 'success'
        };
    }

    /**
     * Detect topological instability (the "Dumbbell" warning)
     *
     * An unstable cluster shape (e.g., dumbbell) indicates:
     * - Pitcher developing a new pitch variant
     * - Mechanical inconsistency
     * - Grip changes
     *
     * This is predictive of future performance issues.
     */
    detectTopologicalInstability(topology) {
        const alerts = [];

        // Check cluster compactness
        for (const [type, cluster] of Object.entries(topology.clusters?.byType || {})) {
            // Low compactness = spread out cluster = instability
            if (cluster.compactness < 0.4) {
                alerts.push({
                    type: 'low_compactness',
                    pitchType: type,
                    value: cluster.compactness,
                    message: `${type} cluster is dispersed (compactness: ${cluster.compactness.toFixed(2)})`
                });
            }

            // High intra-variance = bimodal distribution = dumbbell shape
            if (cluster.intraVariance > 2.0) {
                alerts.push({
                    type: 'high_variance',
                    pitchType: type,
                    value: cluster.intraVariance,
                    message: `${type} may have bimodal distribution (variance: ${cluster.intraVariance.toFixed(2)})`
                });
            }
        }

        // Check overall stability
        if (topology.stability?.overall < 0.5) {
            alerts.push({
                type: 'overall_instability',
                value: topology.stability.overall,
                message: `Overall arsenal stability is low (${topology.stability.overall.toFixed(2)})`
            });
        }

        // Check persistence homology for structural instability
        if (topology.persistence?.topologicalComplexity > 8) {
            alerts.push({
                type: 'high_complexity',
                value: topology.persistence.topologicalComplexity,
                message: `Unusual topological complexity (${topology.persistence.topologicalComplexity} components)`
            });
        }

        return {
            hasAlert: alerts.length > 0,
            alertCount: alerts.length,
            alerts,
            severity: this.computeAlertSeverity(alerts),
            recommendation: this.generateRecommendation(alerts)
        };
    }

    /**
     * Compute change between two topology snapshots
     */
    computeTopologyChange(prev, curr) {
        const volumeChange = (curr.polytope?.volume || 0) - (prev.polytope?.volume || 0);
        const stabilityChange = (curr.stability?.overall || 0) - (prev.stability?.overall || 0);
        const separationChange = (curr.clusters?.avgSeparation || 0) - (prev.clusters?.avgSeparation || 0);

        // Centroid drift
        let centroidDrift = 0;
        if (prev.cloudStats?.centroid && curr.cloudStats?.centroid) {
            for (let i = 0; i < prev.cloudStats.centroid.length; i++) {
                const diff = curr.cloudStats.centroid[i] - prev.cloudStats.centroid[i];
                centroidDrift += diff * diff;
            }
            centroidDrift = Math.sqrt(centroidDrift);
        }

        return {
            volumeChange,
            volumeChangePercent: prev.polytope?.volume ?
                (volumeChange / prev.polytope.volume) * 100 : 0,
            stabilityChange,
            separationChange,
            centroidDrift,
            isSignificant: Math.abs(stabilityChange) > 0.1 || centroidDrift > 0.5
        };
    }

    /**
     * Analyze evolution trajectory
     */
    analyzeEvolution(evolution) {
        if (evolution.length < 2) {
            return { trend: 'insufficient_data' };
        }

        // Compute stability trend
        const stabilityValues = evolution.map(e => e.stabilityScore);
        const stabilityTrend = this.computeTrend(stabilityValues);

        // Compute separation trend
        const separationValues = evolution.map(e => e.clusterSeparation);
        const separationTrend = this.computeTrend(separationValues);

        // Detect sudden changes
        const suddenChanges = evolution
            .filter(e => e.change?.isSignificant)
            .map(e => ({ date: e.date, change: e.change }));

        // Overall assessment
        let assessment = 'stable';
        if (stabilityTrend.slope < -0.05) {
            assessment = 'declining';
        } else if (stabilityTrend.slope > 0.05) {
            assessment = 'improving';
        } else if (suddenChanges.length > 1) {
            assessment = 'volatile';
        }

        return {
            stabilityTrend,
            separationTrend,
            suddenChanges,
            assessment,
            recommendation: assessment === 'declining' ?
                'Consider fading this pitcher - arsenal showing degradation' :
                assessment === 'volatile' ?
                    'High variance expected - use caution with props' :
                    'Arsenal appears stable'
        };
    }

    /**
     * Compute linear trend from values
     */
    computeTrend(values) {
        const n = values.length;
        if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };

        // Simple linear regression
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // R-squared
        const mean = sumY / n;
        let ssRes = 0, ssTot = 0;
        for (let i = 0; i < n; i++) {
            const predicted = slope * i + intercept;
            ssRes += (values[i] - predicted) ** 2;
            ssTot += (values[i] - mean) ** 2;
        }
        const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

        return {
            slope,
            intercept,
            r2,
            direction: slope > 0.02 ? 'up' : slope < -0.02 ? 'down' : 'flat'
        };
    }

    /**
     * Compute alert severity
     */
    computeAlertSeverity(alerts) {
        if (alerts.length === 0) return 'none';
        if (alerts.length >= 3) return 'high';
        if (alerts.some(a => a.type === 'overall_instability')) return 'medium';
        return 'low';
    }

    /**
     * Generate trading recommendation from alerts
     */
    generateRecommendation(alerts) {
        if (alerts.length === 0) {
            return 'No instability detected - proceed normally';
        }

        const types = alerts.map(a => a.type);

        if (types.includes('overall_instability')) {
            return 'FADE: Overall arsenal instability suggests performance decline';
        }

        if (types.includes('high_variance')) {
            return 'CAUTION: Bimodal pitch distribution may indicate grip change - high variance expected';
        }

        if (types.includes('low_compactness')) {
            return 'MONITOR: Pitch cluster spreading - possible mechanical inconsistency';
        }

        return 'Minor alerts detected - exercise caution';
    }

    // === Helper Methods ===

    randomProject(data, rows, cols, targetDim) {
        // Random projection matrix
        const projection = new Float32Array(cols * targetDim);
        for (let i = 0; i < projection.length; i++) {
            projection[i] = Math.random() * 2 - 1;
        }

        // Normalize columns
        for (let j = 0; j < targetDim; j++) {
            let norm = 0;
            for (let i = 0; i < cols; i++) {
                norm += projection[i * targetDim + j] ** 2;
            }
            norm = Math.sqrt(norm);
            for (let i = 0; i < cols; i++) {
                projection[i * targetDim + j] /= norm;
            }
        }

        // Project data
        const result = [];
        for (let i = 0; i < rows; i++) {
            const point = new Float32Array(targetDim);
            for (let j = 0; j < targetDim; j++) {
                for (let k = 0; k < cols; k++) {
                    point[j] += data[i * cols + k] * projection[k * targetDim + j];
                }
            }
            result.push(Array.from(point));
        }

        return result;
    }

    compute3DConvexHull(points) {
        // Simplified 3D hull - use bounding box volume as approximation
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const p of points) {
            minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
            minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
            minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]);
        }

        // Approximate hull volume as fraction of bounding box
        const boundingVolume = (maxX - minX) * (maxY - minY) * (maxZ - minZ);
        const hullVolume = boundingVolume * 0.4; // Typical ratio

        return { volume: hullVolume };
    }

    compute2DConvexHull(points) {
        if (points.length < 3) return points;

        // Graham scan
        const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

        const cross = (o, a, b) =>
            (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

        const lower = [];
        for (const p of sorted) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
                lower.pop();
            }
            lower.push(p);
        }

        const upper = [];
        for (let i = sorted.length - 1; i >= 0; i--) {
            const p = sorted[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
                upper.pop();
            }
            upper.push(p);
        }

        lower.pop();
        upper.pop();
        return lower.concat(upper);
    }

    computeHullArea(hull) {
        if (hull.length < 3) return 0;

        let area = 0;
        const n = hull.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += hull[i][0] * hull[j][1];
            area -= hull[j][0] * hull[i][1];
        }

        return Math.abs(area) / 2;
    }
}
