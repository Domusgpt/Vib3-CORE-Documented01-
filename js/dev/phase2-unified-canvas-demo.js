import { VirtualLayerCompositor, DEFAULT_LAYERS } from '../../src/core/VirtualLayerCompositor.js';
import { normalizeBandsFromFFT } from './phase1-harness.js';

class ReactiveInputs {
    constructor() {
        this.context = null;
        this.analyser = null;
        this.fftBuffer = null;
        this.sourceCleanup = null;
        this.state = {
            bands: new Float32Array(7).fill(0),
            energy: 0,
            telemetry: { player_health: 1, combo_multiplier: 0, zone: 'calm' }
        };
    }

    async start() {
        try {
            await this.startWithMicrophone();
            console.log('🎙️ Unified demo audio: microphone enabled');
        } catch (error) {
            console.warn('⚠️ Microphone unavailable, falling back to oscillator', error);
            await this.startWithOscillator();
        }
    }

    async startWithMicrophone() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx = this.getContext();
        const source = ctx.createMediaStreamSource(stream);
        this.attachAnalyser(ctx, source);
        this.sourceCleanup = () => stream.getTracks().forEach((t) => t.stop());
    }

    async startWithOscillator() {
        const ctx = this.getContext();
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 180;
        const gain = ctx.createGain();
        gain.gain.value = 0.04;
        osc.connect(gain);
        this.attachAnalyser(ctx, gain);
        osc.start();
        this.sourceCleanup = () => {
            osc.stop();
            osc.disconnect();
            gain.disconnect();
        };
    }

    getContext() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        return this.context;
    }

    attachAnalyser(ctx, source) {
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 1024;
        this.analyser.smoothingTimeConstant = 0.72;
        source.connect(this.analyser);
        this.fftBuffer = new Uint8Array(this.analyser.frequencyBinCount);
    }

    async enableMic() {
        this.stop();
        await this.startWithMicrophone();
    }

    setTelemetry(payload = {}) {
        this.state.telemetry = { ...this.state.telemetry, ...payload };
    }

    sample() {
        if (!this.analyser || !this.fftBuffer) return;
        this.analyser.getByteFrequencyData(this.fftBuffer);
        const bands = normalizeBandsFromFFT(this.fftBuffer, this.context?.sampleRate || 48000);
        const smoothing = 0.25;
        for (let i = 0; i < this.state.bands.length; i++) {
            this.state.bands[i] = this.state.bands[i] * (1 - smoothing) + bands[i] * smoothing;
        }
        this.state.energy = Math.max(...this.state.bands);
    }

    stop() {
        if (this.sourceCleanup) {
            this.sourceCleanup();
            this.sourceCleanup = null;
        }
        if (this.context) {
            this.context.close();
            this.context = null;
        }
        this.analyser = null;
        this.fftBuffer = null;
    }
}

function createLayerPatterns(state) {
    const lerp = (a, b, t) => a + (b - a) * t;

    return {
        background: (gl, target) => {
            const bass = state.bands[0] || 0;
            const sub = state.bands[1] || 0;
            const tone = lerp(0.02, 0.14, bass);
            gl.clearColor(tone, lerp(0.04, 0.12, sub), lerp(0.08, 0.2, bass), 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        },
        shadow: (gl, target) => {
            gl.enable(gl.SCISSOR_TEST);
            const health = Math.max(0.05, state.telemetry.player_health ?? 0.8);
            const size = target.width * (0.18 + (1 - health) * 0.35);
            gl.scissor((target.width - size) / 2, (target.height - size) / 2, size, size);
            gl.clearColor(0, 0, 0, lerp(0.3, 0.85, 1 - health));
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.disable(gl.SCISSOR_TEST);
        },
        content: (gl, target, time) => {
            const energy = state.energy;
            const w = target.width;
            const h = target.height;
            const cx = w / 2;
            const cy = h / 2;
            const span = Math.max(50, energy * Math.min(w, h) * 0.4 + 90);
            const spin = time * lerp(0.4, 1.6, energy);
            gl.enable(gl.SCISSOR_TEST);
            for (let i = 0; i < 4; i++) {
                const angle = spin + (i * Math.PI * 2) / 4;
                const x = cx + Math.cos(angle) * span * 0.55;
                const y = cy + Math.sin(angle) * span * 0.38;
                gl.scissor(x - span * 0.32, y - span * 0.32, span * 0.64, span * 0.64);
                gl.clearColor(lerp(0.08, 0.3, state.bands[2] || 0), lerp(0.15, 0.45, state.bands[3] || 0), lerp(0.28, 0.65, state.bands[4] || 0), 0.9);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            gl.disable(gl.SCISSOR_TEST);
        },
        highlight: (gl, target, time) => {
            gl.enable(gl.SCISSOR_TEST);
            const stripeWidth = Math.max(6, target.width * 0.018);
            const streakSpeed = lerp(20, 120, state.bands[5] || 0);
            const offset = ((time * streakSpeed) % (stripeWidth * 4)) - stripeWidth * 2;
            for (let x = -stripeWidth * 2; x < target.width + stripeWidth * 2; x += stripeWidth * 4) {
                gl.scissor(x + offset, 0, stripeWidth, target.height);
                gl.clearColor(0.7, 0.95, 1.0, lerp(0.25, 0.6, state.bands[6] || 0));
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            gl.disable(gl.SCISSOR_TEST);
        },
        accent: (gl, target, time) => {
            gl.enable(gl.SCISSOR_TEST);
            const combo = Math.min(1, (state.telemetry.combo_multiplier ?? 0) / 4);
            const sparkleCount = 4 + Math.round(combo * 6);
            const w = target.width;
            const h = target.height;
            for (let i = 0; i < sparkleCount; i++) {
                const phase = time * 0.9 + i * 0.37;
                const x = (Math.sin(phase * 1.7) * 0.5 + 0.5) * w;
                const y = (Math.cos(phase * 1.3) * 0.5 + 0.5) * h;
                const size = 8 + Math.sin(phase * 3.1) * 6 + combo * 12;
                gl.scissor(x - size, y - size, size * 2, size * 2);
                gl.clearColor(1.0, 0.4 + 0.3 * combo, 0.8 + 0.1 * combo, 0.35 + 0.35 * combo);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            gl.disable(gl.SCISSOR_TEST);
        }
    };
}

function bootUnifiedDemo() {
    const inputs = new ReactiveInputs();
    const compositor = new VirtualLayerCompositor({ containerId: 'canvasContainer', enableDepth: false });
    compositor.defineLayers(DEFAULT_LAYERS);

    const patterns = createLayerPatterns(inputs.state);

    inputs.start().then(() => {
        compositor.start(patterns, {
            beforeFrame: () => inputs.sample(),
            afterFrame: () => {
                const decay = 0.18;
                compositor.layers.forEach((layer) => {
                    const base = layer.name === 'background' ? 1.0 : 0.75;
                    const impulse = inputs.state.energy * (layer.name === 'accent' ? 1.5 : 1.0);
                    layer.alpha = Math.max(base - decay, Math.min(1.4, base + impulse));
                });
            }
        });
    });

    window.vibUnifiedDemo = {
        compositor,
        inputs,
        stop: () => compositor.stop(),
        start: () => compositor.start(patterns, { beforeFrame: () => inputs.sample() }),
        diagnostics: () => compositor.getDiagnostics(),
        reinitialize: (layers = DEFAULT_LAYERS) => {
            compositor.defineLayers(layers);
            compositor.start(patterns, { beforeFrame: () => inputs.sample() });
            return compositor.getDiagnostics();
        },
        pushTelemetry: (payload) => inputs.setTelemetry(payload)
    };

    console.log('🧪 Phase 2 unified canvas demo ready', compositor.getDiagnostics());
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootUnifiedDemo();
} else {
    document.addEventListener('DOMContentLoaded', bootUnifiedDemo);
}
