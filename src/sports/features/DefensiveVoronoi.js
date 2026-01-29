/**
 * DefensiveVoronoi - Voronoi Tessellation for Defensive Coverage
 *
 * Partitions the baseball field into regions based on fielder positions,
 * weighted by sprint speed and reaction time. Identifies "seams" in the
 * defense where hit balls are most likely to fall.
 *
 * Key Insights:
 * - Seam Exposure: Batter spray chart overlap with Voronoi edges
 * - Coverage Gaps: Areas where reaction time exceeds ball hang time
 * - Shift Effectiveness: How defensive positioning affects hit probability
 *
 * @class DefensiveVoronoi
 */

export class DefensiveVoronoi {
    constructor(config = {}) {
        this.config = {
            // Field dimensions (feet)
            fieldRadius: 400, // Outfield fence distance
            infieldDepth: 90, // Infield grass edge

            // Sprint speed adjustments
            avgSprintSpeed: 27, // ft/s (league average)
            reactionTime: 0.3,   // seconds

            // Voronoi parameters
            boundaryPadding: 50,
            edgeResolution: 100, // Points per edge for distance calc

            // Default fielder positions (feet from home plate)
            defaultPositions: {
                C: { x: 0, y: 2 },        // Catcher
                '1B': { x: 63, y: 63 },   // First base
                '2B': { x: 30, y: 100 },  // Second base
                SS: { x: -30, y: 100 },   // Shortstop
                '3B': { x: -63, y: 63 },  // Third base
                LF: { x: -150, y: 260 },  // Left field
                CF: { x: 0, y: 320 },     // Center field
                RF: { x: 150, y: 260 }    // Right field
            },

            ...config
        };
    }

    /**
     * Compute Voronoi tessellation for a defensive alignment
     * @param {Array} fielders - Array of {position, x, y, sprintSpeed}
     * @returns {Object} Voronoi tessellation with cells and edges
     */
    computeVoronoi(fielders) {
        // Ensure we have valid positions
        const positions = this.normalizeFielderPositions(fielders);

        // Compute weighted Voronoi (by sprint speed)
        const cells = this.computeWeightedVoronoi(positions);

        // Extract edges (seams between fielders)
        const edges = this.extractEdges(cells);

        // Compute coverage metrics
        const coverage = this.computeCoverageMetrics(cells, positions);

        return {
            cells,
            edges,
            coverage,
            positions,
            totalArea: coverage.totalArea,
            gaps: this.findCoverageGaps(cells, positions)
        };
    }

    /**
     * Compute spray chart overlay with defensive Voronoi
     * @param {Array} battedBalls - Batter's batted ball data
     * @param {Object} voronoi - Pre-computed Voronoi tessellation
     * @returns {Object} Seam exposure analysis
     */
    computeSeamExposure(battedBalls, voronoi) {
        if (!battedBalls || battedBalls.length === 0) {
            return { seamExposure: 0, hitsByCell: {}, seamHits: [] };
        }

        const hitsByCell = {};
        const seamHits = [];
        let totalSeamExposure = 0;

        for (const ball of battedBalls) {
            const point = this.battedBallToFieldCoord(ball);

            // Find which cell the ball landed in
            const cellId = this.findContainingCell(point, voronoi.cells);

            if (cellId) {
                hitsByCell[cellId] = (hitsByCell[cellId] || 0) + 1;
            }

            // Check distance to nearest edge (seam)
            const seamDist = this.distanceToNearestEdge(point, voronoi.edges);

            if (seamDist < 20) { // Within 20 feet of a seam
                seamHits.push({
                    point,
                    seamDistance: seamDist,
                    exposure: 1 - (seamDist / 20)
                });
                totalSeamExposure += 1 - (seamDist / 20);
            }
        }

        return {
            seamExposure: totalSeamExposure / battedBalls.length,
            hitsByCell,
            seamHits,
            seamHitRate: seamHits.length / battedBalls.length,
            hotZones: this.identifyHotZones(battedBalls, voronoi)
        };
    }

    /**
     * Compute weighted Voronoi where cell size depends on sprint speed
     * Faster fielders get larger cells (can cover more ground)
     */
    computeWeightedVoronoi(positions) {
        const cells = {};

        // Sample grid across the field
        const gridSize = 5; // 5 foot resolution
        const minX = -this.config.fieldRadius;
        const maxX = this.config.fieldRadius;
        const minY = 0;
        const maxY = this.config.fieldRadius;

        for (let x = minX; x <= maxX; x += gridSize) {
            for (let y = minY; y <= maxY; y += gridSize) {
                // Skip points outside the field (rough circle check)
                if (x * x + y * y > this.config.fieldRadius * this.config.fieldRadius * 1.2) {
                    continue;
                }

                // Find nearest fielder (weighted by sprint speed)
                let nearestFielder = null;
                let minTime = Infinity;

                for (const fielder of positions) {
                    const dist = Math.sqrt(
                        (x - fielder.x) ** 2 + (y - fielder.y) ** 2
                    );

                    // Time to reach = reaction time + distance / sprint speed
                    const timeToReach = this.config.reactionTime +
                        dist / (fielder.sprintSpeed || this.config.avgSprintSpeed);

                    if (timeToReach < minTime) {
                        minTime = timeToReach;
                        nearestFielder = fielder;
                    }
                }

                if (nearestFielder) {
                    const id = nearestFielder.position;
                    if (!cells[id]) {
                        cells[id] = {
                            fielder: nearestFielder,
                            points: [],
                            area: 0
                        };
                    }
                    cells[id].points.push({ x, y, timeToReach: minTime });
                }
            }
        }

        // Compute cell areas and boundaries
        for (const cell of Object.values(cells)) {
            cell.area = cell.points.length * gridSize * gridSize;
            cell.boundary = this.computeCellBoundary(cell.points);
        }

        return cells;
    }

    /**
     * Extract Voronoi edges (boundaries between cells)
     */
    extractEdges(cells) {
        const edges = [];
        const cellIds = Object.keys(cells);

        // Check each pair of cells
        for (let i = 0; i < cellIds.length; i++) {
            for (let j = i + 1; j < cellIds.length; j++) {
                const cellA = cells[cellIds[i]];
                const cellB = cells[cellIds[j]];

                // Find shared boundary points
                const sharedBoundary = this.findSharedBoundary(cellA, cellB);

                if (sharedBoundary.length >= 2) {
                    edges.push({
                        cellA: cellIds[i],
                        cellB: cellIds[j],
                        points: sharedBoundary,
                        length: this.computeEdgeLength(sharedBoundary)
                    });
                }
            }
        }

        return edges;
    }

    /**
     * Analyze how a defensive shift affects coverage
     * @param {Array} standardPositions - Normal defensive alignment
     * @param {Array} shiftPositions - Shifted alignment
     * @param {Array} battedBalls - Batter's spray chart
     */
    analyzeShiftEffectiveness(standardPositions, shiftPositions, battedBalls) {
        const standardVoronoi = this.computeVoronoi(standardPositions);
        const shiftVoronoi = this.computeVoronoi(shiftPositions);

        const standardExposure = this.computeSeamExposure(battedBalls, standardVoronoi);
        const shiftExposure = this.computeSeamExposure(battedBalls, shiftVoronoi);

        // Compare coverage
        const coverageChange = {};
        for (const cellId of Object.keys(standardVoronoi.cells)) {
            const standardArea = standardVoronoi.cells[cellId]?.area || 0;
            const shiftArea = shiftVoronoi.cells[cellId]?.area || 0;
            coverageChange[cellId] = {
                areaChange: shiftArea - standardArea,
                percentChange: standardArea > 0 ?
                    (shiftArea - standardArea) / standardArea : 0
            };
        }

        return {
            standardSeamExposure: standardExposure.seamExposure,
            shiftSeamExposure: shiftExposure.seamExposure,
            exposureReduction: standardExposure.seamExposure - shiftExposure.seamExposure,
            coverageChange,
            recommendation: shiftExposure.seamExposure < standardExposure.seamExposure ?
                'shift' : 'standard',
            expectedHitReduction: (standardExposure.seamExposure - shiftExposure.seamExposure) *
                battedBalls.length
        };
    }

    /**
     * Find coverage gaps where no fielder can reach in time
     * @param {Object} cells - Voronoi cells
     * @param {Array} positions - Fielder positions
     * @param {number} maxHangTime - Maximum ball hang time (seconds)
     */
    findCoverageGaps(cells, positions, maxHangTime = 4.5) {
        const gaps = [];

        for (const cell of Object.values(cells)) {
            for (const point of cell.points) {
                // Check if any fielder can reach this point
                if (point.timeToReach > maxHangTime) {
                    gaps.push({
                        x: point.x,
                        y: point.y,
                        timeToReach: point.timeToReach,
                        nearestFielder: cell.fielder.position
                    });
                }
            }
        }

        // Cluster gaps into zones
        const gapZones = this.clusterGaps(gaps);

        return {
            gapPoints: gaps,
            gapZones,
            totalGapArea: gaps.length * 25, // 5x5 foot grid squares
            percentUncovered: gaps.length / Object.values(cells)
                .reduce((sum, c) => sum + c.points.length, 0)
        };
    }

    /**
     * Distance from a point to the nearest Voronoi edge
     */
    distanceToNearestEdge(point, edges) {
        let minDist = Infinity;

        for (const edge of edges) {
            for (let i = 0; i < edge.points.length - 1; i++) {
                const dist = this.pointToSegmentDistance(
                    point,
                    edge.points[i],
                    edge.points[i + 1]
                );
                minDist = Math.min(minDist, dist);
            }
        }

        return minDist;
    }

    // === Helper Methods ===

    normalizeFielderPositions(fielders) {
        // Use provided positions or defaults
        const defaultPos = this.config.defaultPositions;
        const normalized = [];

        const requiredPositions = ['1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];

        for (const pos of requiredPositions) {
            const fielder = fielders.find(f => f.position === pos);

            if (fielder && fielder.x !== undefined && fielder.y !== undefined) {
                normalized.push({
                    position: pos,
                    x: fielder.x,
                    y: fielder.y,
                    sprintSpeed: fielder.sprintSpeed || this.config.avgSprintSpeed,
                    playerId: fielder.playerId
                });
            } else if (defaultPos[pos]) {
                normalized.push({
                    position: pos,
                    x: defaultPos[pos].x,
                    y: defaultPos[pos].y,
                    sprintSpeed: this.config.avgSprintSpeed
                });
            }
        }

        return normalized;
    }

    battedBallToFieldCoord(ball) {
        // Convert batted ball data to field coordinates
        // hc_x and hc_y are in Statcast's coordinate system (0-250 scale)
        // Need to transform to feet from home plate

        if (ball.hc_x !== undefined && ball.hc_y !== undefined) {
            // Statcast coordinates: center is roughly 125, 200
            const x = (ball.hc_x - 125) * 2.5; // Scale to feet
            const y = (200 - ball.hc_y) * 2.5;
            return { x, y };
        }

        // If no coordinates, use launch angle and distance
        if (ball.launch_angle !== undefined && ball.hit_distance_sc !== undefined) {
            const angle = ball.spray_angle || 0; // degrees from center
            const dist = ball.hit_distance_sc;
            const radAngle = (angle * Math.PI) / 180;
            return {
                x: dist * Math.sin(radAngle),
                y: dist * Math.cos(radAngle)
            };
        }

        return { x: 0, y: 150 }; // Default to center field
    }

    findContainingCell(point, cells) {
        for (const [id, cell] of Object.entries(cells)) {
            if (this.pointInCell(point, cell)) {
                return id;
            }
        }
        return null;
    }

    pointInCell(point, cell) {
        // Simple check - find nearest point in cell
        const gridSize = 5;
        for (const cp of cell.points) {
            if (Math.abs(point.x - cp.x) < gridSize &&
                Math.abs(point.y - cp.y) < gridSize) {
                return true;
            }
        }
        return false;
    }

    computeCellBoundary(points) {
        // Find convex hull of cell points
        if (points.length < 3) return points;

        // Simple Graham scan
        const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

        const cross = (o, a, b) =>
            (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

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

    findSharedBoundary(cellA, cellB) {
        // Find points that are equidistant to both fielders
        const shared = [];
        const gridSize = 5;

        for (const pa of cellA.boundary || []) {
            for (const pb of cellB.boundary || []) {
                if (Math.abs(pa.x - pb.x) < gridSize * 2 &&
                    Math.abs(pa.y - pb.y) < gridSize * 2) {
                    shared.push({ x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 });
                }
            }
        }

        return shared;
    }

    computeEdgeLength(points) {
        let length = 0;
        for (let i = 1; i < points.length; i++) {
            length += Math.sqrt(
                (points[i].x - points[i-1].x) ** 2 +
                (points[i].y - points[i-1].y) ** 2
            );
        }
        return length;
    }

    pointToSegmentDistance(point, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;

        if (dx === 0 && dy === 0) {
            return Math.sqrt((point.x - a.x) ** 2 + (point.y - a.y) ** 2);
        }

        let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t));

        return Math.sqrt(
            (point.x - (a.x + t * dx)) ** 2 +
            (point.y - (a.y + t * dy)) ** 2
        );
    }

    computeCoverageMetrics(cells, positions) {
        let totalArea = 0;
        const cellAreas = {};

        for (const [id, cell] of Object.entries(cells)) {
            cellAreas[id] = cell.area;
            totalArea += cell.area;
        }

        return {
            totalArea,
            cellAreas,
            avgCellArea: totalArea / Object.keys(cells).length,
            coverageBalance: this.computeCoverageBalance(cellAreas)
        };
    }

    computeCoverageBalance(cellAreas) {
        // Gini coefficient of cell areas (0 = equal, 1 = one cell has all)
        const areas = Object.values(cellAreas).sort((a, b) => a - b);
        const n = areas.length;
        const mean = areas.reduce((s, a) => s + a, 0) / n;

        let numerator = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                numerator += Math.abs(areas[i] - areas[j]);
            }
        }

        return numerator / (2 * n * n * mean);
    }

    clusterGaps(gaps) {
        // Simple clustering of nearby gaps
        const zones = [];
        const used = new Set();

        for (let i = 0; i < gaps.length; i++) {
            if (used.has(i)) continue;

            const cluster = [gaps[i]];
            used.add(i);

            for (let j = i + 1; j < gaps.length; j++) {
                if (used.has(j)) continue;

                // Check if close to any point in cluster
                for (const point of cluster) {
                    const dist = Math.sqrt(
                        (gaps[j].x - point.x) ** 2 +
                        (gaps[j].y - point.y) ** 2
                    );

                    if (dist < 20) {
                        cluster.push(gaps[j]);
                        used.add(j);
                        break;
                    }
                }
            }

            if (cluster.length >= 3) {
                zones.push({
                    centroid: {
                        x: cluster.reduce((s, p) => s + p.x, 0) / cluster.length,
                        y: cluster.reduce((s, p) => s + p.y, 0) / cluster.length
                    },
                    pointCount: cluster.length,
                    area: cluster.length * 25
                });
            }
        }

        return zones;
    }

    identifyHotZones(battedBalls, voronoi) {
        // Find areas with high hit density
        const gridSize = 20;
        const heatmap = {};

        for (const ball of battedBalls) {
            const point = this.battedBallToFieldCoord(ball);
            const key = `${Math.floor(point.x / gridSize) * gridSize}_${Math.floor(point.y / gridSize) * gridSize}`;
            heatmap[key] = (heatmap[key] || 0) + 1;
        }

        const hotZones = Object.entries(heatmap)
            .filter(([_, count]) => count >= 3)
            .map(([key, count]) => {
                const [x, y] = key.split('_').map(Number);
                return {
                    x: x + gridSize / 2,
                    y: y + gridSize / 2,
                    hitCount: count,
                    density: count / battedBalls.length,
                    nearestEdge: this.distanceToNearestEdge({ x, y }, voronoi.edges)
                };
            })
            .sort((a, b) => b.density - a.density);

        return hotZones.slice(0, 5); // Top 5 hot zones
    }
}
