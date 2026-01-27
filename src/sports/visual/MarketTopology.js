/**
 * MarketTopology - Topological Analysis of Betting Market Dynamics
 *
 * Applies Topological Data Analysis (TDA) concepts to betting markets:
 * - Persistence homology for identifying stable market structures
 * - Manifold learning for odds movement patterns
 * - Cluster detection for correlated opportunity groups
 *
 * Key Insight: Markets have "shape" - the topology of odds movement
 * reveals inefficiencies that numerical analysis misses.
 *
 * Concepts:
 * - HOLES in market topology = arbitrage opportunities
 * - PERSISTENCE = how long an edge survives
 * - CONNECTED COMPONENTS = correlated bet clusters
 * - BETTI NUMBERS = complexity of opportunity space
 *
 * @module MarketTopology
 * @version 1.0.0
 */

import { Vec4 } from '../../math/Vec4.js';

// ============================================================================
// TOPOLOGICAL FEATURES
// ============================================================================

/**
 * Persistence point in the persistence diagram
 * Birth = when feature appears, Death = when it disappears
 */
export class PersistencePoint {
    constructor(birth, death, dimension, feature = null) {
        this.birth = birth;           // When feature emerged
        this.death = death;           // When feature disappeared (Infinity if still alive)
        this.dimension = dimension;   // 0 = component, 1 = loop, 2 = void
        this.feature = feature;       // Associated market feature
    }

    /**
     * Persistence = lifetime of the feature
     * Higher persistence = more significant/stable feature
     */
    get persistence() {
        if (this.death === Infinity) return Infinity;
        return this.death - this.birth;
    }

    /**
     * Is this feature still alive?
     */
    get isAlive() {
        return this.death === Infinity;
    }
}

/**
 * Market state snapshot for topology tracking
 */
export class MarketSnapshot {
    constructor(timestamp, opportunities) {
        this.timestamp = timestamp;
        this.opportunities = opportunities;
        this.edges = new Map();      // gameId → edge value
        this.positions = new Map();  // gameId → 4D position

        for (const opp of opportunities) {
            this.edges.set(opp.gameId, opp.modelProb - opp.impliedProb);
            this.positions.set(opp.gameId, new Vec4(
                opp.modelProb - 0.5,
                opp.impliedProb - 0.5,
                (opp.confidence || 0.5) - 0.5,
                (opp.edge || 0) * 10
            ));
        }
    }
}

// ============================================================================
// MARKET TOPOLOGY ENGINE
// ============================================================================

export class MarketTopology {
    constructor(config = {}) {
        this.config = {
            // Snapshot history length
            maxSnapshots: 120,         // 2 minutes at 1 Hz

            // Persistence thresholds
            minPersistence: 0.01,      // Minimum persistence to consider significant
            edgeThreshold: 0.02,       // Minimum edge to create feature

            // Clustering parameters
            clusterEpsilon: 0.15,      // Distance threshold for clustering
            minClusterSize: 2,         // Minimum points for a cluster

            // Topology update rate
            updateInterval: 1000,      // ms

            ...config
        };

        // State
        this.snapshots = [];           // Time series of market states
        this.persistenceDiagram = [];  // Current persistence features
        this.clusters = [];            // Current opportunity clusters
        this.holes = [];               // Detected "holes" (arbitrage-like)

        // Tracked features
        this.activeFeatures = new Map(); // featureId → PersistencePoint
        this.featureCounter = 0;

        // Callbacks
        this.onTopologyChange = null;
        this.onHoleDetected = null;
    }

    // ========================================================================
    // SNAPSHOT MANAGEMENT
    // ========================================================================

    /**
     * Add a new market snapshot
     * @param {Array} opportunities - Current betting opportunities
     */
    addSnapshot(opportunities) {
        const snapshot = new MarketSnapshot(Date.now(), opportunities);
        this.snapshots.push(snapshot);

        // Trim history
        while (this.snapshots.length > this.config.maxSnapshots) {
            this.snapshots.shift();
        }

        // Update topology
        this._updateTopology(snapshot);

        return snapshot;
    }

    /**
     * Get time series of edge values for a game
     */
    getEdgeTimeSeries(gameId) {
        return this.snapshots
            .filter(s => s.edges.has(gameId))
            .map(s => ({
                timestamp: s.timestamp,
                edge: s.edges.get(gameId)
            }));
    }

    // ========================================================================
    // TOPOLOGICAL ANALYSIS
    // ========================================================================

    /**
     * Update the topological analysis
     */
    _updateTopology(currentSnapshot) {
        // 1. Update persistence diagram
        this._updatePersistence(currentSnapshot);

        // 2. Detect clusters
        this._detectClusters(currentSnapshot);

        // 3. Detect holes (market inefficiencies)
        this._detectHoles(currentSnapshot);

        // 4. Calculate Betti numbers
        const betti = this._calculateBettiNumbers();

        // Notify listeners
        if (this.onTopologyChange) {
            this.onTopologyChange({
                persistence: this.persistenceDiagram,
                clusters: this.clusters,
                holes: this.holes,
                betti
            });
        }
    }

    /**
     * Update persistence diagram based on new snapshot
     *
     * Track features that:
     * - "Birth" when edge exceeds threshold
     * - "Die" when edge drops below threshold
     * - Persistence = total time the edge existed
     */
    _updatePersistence(snapshot) {
        const currentTime = snapshot.timestamp;
        const birthTime = this.snapshots.length > 0 ?
            this.snapshots[0].timestamp : currentTime;

        // Normalized time (0-1 over history window)
        const normalizedTime = (currentTime - birthTime) /
            Math.max(1, currentTime - birthTime);

        // Check each opportunity
        for (const [gameId, edge] of snapshot.edges) {
            const featureId = `edge_${gameId}`;

            if (edge >= this.config.edgeThreshold) {
                // Feature is alive
                if (!this.activeFeatures.has(featureId)) {
                    // Birth of new feature
                    const point = new PersistencePoint(
                        normalizedTime,
                        Infinity,
                        0, // Dimension 0 = connected component
                        { gameId, type: 'edge', initialEdge: edge }
                    );
                    this.activeFeatures.set(featureId, point);
                }
            } else {
                // Feature dies
                if (this.activeFeatures.has(featureId)) {
                    const point = this.activeFeatures.get(featureId);
                    point.death = normalizedTime;

                    // Add to diagram if significant persistence
                    if (point.persistence >= this.config.minPersistence) {
                        this.persistenceDiagram.push(point);
                    }

                    this.activeFeatures.delete(featureId);
                }
            }
        }

        // Prune old diagram entries
        const cutoffTime = normalizedTime - 0.5; // Keep last half of history
        this.persistenceDiagram = this.persistenceDiagram.filter(
            p => p.death > cutoffTime || p.death === Infinity
        );
    }

    /**
     * Detect clusters of similar opportunities
     * Uses simplified DBSCAN-like approach in 4D space
     */
    _detectClusters(snapshot) {
        const positions = Array.from(snapshot.positions.entries());
        if (positions.length < this.config.minClusterSize) {
            this.clusters = [];
            return;
        }

        // Build distance matrix
        const n = positions.length;
        const distances = [];
        for (let i = 0; i < n; i++) {
            distances[i] = [];
            for (let j = 0; j < n; j++) {
                const pi = positions[i][1];
                const pj = positions[j][1];
                distances[i][j] = pi.subtract(pj).magnitude();
            }
        }

        // Simple clustering: find connected components below epsilon
        const visited = new Set();
        const clusters = [];

        for (let i = 0; i < n; i++) {
            if (visited.has(i)) continue;

            const cluster = {
                members: [],
                centroid: new Vec4(0, 0, 0, 0),
                gameIds: []
            };

            // BFS to find all connected points
            const queue = [i];
            while (queue.length > 0) {
                const current = queue.shift();
                if (visited.has(current)) continue;
                visited.add(current);

                cluster.members.push(current);
                cluster.gameIds.push(positions[current][0]);
                cluster.centroid = cluster.centroid.add(positions[current][1]);

                // Add neighbors within epsilon
                for (let j = 0; j < n; j++) {
                    if (!visited.has(j) && distances[current][j] < this.config.clusterEpsilon) {
                        queue.push(j);
                    }
                }
            }

            // Finalize cluster
            if (cluster.members.length >= this.config.minClusterSize) {
                cluster.centroid = cluster.centroid.scale(1 / cluster.members.length);
                cluster.size = cluster.members.length;
                cluster.radius = Math.max(...cluster.members.map(m =>
                    positions[m][1].subtract(cluster.centroid).magnitude()
                ));
                clusters.push(cluster);
            }
        }

        this.clusters = clusters;
    }

    /**
     * Detect "holes" in the market topology
     *
     * A hole represents:
     * - A region where edges SHOULD exist but don't
     * - Potential arbitrage or mispricing
     * - Market inefficiency
     *
     * We detect this by finding:
     * - Clusters with high edge variance
     * - Gaps between related games
     * - Persistence diagram anomalies
     */
    _detectHoles(snapshot) {
        this.holes = [];

        // Method 1: Cluster holes
        // If a cluster has high internal variance, there's a "hole"
        for (const cluster of this.clusters) {
            if (cluster.members.length < 3) continue;

            // Calculate edge variance within cluster
            const edges = cluster.gameIds.map(id => snapshot.edges.get(id) || 0);
            const mean = edges.reduce((a, b) => a + b, 0) / edges.length;
            const variance = edges.reduce((a, e) => a + (e - mean) ** 2, 0) / edges.length;

            if (variance > 0.001) { // High variance = potential inefficiency
                this.holes.push({
                    type: 'cluster_variance',
                    cluster: cluster.gameIds,
                    variance,
                    centroid: cluster.centroid,
                    description: `High edge variance (${(Math.sqrt(variance) * 100).toFixed(1)}%) in correlated games`,
                    significance: Math.min(1, variance * 100)
                });
            }
        }

        // Method 2: Persistence holes
        // Features that died quickly but had high initial edge
        for (const point of this.persistenceDiagram) {
            if (point.persistence < 0.1 && point.feature?.initialEdge > 0.05) {
                this.holes.push({
                    type: 'vanishing_edge',
                    gameId: point.feature.gameId,
                    persistence: point.persistence,
                    initialEdge: point.feature.initialEdge,
                    description: `Edge of ${(point.feature.initialEdge * 100).toFixed(1)}% vanished quickly`,
                    significance: point.feature.initialEdge / point.persistence
                });
            }
        }

        // Method 3: Cross-game inconsistencies
        // If two games have opposite edges but should be related
        if (snapshot.opportunities.length >= 2) {
            const opps = snapshot.opportunities;
            for (let i = 0; i < opps.length; i++) {
                for (let j = i + 1; j < opps.length; j++) {
                    const edgeI = snapshot.edges.get(opps[i].gameId) || 0;
                    const edgeJ = snapshot.edges.get(opps[j].gameId) || 0;

                    // If edges are opposite signs and significant
                    if (edgeI * edgeJ < 0 && Math.abs(edgeI) > 0.02 && Math.abs(edgeJ) > 0.02) {
                        this.holes.push({
                            type: 'opposing_edges',
                            games: [opps[i].gameId, opps[j].gameId],
                            edges: [edgeI, edgeJ],
                            description: `Opposing edges: ${opps[i].gameId} (${(edgeI*100).toFixed(1)}%) vs ${opps[j].gameId} (${(edgeJ*100).toFixed(1)}%)`,
                            significance: Math.abs(edgeI - edgeJ)
                        });
                    }
                }
            }
        }

        // Sort by significance
        this.holes.sort((a, b) => b.significance - a.significance);

        // Notify if significant holes detected
        if (this.holes.length > 0 && this.onHoleDetected) {
            this.onHoleDetected(this.holes);
        }
    }

    /**
     * Calculate Betti numbers (topological complexity measures)
     *
     * β₀ = number of connected components (clusters)
     * β₁ = number of 1-dimensional holes (loops)
     * β₂ = number of 2-dimensional voids
     *
     * For betting:
     * - High β₀ = fragmented market, many independent opportunities
     * - High β₁ = complex correlations, potential arbitrage loops
     * - High β₂ = multi-way inefficiencies
     */
    _calculateBettiNumbers() {
        // β₀ = clusters + singleton opportunities
        const beta0 = this.clusters.length +
            (this.snapshots.length > 0 ?
                this.snapshots[this.snapshots.length - 1].opportunities.filter(
                    o => !this.clusters.some(c => c.gameIds.includes(o.gameId))
                ).length : 0);

        // β₁ = count of dimension-1 features in persistence diagram
        const beta1 = this.persistenceDiagram.filter(p => p.dimension === 1).length;

        // β₂ = count of holes detected
        const beta2 = this.holes.length;

        return { beta0, beta1, beta2 };
    }

    // ========================================================================
    // ANALYSIS METHODS
    // ========================================================================

    /**
     * Get the most persistent edges (long-lasting opportunities)
     */
    getMostPersistentEdges(limit = 5) {
        // Combine active features with recently dead ones
        const all = [
            ...Array.from(this.activeFeatures.values()),
            ...this.persistenceDiagram
        ];

        return all
            .filter(p => p.dimension === 0 && p.feature?.type === 'edge')
            .sort((a, b) => {
                const pa = a.persistence === Infinity ? 1000 : a.persistence;
                const pb = b.persistence === Infinity ? 1000 : b.persistence;
                return pb - pa;
            })
            .slice(0, limit)
            .map(p => ({
                gameId: p.feature.gameId,
                persistence: p.persistence,
                isAlive: p.isAlive,
                initialEdge: p.feature.initialEdge
            }));
    }

    /**
     * Get market complexity score
     * Higher = more complex = potentially more opportunities but also more risk
     */
    getComplexityScore() {
        const betti = this._calculateBettiNumbers();

        // Weighted combination of Betti numbers
        const complexity = (
            betti.beta0 * 0.3 +   // Components
            betti.beta1 * 0.5 +   // Loops (most important for arbitrage)
            betti.beta2 * 0.2     // Voids
        ) / Math.max(1, this.snapshots.length > 0 ?
            this.snapshots[this.snapshots.length - 1].opportunities.length : 1);

        return Math.min(1, complexity);
    }

    /**
     * Get stability score
     * Higher = more stable = edges are persisting
     */
    getStabilityScore() {
        if (this.activeFeatures.size === 0) return 0;

        // Average persistence of active features
        let totalPersistence = 0;
        for (const point of this.activeFeatures.values()) {
            // Use time since birth as proxy for current persistence
            totalPersistence += 1 - point.birth;
        }

        return totalPersistence / this.activeFeatures.size;
    }

    /**
     * Get correlation structure of current opportunities
     */
    getCorrelationStructure() {
        return this.clusters.map(c => ({
            games: c.gameIds,
            size: c.size,
            radius: c.radius,
            cohesion: 1 - c.radius / Math.max(0.01, this.config.clusterEpsilon)
        }));
    }

    /**
     * Export topology for visualization
     */
    exportForVisualization() {
        return {
            // Points in 4D space
            points: this.snapshots.length > 0 ?
                Array.from(this.snapshots[this.snapshots.length - 1].positions.values()) : [],

            // Persistence diagram (2D representation)
            persistence: this.persistenceDiagram.map(p => ({
                birth: p.birth,
                death: p.death === Infinity ? 1 : p.death,
                dimension: p.dimension,
                persistence: p.persistence === Infinity ? 1 : p.persistence
            })),

            // Active features
            activeFeatures: Array.from(this.activeFeatures.entries()).map(([id, p]) => ({
                id,
                birth: p.birth,
                feature: p.feature
            })),

            // Clusters
            clusters: this.clusters.map(c => ({
                centroid: c.centroid,
                radius: c.radius,
                size: c.size
            })),

            // Holes
            holes: this.holes.map(h => ({
                type: h.type,
                significance: h.significance,
                centroid: h.centroid
            })),

            // Summary metrics
            betti: this._calculateBettiNumbers(),
            complexity: this.getComplexityScore(),
            stability: this.getStabilityScore()
        };
    }

    /**
     * Clear all state
     */
    clear() {
        this.snapshots = [];
        this.persistenceDiagram = [];
        this.clusters = [];
        this.holes = [];
        this.activeFeatures.clear();
    }
}

// ============================================================================
// EXPORT
// ============================================================================

export default MarketTopology;
