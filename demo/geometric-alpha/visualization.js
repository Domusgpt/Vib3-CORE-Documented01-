/**
 * Geometric Alpha - Visualization Module
 *
 * Renders the 4D geometry and 6-channel rotations on canvas.
 */

class GeometryVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;

        this.time = 0;
        this.opportunities = [];
        this.portfolioState = null;
        this.attractor = null;

        // Animation
        this.animationId = null;
    }

    /**
     * Update visualization data
     */
    update(state) {
        this.opportunities = state.opportunities || [];
        this.portfolioState = state.portfolioState;
        this.attractor = state.attractor;
    }

    /**
     * Start animation loop
     */
    start() {
        const animate = () => {
            this.time += 0.02;
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Stop animation
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Main render function
     */
    render() {
        const ctx = this.ctx;

        // Clear with fade effect
        ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw grid
        this._drawGrid();

        // Draw opportunities as points in 4D space
        this._drawOpportunities();

        // Draw portfolio centroid
        if (this.portfolioState) {
            this._drawCentroid();
        }

        // Draw attractor indicator
        this._drawAttractorIndicator();
    }

    /**
     * Draw background grid
     */
    _drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(50, 50, 60, 0.3)';
        ctx.lineWidth = 1;

        // Radial grid
        for (let r = 50; r < this.width / 2; r += 50) {
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Cross lines
        ctx.beginPath();
        ctx.moveTo(0, this.centerY);
        ctx.lineTo(this.width, this.centerY);
        ctx.moveTo(this.centerX, 0);
        ctx.lineTo(this.centerX, this.height);
        ctx.stroke();
    }

    /**
     * Draw opportunity points
     */
    _drawOpportunities() {
        const ctx = this.ctx;

        for (const opp of this.opportunities) {
            const pos = opp.position;
            const channels = opp.channels;

            // Project 4D to 2D with rotation
            const rotatedX = pos.x * Math.cos(this.time) - pos.z * Math.sin(this.time);
            const rotatedY = pos.y * Math.cos(this.time * 0.7) - pos.w * Math.sin(this.time * 0.7);

            const screenX = this.centerX + rotatedX * 100;
            const screenY = this.centerY + rotatedY * 100;

            // Size based on energy
            const size = 5 + opp.energy * 15;

            // Color based on edge
            const edge = opp.opportunity.edge || 0;
            const hue = edge > 0 ? 140 : 0; // Green for positive, red for negative
            const saturation = 70 + Math.abs(edge) * 300;
            const lightness = 50 + channels[0] * 30;

            // Draw glow
            const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, size * 2);
            gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`);
            gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, size * 2, 0, Math.PI * 2);
            ctx.fill();

            // Draw core
            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
            ctx.fill();

            // Draw rotation indicator (shows 4D rotation effect)
            ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            const rotAngle = channels[0] * Math.PI * 2 + this.time;
            ctx.arc(screenX, screenY, size + 5, rotAngle, rotAngle + Math.PI * channels[1]);
            ctx.stroke();
        }
    }

    /**
     * Draw portfolio centroid
     */
    _drawCentroid() {
        const ctx = this.ctx;
        const state = this.portfolioState;

        // Centroid position (center for now, could be calculated)
        const x = this.centerX;
        const y = this.centerY;

        // Draw crystallization indicator
        const crystalRadius = 30 + state.crystallization * 50;
        const segments = 6;

        ctx.strokeStyle = `rgba(0, 255, 200, ${0.3 + state.crystallization * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2 + this.time * 0.5;
            const r = crystalRadius * (0.8 + Math.sin(angle * 3 + this.time) * 0.2 * (1 - state.crystallization));
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.stroke();

        // Draw energy pulse
        const pulseRadius = 20 + Math.sin(this.time * 3) * 10 * state.energy;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseRadius);
        gradient.addColorStop(0, `rgba(0, 170, 255, ${0.5 * state.energy})`);
        gradient.addColorStop(1, 'rgba(0, 170, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw attractor state indicator
     */
    _drawAttractorIndicator() {
        if (!this.attractor) return;

        const ctx = this.ctx;
        const colors = {
            'STABLE_EDGE': '#00ff88',
            'EMERGING_EDGE': '#00aaff',
            'CLOSING_WINDOW': '#ff8800',
            'CORRELATED_CLUSTER': '#aa44ff',
            'EFFICIENT_MARKET': '#666666',
            'DECAYING_EDGE': '#ff4444',
            'UNSTABLE_CHAOS': '#ff4444'
        };

        const color = colors[this.attractor.name] || '#888888';

        // Draw attractor field
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const fieldRadius = 150 + Math.sin(this.time * 2) * 10;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, fieldRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]);
    }
}

/**
 * Channel Visualizer - Draws individual rotation channels
 */
class ChannelVisualizer {
    constructor(channelIndex) {
        this.channelIndex = channelIndex;
        this.canvas = document.getElementById(`channel-${channelIndex}`);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;

        this.value = 0;
        this.time = 0;
    }

    /**
     * Update channel value
     */
    update(value) {
        this.value = value;
    }

    /**
     * Render channel visualization
     */
    render() {
        const ctx = this.ctx;
        this.time += 0.05;

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, this.width, this.height);

        const colors = [
            '#00ff88', // Edge - green
            '#ffaa00', // Confidence - orange
            '#ff4444', // Time - red
            '#ff00ff', // Correlation - magenta
            '#00ffff', // Efficiency - cyan
            '#ffff00'  // Momentum - yellow
        ];

        const color = colors[this.channelIndex];

        // Draw rotation ring
        const radius = 30;
        const rotationSpeed = this.value * 3;
        const angle = this.time * rotationSpeed;

        // Background ring
        ctx.strokeStyle = 'rgba(50, 50, 60, 0.5)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Active arc
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, radius, angle, angle + Math.PI * this.value * 2);
        ctx.stroke();

        // Center indicator
        const indicatorLength = radius * 0.7;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(
            this.centerX + Math.cos(angle) * indicatorLength,
            this.centerY + Math.sin(angle) * indicatorLength
        );
        ctx.stroke();

        // Center dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Export to window
window.GeometryVisualizer = GeometryVisualizer;
window.ChannelVisualizer = ChannelVisualizer;
