import { VirtualLayerCompositor, DEFAULT_LAYERS } from '../../src/core/VirtualLayerCompositor.js';

function createLayerPatterns() {
    return {
        background: (gl, target, time) => {
            const pulse = 0.06 + 0.04 * Math.sin(time * 0.5);
            gl.clearColor(0.02 + pulse, 0.05 + pulse * 0.5, 0.12 + pulse * 0.25, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        },
        shadow: (gl, target, time) => {
            gl.enable(gl.SCISSOR_TEST);
            const size = (Math.sin(time) * 0.25 + 0.75) * target.width * 0.25;
            gl.scissor((target.width - size) / 2, (target.height - size) / 2, size, size);
            gl.clearColor(0, 0, 0, 0.5);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.disable(gl.SCISSOR_TEST);
        },
        content: (gl, target, time) => {
            const rotation = time * 0.6;
            gl.enable(gl.SCISSOR_TEST);
            const w = target.width;
            const h = target.height;
            const cx = w / 2;
            const cy = h / 2;
            const span = Math.max(60, (Math.sin(time * 1.3) * 0.5 + 0.5) * Math.min(w, h) * 0.35);
            for (let i = 0; i < 3; i++) {
                const angle = rotation + (i * Math.PI * 2) / 3;
                const x = cx + Math.cos(angle) * span * 0.6;
                const y = cy + Math.sin(angle) * span * 0.35;
                gl.scissor(x - span * 0.35, y - span * 0.35, span * 0.7, span * 0.7);
                gl.clearColor(0.1 + 0.05 * i, 0.18 + 0.03 * i, 0.35 + 0.02 * i, 0.9);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            gl.disable(gl.SCISSOR_TEST);
        },
        highlight: (gl, target, time) => {
            gl.enable(gl.SCISSOR_TEST);
            const stripeWidth = Math.max(8, target.width * 0.02);
            const offset = ((time * 60) % (stripeWidth * 4)) - stripeWidth * 2;
            for (let x = -stripeWidth * 2; x < target.width + stripeWidth * 2; x += stripeWidth * 4) {
                gl.scissor(x + offset, 0, stripeWidth, target.height);
                gl.clearColor(0.7, 0.95, 1.0, 0.45);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            gl.disable(gl.SCISSOR_TEST);
        },
        accent: (gl, target, time) => {
            gl.enable(gl.SCISSOR_TEST);
            const sparkleCount = 5;
            const w = target.width;
            const h = target.height;
            for (let i = 0; i < sparkleCount; i++) {
                const phase = time * 0.9 + i;
                const x = (Math.sin(phase * 1.7) * 0.5 + 0.5) * w;
                const y = (Math.cos(phase * 1.3) * 0.5 + 0.5) * h;
                const size = 10 + Math.sin(phase * 3.1) * 6;
                gl.scissor(x - size, y - size, size * 2, size * 2);
                gl.clearColor(1.0, 0.4 + 0.2 * Math.sin(phase), 0.8, 0.5);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            gl.disable(gl.SCISSOR_TEST);
        }
    };
}

function bootUnifiedDemo() {
    const compositor = new VirtualLayerCompositor({ containerId: 'canvasContainer' });
    compositor.defineLayers(DEFAULT_LAYERS);
    const patterns = createLayerPatterns();
    compositor.start(patterns);

    window.vibUnifiedDemo = {
        compositor,
        stop: () => compositor.stop(),
        start: () => compositor.start(patterns),
        diagnostics: () => compositor.getDiagnostics(),
        reinitialize: (layers = DEFAULT_LAYERS) => {
            compositor.defineLayers(layers);
            compositor.start(patterns);
            return compositor.getDiagnostics();
        }
    };

    console.log('🧪 Phase 2 unified canvas demo ready', compositor.getDiagnostics());
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootUnifiedDemo();
} else {
    document.addEventListener('DOMContentLoaded', bootUnifiedDemo);
}
