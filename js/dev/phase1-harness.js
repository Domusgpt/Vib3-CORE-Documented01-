import { SimpleAudioEngine } from '../audio/audio-engine.js';
import { normalizeBandsFromFFT, psychoBandBreakpoints } from '../../src/utils/audioBands.js';

async function runAudioHarness() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') {
        await context.resume();
    }

    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;

    const oscillator = context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 220;

    const gain = context.createGain();
    gain.gain.value = 0.05;

    oscillator.connect(gain).connect(analyser);
    analyser.connect(context.destination);
    oscillator.start();

    await new Promise((resolve) => setTimeout(resolve, 120));

    const fft = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fft);
    const bands = normalizeBandsFromFFT(fft, context.sampleRate);

    oscillator.stop();
    oscillator.disconnect();
    gain.disconnect();
    analyser.disconnect();

    return {
        bands,
        sampleRate: context.sampleRate,
        fftSize: analyser.fftSize,
    };
}

function runWebGLSmokeProbe() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;

    const gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: false });
    if (!gl) {
        return { ok: false, reason: 'WebGL2 unavailable' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);

    return {
        ok: true,
        contextLost: gl.isContextLost(),
        renderer,
        extensions: gl.getSupportedExtensions(),
        framebufferStatus: status === gl.FRAMEBUFFER_COMPLETE ? 'complete' : status,
    };
}

function startTelemetryReplay(onMessage, intervalMs = 500) {
    const fixture = [
        { player_health: 0.72, combo_multiplier: 1.3, zone: 'calm' },
        { player_health: 0.63, combo_multiplier: 2.1, zone: 'combat' },
        { player_health: 0.51, combo_multiplier: 3.0, zone: 'combat' },
        { player_health: 0.85, combo_multiplier: 0.8, zone: 'recover' },
    ];

    let index = 0;
    const timer = setInterval(() => {
        onMessage?.(fixture[index]);
        index = (index + 1) % fixture.length;
    }, intervalMs);

    return () => clearInterval(timer);
}

function attachHarnessToWindow() {
    if (window.vibPhase1Harness) return;

    window.vibPhase1Harness = {
        runWebGLSmokeProbe,
        runAudioHarness,
        normalizeBandsFromFFT,
        startTelemetryReplay,
        startMicIfNeeded: async () => {
            if (!window.audioEngine) {
                window.audioEngine = new SimpleAudioEngine();
            }
            return window.audioEngine.init();
        },
    };
}

attachHarnessToWindow();

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('🧪 Phase 1 harness: GL probe', runWebGLSmokeProbe());
} else {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🧪 Phase 1 harness: GL probe', runWebGLSmokeProbe());
    });
}

export { normalizeBandsFromFFT, psychoBandBreakpoints };
