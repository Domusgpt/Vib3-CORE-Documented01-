/**
 * PlayerGeometricProfile - Map Players to VIB3+ Geometry
 *
 * Converts player statistics and arsenal topology into VIB3+ geometric
 * representations. Each player's "geometric signature" is rendered as
 * a unique 4D shape that encodes their performance characteristics.
 *
 * Mapping Strategy:
 * - Arsenal volume → Geometry type (0-23)
 * - Tunnel efficiency → Rotation speed
 * - Stability → Morphing factor
 * - Dominant pitch → Core type (base/hypersphere/hypertetrahedron)
 *
 * @class PlayerGeometricProfile
 */

export class PlayerGeometricProfile {
    constructor(config = {}) {
        this.config = {
            // Base geometry mappings
            pitchTypeGeometry: {
                FF: 0,   // Fastball → Tesseract (power)
                SI: 1,   // Sinker → Tetrahedron (down movement)
                FC: 2,   // Cutter → Sphere (tight spin)
                SL: 3,   // Slider → Torus (sweeping)
                CU: 4,   // Curveball → Klein Bottle (complex topology)
                CH: 5,   // Changeup → Fractal (deception)
                FS: 6,   // Splitter → Wave (falling action)
                KC: 7    // Knuckle Curve → Crystal (unpredictable)
            },

            // Core type mappings (arsenal size)
            coreTypeThresholds: {
                small: 8,    // 1-3 pitch types → Base
                medium: 16,  // 4-5 pitch types → Hypersphere
                large: 24    // 6+ pitch types → Hypertetrahedron
            },

            // Parameter ranges
            rotationRange: { min: 0.1, max: 2.0 },
            morphRange: { min: 0, max: 2 },
            chaosRange: { min: 0, max: 1 },

            ...config
        };
    }

    /**
     * Generate geometric profile from arsenal topology
     * @param {Object} arsenal - Arsenal topology data
     * @returns {Object} VIB3+ parameters
     */
    generateProfile(arsenal) {
        if (!arsenal || !arsenal.clusters) {
            return this.getDefaultProfile();
        }

        // Determine dominant pitch type
        const dominantPitch = arsenal.clusters.dominantPitch || 'FF';
        const baseGeometry = this.config.pitchTypeGeometry[dominantPitch] || 0;

        // Determine core type based on arsenal variety
        const numPitchTypes = arsenal.clusters.typeCount || 1;
        let coreType = 0; // Base
        if (numPitchTypes >= 6) {
            coreType = 2; // Hypertetrahedron
        } else if (numPitchTypes >= 4) {
            coreType = 1; // Hypersphere
        }

        // Calculate geometry index: coreType * 8 + baseGeometry
        const geometry = coreType * 8 + baseGeometry;

        // Map metrics to VIB3+ parameters
        const params = {
            geometry,

            // Rotation based on tunnel efficiency
            speed: this.mapToRange(
                arsenal.metrics?.arsenalSpread || 0.5,
                0, 2,
                this.config.rotationRange.min,
                this.config.rotationRange.max
            ),

            // Morphing based on stability
            morphFactor: this.mapToRange(
                1 - (arsenal.stability?.overall || 0.5),
                0, 1,
                this.config.morphRange.min,
                this.config.morphRange.max
            ),

            // Chaos based on cluster separation
            chaos: this.mapToRange(
                1 - (arsenal.clusters?.avgSeparation || 0.5) / 3,
                0, 1,
                this.config.chaosRange.min,
                this.config.chaosRange.max
            ),

            // Grid density based on sample size
            gridDensity: Math.min(100, Math.max(10,
                Math.sqrt(arsenal.sampleSize || 100)
            )),

            // 6D rotation based on arsenal characteristics
            rot4dXY: (arsenal.cloudStats?.centroid?.[0] || 0) * Math.PI / 4 + Math.PI,
            rot4dXZ: (arsenal.cloudStats?.centroid?.[1] || 0) * Math.PI / 4 + Math.PI,
            rot4dYZ: (arsenal.cloudStats?.centroid?.[2] || 0) * Math.PI / 4 + Math.PI,
            rot4dXW: (arsenal.metrics?.arsenalVolume || 0.5) * Math.PI / 2,
            rot4dYW: (arsenal.stability?.compactness || 0.5) * Math.PI / 2,
            rot4dZW: (arsenal.stability?.separation || 0.5) * Math.PI / 2,

            // Color based on pitch type
            hue: this.getPitchTypeHue(dominantPitch),
            saturation: arsenal.stability?.overall || 0.7,
            intensity: arsenal.metrics?.clusterSeparation || 0.8
        };

        return params;
    }

    /**
     * Generate comparative visualization between two players
     */
    generateMatchupVisualization(arsenalA, arsenalB) {
        const profileA = this.generateProfile(arsenalA);
        const profileB = this.generateProfile(arsenalB);

        // Compute difference profile
        const diff = {
            geometryDiff: Math.abs(profileA.geometry - profileB.geometry),
            speedDiff: profileA.speed - profileB.speed,
            morphDiff: profileA.morphFactor - profileB.morphFactor,
            chaosDiff: profileA.chaos - profileB.chaos,

            // Blended visualization
            blended: {
                geometry: profileA.geometry, // Use pitcher A's geometry
                speed: (profileA.speed + profileB.speed) / 2,
                morphFactor: Math.abs(profileA.morphFactor - profileB.morphFactor),
                chaos: Math.max(profileA.chaos, profileB.chaos),
                rot4dXY: profileA.rot4dXY,
                rot4dXZ: profileB.rot4dXZ,
                rot4dYZ: (profileA.rot4dYZ + profileB.rot4dYZ) / 2,
                rot4dXW: profileA.rot4dXW,
                rot4dYW: profileB.rot4dYW,
                rot4dZW: (profileA.rot4dZW + profileB.rot4dZW) / 2,
                hue: (profileA.hue + profileB.hue) / 2,
                saturation: 0.9,
                intensity: 1.0
            }
        };

        return {
            playerA: profileA,
            playerB: profileB,
            comparison: diff
        };
    }

    /**
     * Generate team-level geometric signature
     */
    generateTeamProfile(pitcherArsenals) {
        if (!pitcherArsenals || pitcherArsenals.length === 0) {
            return this.getDefaultProfile();
        }

        // Average team characteristics
        const avgVolume = pitcherArsenals.reduce(
            (s, a) => s + (a.metrics?.arsenalVolume || 0), 0
        ) / pitcherArsenals.length;

        const avgStability = pitcherArsenals.reduce(
            (s, a) => s + (a.stability?.overall || 0), 0
        ) / pitcherArsenals.length;

        const avgSeparation = pitcherArsenals.reduce(
            (s, a) => s + (a.clusters?.avgSeparation || 0), 0
        ) / pitcherArsenals.length;

        // Dominant pitch type across team
        const pitchCounts = {};
        for (const arsenal of pitcherArsenals) {
            const dominant = arsenal.clusters?.dominantPitch || 'FF';
            pitchCounts[dominant] = (pitchCounts[dominant] || 0) + 1;
        }
        const teamDominant = Object.entries(pitchCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'FF';

        return {
            geometry: this.config.pitchTypeGeometry[teamDominant] + 8, // Hypersphere core for team
            speed: this.mapToRange(avgVolume, 0, 2, 0.3, 1.5),
            morphFactor: this.mapToRange(1 - avgStability, 0, 1, 0, 1.5),
            chaos: this.mapToRange(1 - avgSeparation / 3, 0, 1, 0, 0.8),
            gridDensity: 50,
            hue: this.getPitchTypeHue(teamDominant),
            saturation: 0.8,
            intensity: 0.9,
            rot4dXY: Math.PI,
            rot4dXZ: Math.PI,
            rot4dYZ: Math.PI,
            rot4dXW: avgVolume * Math.PI / 2,
            rot4dYW: avgStability * Math.PI / 2,
            rot4dZW: avgSeparation * Math.PI / 4
        };
    }

    /**
     * Generate animation keyframes for arsenal evolution
     */
    generateEvolutionAnimation(arsenalHistory, duration = 10000) {
        const keyframes = [];
        const frameCount = arsenalHistory.length;

        for (let i = 0; i < frameCount; i++) {
            const profile = this.generateProfile(arsenalHistory[i]);
            const time = (i / (frameCount - 1)) * duration;

            keyframes.push({
                time,
                params: profile,
                meta: {
                    pitchCount: arsenalHistory[i].sampleSize,
                    date: arsenalHistory[i].date
                }
            });
        }

        return {
            keyframes,
            duration,
            interpolation: 'smooth' // or 'linear', 'step'
        };
    }

    /**
     * Map tunnel graph to VIB3+ edge visualization
     */
    mapTunnelGraphToEdges(tunnelGraph) {
        if (!tunnelGraph || !tunnelGraph.edges) return [];

        return tunnelGraph.edges.map(edge => ({
            sourceGeometry: this.config.pitchTypeGeometry[edge.source] || 0,
            targetGeometry: this.config.pitchTypeGeometry[edge.target] || 0,
            weight: edge.tunnelScore,
            color: this.tunnelScoreToColor(edge.tunnelScore),
            thickness: edge.frequency * 3
        }));
    }

    // === Helper Methods ===

    mapToRange(value, inMin, inMax, outMin, outMax) {
        const clamped = Math.max(inMin, Math.min(inMax, value));
        return outMin + (clamped - inMin) * (outMax - outMin) / (inMax - inMin);
    }

    getPitchTypeHue(pitchType) {
        // Color wheel mapping for pitch types
        const hueMap = {
            FF: 0,    // Red - Power
            SI: 30,   // Orange - Sink
            FC: 60,   // Yellow - Cut
            SL: 180,  // Cyan - Slide
            CU: 240,  // Blue - Curve
            CH: 280,  // Purple - Deception
            FS: 320,  // Pink - Fall
            KC: 120   // Green - Unpredictable
        };
        return hueMap[pitchType] || 0;
    }

    tunnelScoreToColor(score) {
        // High tunnel score = good (green), low = red
        const hue = this.mapToRange(score, 0, 3, 0, 120);
        return { h: hue, s: 0.8, l: 0.5 };
    }

    getDefaultProfile() {
        return {
            geometry: 0,
            speed: 1.0,
            morphFactor: 0.5,
            chaos: 0.3,
            gridDensity: 30,
            rot4dXY: Math.PI,
            rot4dXZ: Math.PI,
            rot4dYZ: Math.PI,
            rot4dXW: 0,
            rot4dYW: 0,
            rot4dZW: 0,
            hue: 200,
            saturation: 0.7,
            intensity: 0.8
        };
    }
}
