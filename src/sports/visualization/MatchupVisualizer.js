/**
 * MatchupVisualizer - Game Matchup Visualization
 *
 * Creates visual representations of pitcher-batter matchups using
 * the VIB3+ engine. Combines geometric profiles, zone overlays,
 * and defensive coverage into an interactive visualization.
 *
 * @class MatchupVisualizer
 */

import { PlayerGeometricProfile } from './PlayerGeometricProfile.js';

export class MatchupVisualizer {
    constructor(engine = null) {
        this.engine = engine; // VIB3+ engine instance
        this.profileGenerator = new PlayerGeometricProfile();

        // Visualization state
        this.currentMatchup = null;
        this.animationFrame = null;
    }

    /**
     * Set the VIB3+ engine instance
     */
    setEngine(engine) {
        this.engine = engine;
    }

    /**
     * Visualize a pitcher vs team matchup
     * @param {Object} matchupData - Matchup details with features
     */
    async visualizeMatchup(matchupData) {
        const {
            pitcherArsenal,
            umpireHull,
            defensiveVoronoi,
            battingTeamProfile
        } = matchupData;

        this.currentMatchup = matchupData;

        // Generate pitcher's geometric profile
        const pitcherProfile = this.profileGenerator.generateProfile(pitcherArsenal);

        // Create composite visualization
        const visualization = {
            // Main 4D geometry from pitcher
            primaryGeometry: pitcherProfile,

            // Zone overlay (2D projection)
            zoneOverlay: this.createZoneOverlay(umpireHull),

            // Field coverage (2D projection)
            fieldOverlay: this.createFieldOverlay(defensiveVoronoi),

            // Animation parameters
            animation: {
                autoRotate: true,
                speed: pitcherProfile.speed,
                pulsate: true,
                pulseFrequency: pitcherArsenal?.metrics?.clusterSeparation || 0.5
            }
        };

        // Apply to VIB3+ engine if available
        if (this.engine) {
            this.applyVisualization(visualization);
        }

        return visualization;
    }

    /**
     * Visualize pitch tunnel network
     */
    visualizeTunnelNetwork(tunnelScores, arsenal) {
        if (!tunnelScores || tunnelScores.length === 0) {
            return null;
        }

        // Create nodes from pitch types
        const nodes = [...new Set(tunnelScores.flatMap(t => [t.pitchA, t.pitchB]))];

        // Position nodes in a circle
        const nodePositions = {};
        nodes.forEach((node, i) => {
            const angle = (2 * Math.PI * i) / nodes.length;
            nodePositions[node] = {
                x: Math.cos(angle) * 100,
                y: Math.sin(angle) * 100,
                geometry: this.profileGenerator.config.pitchTypeGeometry[node] || 0
            };
        });

        // Create edges with tunnel strength
        const edges = tunnelScores.map(ts => ({
            source: nodePositions[ts.pitchA],
            target: nodePositions[ts.pitchB],
            strength: ts.score,
            frequency: ts.frequency,
            color: this.scoreToColor(ts.score)
        }));

        // Generate overall network metrics
        const networkMetrics = {
            connectivity: edges.reduce((s, e) => s + e.strength, 0) / edges.length,
            density: edges.length / (nodes.length * (nodes.length - 1) / 2),
            maxTunnel: Math.max(...edges.map(e => e.strength)),
            minTunnel: Math.min(...edges.map(e => e.strength))
        };

        return {
            nodes: Object.entries(nodePositions).map(([name, pos]) => ({
                name,
                ...pos
            })),
            edges,
            metrics: networkMetrics,
            // VIB3+ parameters for network visualization
            vib3Params: {
                geometry: 6, // Wave (network flow)
                gridDensity: nodes.length * 10,
                speed: networkMetrics.connectivity,
                chaos: 1 - networkMetrics.density,
                morphFactor: networkMetrics.maxTunnel / 3
            }
        };
    }

    /**
     * Create animated strike zone visualization
     */
    createZoneOverlay(umpireHull) {
        if (!umpireHull || !umpireHull.hull) {
            return this.getDefaultZoneOverlay();
        }

        // Normalize hull to screen coordinates
        const normalizedHull = umpireHull.hull.map(([x, z]) => ({
            x: (x + 1) / 2, // -1 to 1 → 0 to 1
            y: (z - 1.5) / 2 // 1.5 to 3.5 → 0 to 1
        }));

        return {
            hull: normalizedHull,
            centroid: {
                x: (umpireHull.centroid[0] + 1) / 2,
                y: (umpireHull.centroid[1] - 1.5) / 2
            },
            expansion: umpireHull.expansionFactor,
            color: this.expansionToColor(umpireHull.expansionFactor),
            // Rulebook zone for reference
            rulebook: [
                { x: 0.15, y: 0 },
                { x: 0.85, y: 0 },
                { x: 0.85, y: 1 },
                { x: 0.15, y: 1 }
            ],
            // Pulse animation based on consistency
            pulseAmplitude: umpireHull.asymmetry?.magnitude || 0,
            insights: umpireHull.insights || []
        };
    }

    /**
     * Create field coverage overlay
     */
    createFieldOverlay(voronoi) {
        if (!voronoi || !voronoi.cells) {
            return this.getDefaultFieldOverlay();
        }

        const cells = Object.entries(voronoi.cells).map(([position, cell]) => ({
            position,
            // Convert field coords to normalized 0-1 space
            boundary: (cell.boundary || []).map(p => ({
                x: (p.x + 400) / 800, // -400 to 400 → 0 to 1
                y: p.y / 400           // 0 to 400 → 0 to 1
            })),
            area: cell.area,
            fielder: cell.fielder
        }));

        // Highlight gaps
        const gaps = (voronoi.gaps?.gapZones || []).map(gap => ({
            x: (gap.centroid.x + 400) / 800,
            y: gap.centroid.y / 400,
            area: gap.area,
            severity: gap.pointCount > 10 ? 'high' : 'medium'
        }));

        return {
            cells,
            gaps,
            coverage: voronoi.coverage,
            // Color by coverage efficiency
            colorScheme: 'coverage'
        };
    }

    /**
     * Apply visualization to VIB3+ engine
     */
    applyVisualization(visualization) {
        if (!this.engine) return;

        const params = visualization.primaryGeometry;

        // Set main geometry parameters
        if (this.engine.setParameters) {
            this.engine.setParameters({
                geometry: params.geometry,
                speed: params.speed,
                morphFactor: params.morphFactor,
                chaos: params.chaos,
                gridDensity: params.gridDensity,
                rot4dXY: params.rot4dXY,
                rot4dXZ: params.rot4dXZ,
                rot4dYZ: params.rot4dYZ,
                rot4dXW: params.rot4dXW,
                rot4dYW: params.rot4dYW,
                rot4dZW: params.rot4dZW,
                hue: params.hue,
                saturation: params.saturation,
                intensity: params.intensity
            });
        }

        // Start animation if enabled
        if (visualization.animation.autoRotate) {
            this.startAnimation(visualization.animation);
        }
    }

    /**
     * Start animation loop
     */
    startAnimation(animationParams) {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        let time = 0;
        const animate = () => {
            time += 0.016 * animationParams.speed;

            if (this.engine && this.engine.setParameters) {
                // Subtle rotation animation
                this.engine.setParameters({
                    rot4dXW: Math.sin(time * 0.5) * 0.5 + Math.PI / 4,
                    rot4dYW: Math.cos(time * 0.3) * 0.5 + Math.PI / 4
                });
            }

            this.animationFrame = requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Stop animation
     */
    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Generate comparison visualization
     */
    visualizeComparison(arsenalA, arsenalB, labels = {}) {
        const comparison = this.profileGenerator.generateMatchupVisualization(
            arsenalA,
            arsenalB
        );

        // Create side-by-side layout
        return {
            left: {
                label: labels.left || 'Pitcher A',
                profile: comparison.playerA
            },
            right: {
                label: labels.right || 'Pitcher B',
                profile: comparison.playerB
            },
            center: {
                label: 'Matchup',
                profile: comparison.comparison.blended
            },
            diff: comparison.comparison
        };
    }

    /**
     * Export visualization as JSON for external rendering
     */
    exportVisualization() {
        if (!this.currentMatchup) return null;

        return {
            matchup: this.currentMatchup,
            timestamp: Date.now(),
            format: 'vib3-matchup-v1'
        };
    }

    // === Helper Methods ===

    scoreToColor(score) {
        // High score = green, low = red
        const hue = Math.min(120, score * 40);
        return `hsl(${hue}, 70%, 50%)`;
    }

    expansionToColor(expansion) {
        // Expansion > 1 = red (larger zone), < 1 = green (smaller)
        if (expansion > 1.1) return 'rgba(220, 53, 69, 0.3)';   // Red
        if (expansion < 0.9) return 'rgba(40, 167, 69, 0.3)';   // Green
        return 'rgba(255, 193, 7, 0.3)';                         // Yellow
    }

    getDefaultZoneOverlay() {
        return {
            hull: [
                { x: 0.15, y: 0 },
                { x: 0.85, y: 0 },
                { x: 0.85, y: 1 },
                { x: 0.15, y: 1 }
            ],
            centroid: { x: 0.5, y: 0.5 },
            expansion: 1,
            color: 'rgba(128, 128, 128, 0.3)',
            rulebook: [
                { x: 0.15, y: 0 },
                { x: 0.85, y: 0 },
                { x: 0.85, y: 1 },
                { x: 0.15, y: 1 }
            ],
            pulseAmplitude: 0,
            insights: []
        };
    }

    getDefaultFieldOverlay() {
        return {
            cells: [],
            gaps: [],
            coverage: { totalArea: 0, avgCellArea: 0 },
            colorScheme: 'default'
        };
    }
}
