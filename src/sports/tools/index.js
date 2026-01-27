/**
 * Geometric Alpha MCP Tools
 *
 * Exposes sports analytics functionality through the MCP (Model Context Protocol)
 * interface for agentic automation and CLI integration.
 *
 * Available Tools:
 * - analyze_pitcher: Compute arsenal topology for a pitcher
 * - analyze_umpire: Compute strike zone hull for an umpire
 * - predict_game: Generate predictions for a game matchup
 * - find_value: Find value bets in current odds
 * - optimize_bets: Get optimal bet sizing for opportunities
 * - run_backtest: Run historical validation
 * - visualize_matchup: Generate VIB3+ visualization params
 *
 * @module GeometricAlphaTools
 */

import { GeometricAlphaEngine } from '../GeometricAlphaEngine.js';
import { TunnelAnalyzer } from '../features/TunnelAnalyzer.js';
import { UmpireZoneHull } from '../features/UmpireZoneHull.js';
import { DefensiveVoronoi } from '../features/DefensiveVoronoi.js';
import { ArsenalTopology } from '../features/ArsenalTopology.js';
import { PlayerGeometricProfile } from '../visualization/PlayerGeometricProfile.js';
import { KellyCriterion } from '../finance/KellyCriterion.js';

/**
 * MCP Tool Definitions
 */
export const toolDefinitions = [
    {
        name: 'analyze_pitcher',
        description: 'Analyze a pitcher\'s arsenal topology and tunnel efficiency',
        inputSchema: {
            type: 'object',
            properties: {
                pitcherId: {
                    type: 'number',
                    description: 'MLB player ID for the pitcher'
                },
                pitches: {
                    type: 'array',
                    description: 'Array of pitch data (from Statcast)'
                }
            },
            required: ['pitcherId']
        }
    },
    {
        name: 'analyze_umpire',
        description: 'Analyze an umpire\'s strike zone convex hull',
        inputSchema: {
            type: 'object',
            properties: {
                umpireId: {
                    type: 'string',
                    description: 'Umpire identifier'
                },
                calledStrikes: {
                    type: 'array',
                    description: 'Array of called strikes with plate_x, plate_z'
                }
            },
            required: ['umpireId']
        }
    },
    {
        name: 'compute_tunnel_scores',
        description: 'Calculate pitch tunneling scores for a pitcher',
        inputSchema: {
            type: 'object',
            properties: {
                pitches: {
                    type: 'array',
                    description: 'Pitch data with trajectory information'
                }
            },
            required: ['pitches']
        }
    },
    {
        name: 'find_value_bets',
        description: 'Find value betting opportunities in market odds',
        inputSchema: {
            type: 'object',
            properties: {
                predictions: {
                    type: 'array',
                    description: 'Model predictions with probabilities'
                },
                odds: {
                    type: 'array',
                    description: 'Current market odds'
                },
                minEdge: {
                    type: 'number',
                    description: 'Minimum edge threshold (default 0.02)'
                }
            },
            required: ['predictions', 'odds']
        }
    },
    {
        name: 'optimize_kelly',
        description: 'Calculate optimal bet sizes using Kelly criterion',
        inputSchema: {
            type: 'object',
            properties: {
                opportunities: {
                    type: 'array',
                    description: 'Value bet opportunities'
                },
                bankroll: {
                    type: 'number',
                    description: 'Current bankroll'
                },
                maxExposure: {
                    type: 'number',
                    description: 'Maximum total exposure (default 0.25)'
                },
                kellyFraction: {
                    type: 'number',
                    description: 'Kelly fraction (default 0.25 for quarter Kelly)'
                }
            },
            required: ['opportunities', 'bankroll']
        }
    },
    {
        name: 'generate_player_visualization',
        description: 'Generate VIB3+ visualization parameters for a player',
        inputSchema: {
            type: 'object',
            properties: {
                arsenal: {
                    type: 'object',
                    description: 'Arsenal topology data'
                }
            },
            required: ['arsenal']
        }
    },
    {
        name: 'compute_defensive_coverage',
        description: 'Analyze defensive coverage using Voronoi tessellation',
        inputSchema: {
            type: 'object',
            properties: {
                fielders: {
                    type: 'array',
                    description: 'Fielder positions with sprint speeds'
                },
                battedBalls: {
                    type: 'array',
                    description: 'Batter\'s spray chart data'
                }
            },
            required: ['fielders']
        }
    }
];

/**
 * Tool Handler Implementation
 */
export class GeometricAlphaToolHandler {
    constructor(config = {}) {
        this.config = config;

        // Initialize analyzers
        this.tunnelAnalyzer = new TunnelAnalyzer();
        this.umpireHull = new UmpireZoneHull();
        this.defensiveVoronoi = new DefensiveVoronoi();
        this.arsenalTopology = new ArsenalTopology();
        this.profileGenerator = new PlayerGeometricProfile();
        this.kelly = new KellyCriterion(config.kelly);

        // Engine instance (lazy initialization)
        this.engine = null;
    }

    /**
     * Handle tool invocation
     */
    async handleTool(name, params) {
        switch (name) {
            case 'analyze_pitcher':
                return this.analyzePitcher(params);

            case 'analyze_umpire':
                return this.analyzeUmpire(params);

            case 'compute_tunnel_scores':
                return this.computeTunnelScores(params);

            case 'find_value_bets':
                return this.findValueBets(params);

            case 'optimize_kelly':
                return this.optimizeKelly(params);

            case 'generate_player_visualization':
                return this.generatePlayerVisualization(params);

            case 'compute_defensive_coverage':
                return this.computeDefensiveCoverage(params);

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }

    /**
     * Analyze pitcher arsenal
     */
    async analyzePitcher(params) {
        const { pitcherId, pitches } = params;

        if (!pitches || pitches.length === 0) {
            return {
                success: false,
                error: 'No pitch data provided'
            };
        }

        // Compute arsenal topology
        const topology = this.arsenalTopology.computeArsenalTopology(
            pitches,
            pitcherId
        );

        // Compute tunnel scores
        const tunnelScores = this.tunnelAnalyzer.computeTunnelScores(pitches);

        // Build tunnel graph
        const tunnelGraph = this.tunnelAnalyzer.buildTunnelGraph(tunnelScores);

        return {
            success: true,
            pitcherId,
            sampleSize: pitches.length,
            topology: {
                metrics: topology.metrics,
                clusters: topology.clusters,
                stability: topology.stability
            },
            tunneling: {
                scores: tunnelScores,
                graph: tunnelGraph,
                efficiency: tunnelGraph.metrics.avgTunnelScore
            }
        };
    }

    /**
     * Analyze umpire zone
     */
    async analyzeUmpire(params) {
        const { umpireId, calledStrikes } = params;

        if (!calledStrikes || calledStrikes.length < 3) {
            return {
                success: false,
                error: 'Insufficient called strikes (need at least 3)'
            };
        }

        const hull = this.umpireHull.computeHull(calledStrikes, umpireId);

        return {
            success: true,
            umpireId,
            sampleSize: calledStrikes.length,
            zone: {
                area: hull.area,
                expansionFactor: hull.expansionFactor,
                centroid: hull.centroid,
                asymmetry: hull.asymmetry,
                vertices: hull.hull.length
            },
            insights: hull.insights
        };
    }

    /**
     * Compute tunnel scores
     */
    async computeTunnelScores(params) {
        const { pitches } = params;

        if (!pitches || pitches.length < 50) {
            return {
                success: false,
                error: 'Insufficient pitch data (need at least 50)'
            };
        }

        const scores = this.tunnelAnalyzer.computeTunnelScores(pitches);
        const graph = this.tunnelAnalyzer.buildTunnelGraph(scores);

        return {
            success: true,
            scores,
            graph,
            summary: {
                avgTunnelScore: graph.metrics.avgTunnelScore,
                maxTunnelScore: graph.metrics.maxTunnelScore,
                pitchPairs: scores.length,
                connectivity: graph.metrics.connectivity
            }
        };
    }

    /**
     * Find value bets
     */
    async findValueBets(params) {
        const { predictions, odds, minEdge = 0.02 } = params;

        const valueBets = [];

        for (const pred of predictions) {
            const gameOdds = odds.find(o => o.gameId === pred.gameId);
            if (!gameOdds) continue;

            // Check moneyline
            const homeImplied = this.kelly.impliedProbability(gameOdds.homeOdds);
            const awayImplied = this.kelly.impliedProbability(gameOdds.awayOdds);

            const homeEdge = pred.homeWinProb - homeImplied;
            const awayEdge = pred.awayWinProb - awayImplied;

            if (homeEdge > minEdge) {
                valueBets.push({
                    gameId: pred.gameId,
                    betType: 'moneyline',
                    side: 'home',
                    team: pred.homeTeam,
                    modelProb: pred.homeWinProb,
                    impliedProb: homeImplied,
                    edge: homeEdge,
                    odds: gameOdds.homeOdds,
                    ev: this.kelly.calculateEdge(pred.homeWinProb, gameOdds.homeOdds)
                });
            }

            if (awayEdge > minEdge) {
                valueBets.push({
                    gameId: pred.gameId,
                    betType: 'moneyline',
                    side: 'away',
                    team: pred.awayTeam,
                    modelProb: pred.awayWinProb,
                    impliedProb: awayImplied,
                    edge: awayEdge,
                    odds: gameOdds.awayOdds,
                    ev: this.kelly.calculateEdge(pred.awayWinProb, gameOdds.awayOdds)
                });
            }
        }

        return {
            success: true,
            valueBets: valueBets.sort((a, b) => b.edge - a.edge),
            totalOpportunities: valueBets.length,
            avgEdge: valueBets.length > 0 ?
                valueBets.reduce((s, b) => s + b.edge, 0) / valueBets.length : 0
        };
    }

    /**
     * Optimize Kelly allocations
     */
    async optimizeKelly(params) {
        const {
            opportunities,
            bankroll,
            maxExposure = 0.25,
            kellyFraction = 0.25
        } = params;

        // Calculate individual Kelly stakes
        const stakes = opportunities.map(opp => {
            const kelly = this.kelly.calculateSingleKelly(opp.modelProb, opp.odds);
            return {
                ...opp,
                kellyStake: kelly,
                recommendedAmount: kelly * bankroll
            };
        });

        // Scale if over max exposure
        const totalKelly = stakes.reduce((s, st) => s + st.kellyStake, 0);

        if (totalKelly > maxExposure) {
            const scale = maxExposure / totalKelly;
            stakes.forEach(st => {
                st.kellyStake *= scale;
                st.recommendedAmount = st.kellyStake * bankroll;
            });
        }

        const totalExposure = stakes.reduce((s, st) => s + st.kellyStake, 0);
        const totalEV = stakes.reduce((s, st) => s + st.ev * st.kellyStake, 0);

        return {
            success: true,
            allocations: stakes,
            totalExposure,
            totalAmount: totalExposure * bankroll,
            expectedValue: totalEV * bankroll,
            numBets: stakes.filter(s => s.kellyStake > 0).length
        };
    }

    /**
     * Generate player visualization
     */
    async generatePlayerVisualization(params) {
        const { arsenal } = params;

        const profile = this.profileGenerator.generateProfile(arsenal);

        return {
            success: true,
            vib3Params: profile,
            description: this.describeGeometry(profile)
        };
    }

    /**
     * Compute defensive coverage
     */
    async computeDefensiveCoverage(params) {
        const { fielders, battedBalls } = params;

        const voronoi = this.defensiveVoronoi.computeVoronoi(fielders);

        let seamExposure = null;
        if (battedBalls && battedBalls.length > 0) {
            seamExposure = this.defensiveVoronoi.computeSeamExposure(
                battedBalls,
                voronoi
            );
        }

        return {
            success: true,
            coverage: voronoi.coverage,
            gaps: voronoi.gaps,
            seamExposure,
            cellAreas: Object.entries(voronoi.cells).map(([pos, cell]) => ({
                position: pos,
                area: cell.area
            }))
        };
    }

    /**
     * Helper to describe geometry
     */
    describeGeometry(profile) {
        const geometryNames = [
            'Tesseract', 'Tetrahedron', 'Sphere', 'Torus',
            'Klein Bottle', 'Fractal', 'Wave', 'Crystal'
        ];
        const coreNames = ['Base', 'Hypersphere', 'Hypertetrahedron'];

        const baseIdx = profile.geometry % 8;
        const coreIdx = Math.floor(profile.geometry / 8);

        return {
            geometry: `${geometryNames[baseIdx]} (${coreNames[coreIdx]} core)`,
            speed: profile.speed < 0.5 ? 'Slow' : profile.speed < 1 ? 'Medium' : 'Fast',
            complexity: profile.chaos < 0.3 ? 'Controlled' : profile.chaos < 0.7 ? 'Dynamic' : 'Chaotic'
        };
    }
}

/**
 * Register tools with MCP server
 */
export function registerTools(mcpServer, config = {}) {
    const handler = new GeometricAlphaToolHandler(config);

    for (const tool of toolDefinitions) {
        mcpServer.registerTool(tool.name, tool, async (params) => {
            try {
                return await handler.handleTool(tool.name, params);
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }

    return handler;
}
