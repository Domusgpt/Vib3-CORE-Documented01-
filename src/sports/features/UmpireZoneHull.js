/**
 * UmpireZoneHull - Convex Hull Analysis for Umpire Strike Zones
 *
 * Models the strike zone as a convex polytope constructed from called strikes.
 * Provides second-order insights: zone expansion, centroid drift, asymmetry.
 *
 * Key Insights:
 * - Zone Expansion Factor (λ): Hull area vs rulebook area
 *   - λ > 1.1: Umpire expands zone → Under value in totals
 * - Centroid Drift: Low centroid favors ground-ball pitchers
 * - Asymmetry: Left-right bias affects platoon splits
 *
 * Uses convex hull algorithms (Graham scan, QuickHull) for computation.
 *
 * @class UmpireZoneHull
 */

export class UmpireZoneHull {
    constructor(config = {}) {
        this.config = {
            // Rulebook strike zone dimensions (feet)
            rulebookWidth: 1.416667,  // 17 inches
            rulebookBottom: 1.5,       // Typical low point (varies by batter)
            rulebookTop: 3.5,          // Typical high point (varies by batter)

            // Minimum called strikes for reliable hull
            minCalledStrikes: 50,

            // Trailing window for recent zone (games)
            trailingWindow: 10,

            // Hull algorithm selection
            algorithm: 'quickhull', // 'graham' or 'quickhull'

            ...config
        };

        // Cache computed hulls
        this.hullCache = new Map();
    }

    /**
     * Compute convex hull for an umpire's strike zone
     * @param {Array} calledStrikes - Array of {plate_x, plate_z} for called strikes
     * @param {string} umpireId - Umpire identifier for caching
     * @returns {Object} Hull analysis results
     */
    computeHull(calledStrikes, umpireId = null) {
        if (calledStrikes.length < 3) {
            return null; // Need at least 3 points for a hull
        }

        // Extract points
        const points = calledStrikes.map(p => [p.plate_x, p.plate_z]);

        // Compute convex hull
        const hull = this.config.algorithm === 'quickhull' ?
            this.quickHull(points) :
            this.grahamScan(points);

        // Compute hull properties
        const area = this.computeHullArea(hull);
        const centroid = this.computeCentroid(hull);
        const rulebookArea = this.config.rulebookWidth *
            (this.config.rulebookTop - this.config.rulebookBottom);

        // Expansion factor
        const expansionFactor = area / rulebookArea;

        // Zone asymmetry (left-right balance)
        const asymmetry = this.computeAsymmetry(hull, centroid);

        // Bounding box
        const bounds = this.computeBounds(hull);

        const result = {
            hull,
            area,
            expansionFactor,
            centroid,
            asymmetry,
            bounds,
            vertexCount: hull.length,
            sampleSize: calledStrikes.length,

            // Derived insights
            insights: this.deriveInsights(expansionFactor, centroid, asymmetry)
        };

        // Cache if umpire ID provided
        if (umpireId) {
            this.hullCache.set(umpireId, result);
        }

        return result;
    }

    /**
     * Compute hull for specific batter height
     * @param {Array} calledStrikes - Called strikes with sz_top, sz_bot
     * @returns {Object} Normalized hull analysis
     */
    computeNormalizedHull(calledStrikes) {
        if (calledStrikes.length < this.config.minCalledStrikes) {
            return null;
        }

        // Normalize z-coordinate to 0-1 based on each batter's zone
        const normalizedPoints = calledStrikes.map(p => {
            const szHeight = p.sz_top - p.sz_bot;
            const normalizedZ = (p.plate_z - p.sz_bot) / szHeight;
            return [p.plate_x, normalizedZ];
        });

        return this.quickHull(normalizedPoints);
    }

    /**
     * Check if a pitch falls within the umpire's zone
     * @param {Object} pitch - {plate_x, plate_z}
     * @param {Array} hull - Convex hull vertices
     * @returns {boolean} True if inside hull
     */
    isInsideZone(pitch, hull) {
        return this.pointInPolygon([pitch.plate_x, pitch.plate_z], hull);
    }

    /**
     * Compute zone for specific handedness combinations
     * @param {Array} calledStrikes - Called strikes with batter/pitcher hand info
     * @returns {Object} Handedness-split zone analysis
     */
    computeHandednessSplits(calledStrikes) {
        const splits = {
            rhp_rhb: [],
            rhp_lhb: [],
            lhp_rhb: [],
            lhp_lhb: []
        };

        for (const strike of calledStrikes) {
            const key = `${strike.p_throws?.toLowerCase() || 'r'}hp_${strike.stand?.toLowerCase() || 'r'}hb`;
            if (splits[key]) {
                splits[key].push(strike);
            }
        }

        const results = {};
        for (const [key, strikes] of Object.entries(splits)) {
            if (strikes.length >= 20) {
                results[key] = this.computeHull(strikes);
            }
        }

        return results;
    }

    /**
     * Analyze zone drift during a game (fatigue/consistency)
     * @param {Array} calledStrikes - Chronologically ordered strikes
     * @param {number} windowSize - Rolling window size
     * @returns {Array} Zone metrics over time
     */
    analyzeZoneDrift(calledStrikes, windowSize = 30) {
        const drift = [];

        for (let i = windowSize; i <= calledStrikes.length; i++) {
            const window = calledStrikes.slice(i - windowSize, i);
            const hull = this.computeHull(window);

            if (hull) {
                drift.push({
                    pitchNumber: i,
                    expansionFactor: hull.expansionFactor,
                    centroidX: hull.centroid[0],
                    centroidZ: hull.centroid[1],
                    area: hull.area
                });
            }
        }

        // Compute consistency metrics
        const consistency = this.computeConsistency(drift);

        return {
            drift,
            consistency,
            maxExpansion: Math.max(...drift.map(d => d.expansionFactor)),
            minExpansion: Math.min(...drift.map(d => d.expansionFactor)),
            avgCentroidDrift: this.computeAvgCentroidDrift(drift)
        };
    }

    /**
     * Compare two umpires' zones
     * @param {Array} strikesA - Umpire A's called strikes
     * @param {Array} strikesB - Umpire B's called strikes
     * @returns {Object} Zone comparison metrics
     */
    compareZones(strikesA, strikesB) {
        const hullA = this.computeHull(strikesA);
        const hullB = this.computeHull(strikesB);

        if (!hullA || !hullB) return null;

        // Compute intersection area (approximate)
        const intersectionArea = this.approximateIntersectionArea(hullA.hull, hullB.hull);

        // IoU (Intersection over Union)
        const unionArea = hullA.area + hullB.area - intersectionArea;
        const iou = intersectionArea / unionArea;

        // Centroid distance
        const centroidDistance = Math.sqrt(
            (hullA.centroid[0] - hullB.centroid[0]) ** 2 +
            (hullA.centroid[1] - hullB.centroid[1]) ** 2
        );

        return {
            umpireAArea: hullA.area,
            umpireBArea: hullB.area,
            areaDifference: Math.abs(hullA.area - hullB.area),
            intersectionArea,
            iou,
            centroidDistance,
            expansionDifference: hullA.expansionFactor - hullB.expansionFactor
        };
    }

    // === Convex Hull Algorithms ===

    /**
     * QuickHull algorithm for convex hull computation
     * Average O(n log n), worst O(n²)
     */
    quickHull(points) {
        if (points.length < 3) return points;

        // Find extremes
        let minIdx = 0, maxIdx = 0;
        for (let i = 1; i < points.length; i++) {
            if (points[i][0] < points[minIdx][0]) minIdx = i;
            if (points[i][0] > points[maxIdx][0]) maxIdx = i;
        }

        const minPoint = points[minIdx];
        const maxPoint = points[maxIdx];

        // Partition points
        const leftSet = [];
        const rightSet = [];

        for (let i = 0; i < points.length; i++) {
            if (i === minIdx || i === maxIdx) continue;

            const side = this.crossProduct(minPoint, maxPoint, points[i]);
            if (side > 0) {
                leftSet.push(points[i]);
            } else if (side < 0) {
                rightSet.push(points[i]);
            }
        }

        // Build hull recursively
        const hull = [];
        this.buildHull(minPoint, maxPoint, leftSet, hull);
        hull.push(maxPoint);
        this.buildHull(maxPoint, minPoint, rightSet, hull);
        hull.push(minPoint);

        return hull;
    }

    buildHull(p1, p2, points, hull) {
        if (points.length === 0) return;

        // Find farthest point
        let maxDist = -1;
        let maxIdx = -1;

        for (let i = 0; i < points.length; i++) {
            const dist = this.pointLineDistance(p1, p2, points[i]);
            if (dist > maxDist) {
                maxDist = dist;
                maxIdx = i;
            }
        }

        if (maxIdx === -1) return;

        const farthest = points[maxIdx];

        // Partition remaining points
        const leftOfP1Farthest = [];
        const leftOfFarthestP2 = [];

        for (let i = 0; i < points.length; i++) {
            if (i === maxIdx) continue;

            if (this.crossProduct(p1, farthest, points[i]) > 0) {
                leftOfP1Farthest.push(points[i]);
            } else if (this.crossProduct(farthest, p2, points[i]) > 0) {
                leftOfFarthestP2.push(points[i]);
            }
        }

        this.buildHull(p1, farthest, leftOfP1Farthest, hull);
        hull.push(farthest);
        this.buildHull(farthest, p2, leftOfFarthestP2, hull);
    }

    /**
     * Graham scan algorithm for convex hull
     * O(n log n)
     */
    grahamScan(points) {
        if (points.length < 3) return points;

        // Find lowest point (and leftmost if tie)
        let lowest = 0;
        for (let i = 1; i < points.length; i++) {
            if (points[i][1] < points[lowest][1] ||
                (points[i][1] === points[lowest][1] && points[i][0] < points[lowest][0])) {
                lowest = i;
            }
        }

        // Swap to front
        [points[0], points[lowest]] = [points[lowest], points[0]];
        const pivot = points[0];

        // Sort by polar angle
        const sorted = points.slice(1).sort((a, b) => {
            const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
            const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);
            return angleA - angleB;
        });

        // Build hull
        const hull = [pivot];

        for (const point of sorted) {
            while (hull.length > 1 &&
                this.crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
                hull.pop();
            }
            hull.push(point);
        }

        return hull;
    }

    // === Geometric Utilities ===

    crossProduct(o, a, b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }

    pointLineDistance(p1, p2, point) {
        const num = Math.abs(
            (p2[1] - p1[1]) * point[0] -
            (p2[0] - p1[0]) * point[1] +
            p2[0] * p1[1] -
            p2[1] * p1[0]
        );
        const den = Math.sqrt((p2[1] - p1[1]) ** 2 + (p2[0] - p1[0]) ** 2);
        return num / den;
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

    computeCentroid(hull) {
        if (hull.length === 0) return [0, 0];

        let cx = 0, cy = 0;
        for (const point of hull) {
            cx += point[0];
            cy += point[1];
        }

        return [cx / hull.length, cy / hull.length];
    }

    computeBounds(hull) {
        if (hull.length === 0) return null;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const point of hull) {
            minX = Math.min(minX, point[0]);
            maxX = Math.max(maxX, point[0]);
            minY = Math.min(minY, point[1]);
            maxY = Math.max(maxY, point[1]);
        }

        return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
    }

    computeAsymmetry(hull, centroid) {
        // Compute how far centroid is from x=0 (center of plate)
        const horizontalBias = centroid[0]; // Positive = right, Negative = left

        // Compute vertical asymmetry (top-heavy vs bottom-heavy)
        const midHeight = (this.config.rulebookTop + this.config.rulebookBottom) / 2;
        const verticalBias = centroid[1] - midHeight;

        return {
            horizontal: horizontalBias,
            vertical: verticalBias,
            magnitude: Math.sqrt(horizontalBias ** 2 + verticalBias ** 2)
        };
    }

    pointInPolygon(point, polygon) {
        let inside = false;
        const n = polygon.length;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];

            if (((yi > point[1]) !== (yj > point[1])) &&
                (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }

    approximateIntersectionArea(hullA, hullB) {
        // Monte Carlo approximation of intersection area
        const bounds = this.combinedBounds(hullA, hullB);
        const samples = 10000;
        let inside = 0;

        for (let i = 0; i < samples; i++) {
            const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);

            if (this.pointInPolygon([x, y], hullA) &&
                this.pointInPolygon([x, y], hullB)) {
                inside++;
            }
        }

        const totalArea = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
        return (inside / samples) * totalArea;
    }

    combinedBounds(hullA, hullB) {
        const boundsA = this.computeBounds(hullA);
        const boundsB = this.computeBounds(hullB);

        return {
            minX: Math.min(boundsA.minX, boundsB.minX),
            maxX: Math.max(boundsA.maxX, boundsB.maxX),
            minY: Math.min(boundsA.minY, boundsB.minY),
            maxY: Math.max(boundsA.maxY, boundsB.maxY)
        };
    }

    deriveInsights(expansionFactor, centroid, asymmetry) {
        const insights = [];

        // Zone expansion insights
        if (expansionFactor > 1.15) {
            insights.push({
                type: 'zone_expansion',
                severity: 'high',
                message: `Zone expanded ${((expansionFactor - 1) * 100).toFixed(1)}% - strong Under value`,
                marketImpact: { totals: 'under', magnitude: 'high' }
            });
        } else if (expansionFactor > 1.08) {
            insights.push({
                type: 'zone_expansion',
                severity: 'medium',
                message: `Zone expanded ${((expansionFactor - 1) * 100).toFixed(1)}% - moderate Under lean`,
                marketImpact: { totals: 'under', magnitude: 'medium' }
            });
        } else if (expansionFactor < 0.92) {
            insights.push({
                type: 'zone_contraction',
                severity: 'high',
                message: `Zone contracted ${((1 - expansionFactor) * 100).toFixed(1)}% - strong Over value`,
                marketImpact: { totals: 'over', magnitude: 'high' }
            });
        }

        // Centroid insights
        if (centroid[1] < 2.3) {
            insights.push({
                type: 'low_zone',
                severity: 'medium',
                message: 'Low strike zone favors sinkerball pitchers',
                marketImpact: { pitcherType: 'groundball', magnitude: 'medium' }
            });
        } else if (centroid[1] > 2.8) {
            insights.push({
                type: 'high_zone',
                severity: 'medium',
                message: 'High strike zone favors power pitchers',
                marketImpact: { pitcherType: 'strikeout', magnitude: 'medium' }
            });
        }

        // Asymmetry insights
        if (Math.abs(asymmetry.horizontal) > 0.15) {
            const side = asymmetry.horizontal > 0 ? 'right' : 'left';
            insights.push({
                type: 'horizontal_bias',
                severity: 'low',
                message: `Zone shifted ${side} - affects platoon splits`,
                marketImpact: { platoon: side, magnitude: 'low' }
            });
        }

        return insights;
    }

    computeConsistency(drift) {
        if (drift.length < 3) return 1;

        // Standard deviation of expansion factor
        const mean = drift.reduce((s, d) => s + d.expansionFactor, 0) / drift.length;
        const variance = drift.reduce((s, d) => s + (d.expansionFactor - mean) ** 2, 0) / drift.length;

        // Lower variance = higher consistency
        return 1 / (1 + Math.sqrt(variance));
    }

    computeAvgCentroidDrift(drift) {
        if (drift.length < 2) return 0;

        let totalDrift = 0;
        for (let i = 1; i < drift.length; i++) {
            const dx = drift[i].centroidX - drift[i-1].centroidX;
            const dz = drift[i].centroidZ - drift[i-1].centroidZ;
            totalDrift += Math.sqrt(dx * dx + dz * dz);
        }

        return totalDrift / (drift.length - 1);
    }
}
