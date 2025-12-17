import { VirtualLayerCompositor, DEFAULT_LAYERS } from '../../src/core/VirtualLayerCompositor.js';
import { WireframeRenderer } from '../../src/core/WireframeRenderer.js';
import { BackgroundGradient } from '../../src/core/BackgroundGradient.js';
import { PulseRings } from '../../src/core/PulseRings.js';
import { HighlightStreaks } from '../../src/core/HighlightStreaks.js';
import { ShadowVignette } from '../../src/core/ShadowVignette.js';
import { normalizeBandsFromFFT } from '../../src/utils/audioBands.js';
import { updateBandState, getDefaultBands } from '../../src/utils/bandSmoothing.js';

class ReactiveInputs {
    constructor() {
        this.context = null;
        this.analyser = null;
        this.fftBuffer = null;
        this.sourceCleanup = null;
        this.state = {
            bands: getDefaultBands(),
            energy: 0,
            telemetry: { player_health: 1, combo_multiplier: 0, zone: 'calm' }
        };
        this.smoothing = 0.25;
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
        const { bands: smoothed, energy } = updateBandState(this.state.bands, bands, this.smoothing);
        this.state.bands = smoothed;
        this.state.energy = energy;
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

function createLayerPatterns(state, wireframeRenderer, backgroundGradient, pulseRings, highlightStreaks, shadowVignette) {
    const lerp = (a, b, t) => a + (b - a) * t;

    return {
        background: (gl, target, time) => {
            backgroundGradient.render(target, time, state.bands, state.energy);
        },
        shadow: (gl, target, time) => {
            shadowVignette.render(target, time, state.bands, state.energy, state.telemetry);
        },
        content: (gl, target, time) => {
            if (!wireframeRenderer) return;
            wireframeRenderer.render(target, time, state.bands, state.energy, state.telemetry);
        },
        highlight: (gl, target, time) => {
            highlightStreaks.render(target, time, state.bands, state.energy, state.telemetry);
        },
        accent: (gl, target, time) => {
            pulseRings.render(target, time, state.bands, state.energy, state.telemetry);
        }
    };
}

function bootUnifiedDemo() {
    const inputs = new ReactiveInputs();
    const compositor = new VirtualLayerCompositor({ containerId: 'canvasContainer', enableDepth: true });
    compositor.defineLayers(DEFAULT_LAYERS);

    const wireframeRenderer = new WireframeRenderer(compositor.gl);
    const backgroundGradient = new BackgroundGradient(compositor.gl);
    const pulseRings = new PulseRings(compositor.gl);
    const highlightStreaks = new HighlightStreaks(compositor.gl);
    const shadowVignette = new ShadowVignette(compositor.gl);
    const patterns = createLayerPatterns(
        inputs.state,
        wireframeRenderer,
        backgroundGradient,
        pulseRings,
        highlightStreaks,
        shadowVignette
    );

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

                const zone = inputs.state.telemetry.zone;
                if (zone === 'combat') wireframeRenderer.setGeometry('tesseract');
                if (zone === 'calm') wireframeRenderer.setGeometry('cube');
                const health = inputs.state.telemetry.player_health ?? 1;
                wireframeRenderer.setLineWidth(0.9 + (1 - health) * 1.8);
            }
        });
    });

    window.vibUnifiedDemo = {
        compositor,
        inputs,
        wireframeRenderer,
        stop: () => compositor.stop(),
        start: () => compositor.start(patterns, { beforeFrame: () => inputs.sample() }),
        diagnostics: () => compositor.getDiagnostics(),
        reinitialize: (layers = DEFAULT_LAYERS) => {
            compositor.defineLayers(layers);
            compositor.start(patterns, { beforeFrame: () => inputs.sample() });
            return compositor.getDiagnostics();
        },
        pushTelemetry: (payload) => inputs.setTelemetry(payload),
        setGeometry: (type) => wireframeRenderer.setGeometry(type),
        setLineWidth: (width) => wireframeRenderer.setLineWidth(width)
    };

    console.log('🧪 Phase 2 unified canvas demo ready', compositor.getDiagnostics());
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootUnifiedDemo();
} else {
    document.addEventListener('DOMContentLoaded', bootUnifiedDemo);
}
