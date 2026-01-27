/**
 * MarketHeatmap - Value and Edge Visualization
 *
 * Creates heatmap visualizations of market value opportunities,
 * model confidence, and edge distribution across the betting slate.
 *
 * @class MarketHeatmap
 */

export class MarketHeatmap {
    constructor(config = {}) {
        this.config = {
            // Color scales
            edgeColorScale: {
                negative: { h: 0, s: 70, l: 50 },    // Red
                neutral: { h: 60, s: 70, l: 50 },    // Yellow
                positive: { h: 120, s: 70, l: 50 }   // Green
            },

            // Thresholds
            edgeThresholds: {
                low: 0.02,
                medium: 0.05,
                high: 0.10
            },

            ...config
        };
    }

    /**
     * Generate heatmap data for a slate of games
     * @param {Array} predictions - Model predictions with edges
     * @param {Array} odds - Market odds
     * @returns {Object} Heatmap visualization data
     */
    generateSlateHeatmap(predictions, odds) {
        const cells = [];

        for (const pred of predictions) {
            const gameOdds = odds.find(o => o.gameId === pred.gameId);
            if (!gameOdds) continue;

            // Moneyline cells
            cells.push({
                gameId: pred.gameId,
                type: 'moneyline',
                side: 'home',
                team: pred.homeTeam,
                modelProb: pred.homeWinProb,
                impliedProb: this.oddsToProb(gameOdds.homeOdds),
                edge: pred.homeWinProb - this.oddsToProb(gameOdds.homeOdds),
                odds: gameOdds.homeOdds,
                confidence: pred.confidence
            });

            cells.push({
                gameId: pred.gameId,
                type: 'moneyline',
                side: 'away',
                team: pred.awayTeam,
                modelProb: pred.awayWinProb,
                impliedProb: this.oddsToProb(gameOdds.awayOdds),
                edge: pred.awayWinProb - this.oddsToProb(gameOdds.awayOdds),
                odds: gameOdds.awayOdds,
                confidence: pred.confidence
            });

            // Total cells
            if (gameOdds.totalLine) {
                const overProb = this.computeOverProb(pred.projectedTotal, gameOdds.totalLine);

                cells.push({
                    gameId: pred.gameId,
                    type: 'total',
                    side: 'over',
                    line: gameOdds.totalLine,
                    modelProb: overProb,
                    impliedProb: this.oddsToProb(gameOdds.overOdds),
                    edge: overProb - this.oddsToProb(gameOdds.overOdds),
                    odds: gameOdds.overOdds,
                    confidence: pred.confidence,
                    projectedTotal: pred.projectedTotal
                });

                cells.push({
                    gameId: pred.gameId,
                    type: 'total',
                    side: 'under',
                    line: gameOdds.totalLine,
                    modelProb: 1 - overProb,
                    impliedProb: this.oddsToProb(gameOdds.underOdds),
                    edge: (1 - overProb) - this.oddsToProb(gameOdds.underOdds),
                    odds: gameOdds.underOdds,
                    confidence: pred.confidence,
                    projectedTotal: pred.projectedTotal
                });
            }
        }

        // Color each cell
        cells.forEach(cell => {
            cell.color = this.edgeToColor(cell.edge);
            cell.intensity = Math.min(1, Math.abs(cell.edge) * 10);
            cell.category = this.categorizeEdge(cell.edge);
        });

        return {
            cells,
            summary: this.computeHeatmapSummary(cells),
            layout: this.computeLayout(cells, predictions)
        };
    }

    /**
     * Generate time-series heatmap for line movement
     */
    generateLineMovementHeatmap(oddsTimeline) {
        const cells = [];

        for (const game of oddsTimeline) {
            const timeline = game.timeline || [];

            for (let i = 1; i < timeline.length; i++) {
                const prev = timeline[i - 1];
                const curr = timeline[i];

                if (!curr.delta) continue;

                cells.push({
                    gameId: game.gameId,
                    timestamp: curr.timestamp,
                    timeIndex: i,
                    homeOddsDelta: curr.delta.homeOdds || 0,
                    totalLineDelta: curr.delta.totalLine || 0,
                    color: this.movementToColor(curr.delta.homeOdds || 0),
                    intensity: Math.min(1, Math.abs(curr.delta.homeOdds || 0) / 20)
                });
            }
        }

        return {
            cells,
            xAxis: 'time',
            yAxis: 'game',
            colorLegend: {
                negative: 'Line moved against',
                positive: 'Line moved toward'
            }
        };
    }

    /**
     * Generate confidence distribution heatmap
     */
    generateConfidenceHeatmap(predictions) {
        const bins = {
            lowConf: [],    // < 0.6
            medConf: [],    // 0.6-0.8
            highConf: []    // > 0.8
        };

        const edgeBins = {
            noEdge: [],      // < 2%
            smallEdge: [],   // 2-5%
            mediumEdge: [],  // 5-10%
            largeEdge: []    // > 10%
        };

        for (const pred of predictions) {
            // Bin by confidence
            if (pred.confidence < 0.6) {
                bins.lowConf.push(pred);
            } else if (pred.confidence < 0.8) {
                bins.medConf.push(pred);
            } else {
                bins.highConf.push(pred);
            }

            // Bin by edge (approximate)
            const maxEdge = Math.max(
                Math.abs(pred.homeWinProb - 0.5) * 2 - 0.1,
                0
            );

            if (maxEdge < 0.02) {
                edgeBins.noEdge.push(pred);
            } else if (maxEdge < 0.05) {
                edgeBins.smallEdge.push(pred);
            } else if (maxEdge < 0.10) {
                edgeBins.mediumEdge.push(pred);
            } else {
                edgeBins.largeEdge.push(pred);
            }
        }

        return {
            confidenceBins: bins,
            edgeBins,
            matrix: this.createConfidenceEdgeMatrix(predictions)
        };
    }

    /**
     * Create 2D matrix of confidence vs edge
     */
    createConfidenceEdgeMatrix(predictions) {
        const confBins = [0, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
        const edgeBins = [-0.1, -0.05, 0, 0.02, 0.05, 0.1, 0.2];

        const matrix = [];

        for (let i = 0; i < confBins.length - 1; i++) {
            const row = [];
            for (let j = 0; j < edgeBins.length - 1; j++) {
                const count = predictions.filter(p => {
                    const conf = p.confidence;
                    const edge = Math.abs(p.homeWinProb - 0.5) * 2 - 0.1;
                    return conf >= confBins[i] && conf < confBins[i + 1] &&
                        edge >= edgeBins[j] && edge < edgeBins[j + 1];
                }).length;

                row.push({
                    confRange: [confBins[i], confBins[i + 1]],
                    edgeRange: [edgeBins[j], edgeBins[j + 1]],
                    count,
                    intensity: Math.min(1, count / 5)
                });
            }
            matrix.push(row);
        }

        return matrix;
    }

    /**
     * Generate VIB3+ parameters from heatmap for visualization
     */
    toVIB3Params(heatmap) {
        const { cells, summary } = heatmap;

        // Map edge distribution to geometric parameters
        const avgEdge = summary.avgEdge || 0;
        const edgeSpread = summary.edgeStdDev || 0;
        const valueCount = summary.positiveCells || 0;

        return {
            geometry: valueCount > 10 ? 16 : valueCount > 5 ? 8 : 0,
            gridDensity: Math.min(100, cells.length * 2),
            speed: 0.5 + avgEdge * 5,
            chaos: edgeSpread * 5,
            morphFactor: Math.abs(avgEdge) * 10,
            hue: avgEdge > 0 ? 120 : avgEdge < 0 ? 0 : 60,
            saturation: 0.7 + Math.abs(avgEdge) * 2,
            intensity: 0.8
        };
    }

    // === Helper Methods ===

    oddsToProb(odds) {
        if (odds > 0) {
            return 100 / (odds + 100);
        } else {
            return Math.abs(odds) / (Math.abs(odds) + 100);
        }
    }

    computeOverProb(projectedTotal, line) {
        const diff = projectedTotal - line;
        const sigma = 1.5;
        return 1 / (1 + Math.exp(-diff / sigma));
    }

    edgeToColor(edge) {
        const { edgeColorScale } = this.config;

        if (edge < -0.02) {
            return `hsl(${edgeColorScale.negative.h}, ${edgeColorScale.negative.s}%, ${edgeColorScale.negative.l}%)`;
        } else if (edge > 0.02) {
            return `hsl(${edgeColorScale.positive.h}, ${edgeColorScale.positive.s}%, ${edgeColorScale.positive.l}%)`;
        } else {
            return `hsl(${edgeColorScale.neutral.h}, ${edgeColorScale.neutral.s}%, ${edgeColorScale.neutral.l}%)`;
        }
    }

    movementToColor(delta) {
        if (delta > 5) return 'hsl(120, 70%, 50%)';   // Moved our way
        if (delta < -5) return 'hsl(0, 70%, 50%)';    // Moved against
        return 'hsl(60, 70%, 50%)';                    // Stable
    }

    categorizeEdge(edge) {
        const { edgeThresholds } = this.config;

        if (edge < -edgeThresholds.medium) return 'strong_negative';
        if (edge < -edgeThresholds.low) return 'slight_negative';
        if (edge < edgeThresholds.low) return 'neutral';
        if (edge < edgeThresholds.medium) return 'slight_positive';
        if (edge < edgeThresholds.high) return 'positive';
        return 'strong_positive';
    }

    computeHeatmapSummary(cells) {
        const edges = cells.map(c => c.edge);
        const positiveCells = cells.filter(c => c.edge > 0.02);

        const avg = edges.reduce((s, e) => s + e, 0) / edges.length;
        const variance = edges.reduce((s, e) => s + (e - avg) ** 2, 0) / edges.length;

        return {
            totalCells: cells.length,
            positiveCells: positiveCells.length,
            negativeCells: cells.filter(c => c.edge < -0.02).length,
            avgEdge: avg,
            edgeStdDev: Math.sqrt(variance),
            maxEdge: Math.max(...edges),
            minEdge: Math.min(...edges),
            topOpportunities: positiveCells
                .sort((a, b) => b.edge - a.edge)
                .slice(0, 5)
        };
    }

    computeLayout(cells, predictions) {
        // Grid layout by game
        const games = [...new Set(cells.map(c => c.gameId))];

        return {
            type: 'grid',
            rows: games.length,
            cols: 4, // home ML, away ML, over, under
            gameOrder: games,
            cellWidth: 80,
            cellHeight: 60
        };
    }
}
