import { describe, expect, it, vi } from 'vitest';

const storageMap = new Map();

const buildLocalStorage = () => ({
  getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
  setItem: (key, value) => storageMap.set(key, value),
  removeItem: (key) => storageMap.delete(key)
});

const setupGlobals = () => {
  const localStorage = buildLocalStorage();
  const baseWindow = {
    Event: class {
      constructor(type, init = {}) {
        this.type = type;
        this.bubbles = init.bubbles;
      }
    },
    navigator: { userAgent: 'test-agent' },
    localStorage,
    addEventListener: vi.fn(),
    crypto: { randomUUID: () => 'session-test' }
  };

  globalThis.window = baseWindow;
  globalThis.document = {
    getElementById: () => null,
    querySelector: () => null,
    addEventListener: vi.fn()
  };
  globalThis.navigator = baseWindow.navigator;
  globalThis.localStorage = localStorage;
};

const createFrameClock = () => {
  let now = 0;
  let queue = [];
  return {
    performance: { now: () => now },
    requestAnimationFrame: (cb) => {
      queue.push(cb);
      return queue.length;
    },
    cancelAnimationFrame: (id) => {
      queue = queue.filter((_, idx) => idx + 1 !== id);
    },
    tick: (ms) => {
      now += ms;
      const toRun = queue;
      queue = [];
      toRun.forEach((cb) => cb(now));
    }
  };
};

const createHarness = async () => {
  await vi.resetModules();
  setupGlobals();
  const frame = createFrameClock();
  const elements = {
    alpha: { id: 'alpha', type: 'range', min: '0', max: '1', step: '0.1', value: '0', dispatchEvent: vi.fn() },
    beta: { id: 'beta', type: 'range', min: '0', max: '2', step: '0.5', value: '0', dispatchEvent: vi.fn() },
    geom: { dataset: { index: '1' } }
  };

  const document = {
    getElementById: (id) => elements[id] || null,
    querySelector: (selector) => (selector === '.geom-btn.active' ? elements.geom : null),
    addEventListener: vi.fn()
  };

  const localStorage = buildLocalStorage();
  const telemetry = {
    events: [],
    emit: (event, payload = {}) => {
      telemetry.events.push({ event, payload });
      return { ok: true };
    },
    onEvent: (fn) => {
      telemetry.listeners = telemetry.listeners || [];
      telemetry.listeners.push(fn);
      return () => {
        telemetry.listeners = telemetry.listeners.filter((listener) => listener !== fn);
      };
    }
  };

  const window = {
    currentSystem: 'faceted',
    selectGeometry: vi.fn(),
    switchSystem: vi.fn(),
    updateParameter: vi.fn(),
    toggleSystemReactivity: vi.fn(),
    toggleAudioReactivity: vi.fn(),
    addEventListener: vi.fn(),
    Event: globalThis.window.Event,
    requestAnimationFrame: frame.requestAnimationFrame,
    cancelAnimationFrame: frame.cancelAnimationFrame,
    performance: frame.performance,
    localStorage
  };

  const module = await import('../js/core/telemetry-director.js');
  const Director = module.TelemetryAutomationDirector;

  return {
    Director,
    telemetry,
    elements,
    frame,
    env: {
      window,
      document,
      telemetry,
      performance: frame.performance,
      requestAnimationFrame: frame.requestAnimationFrame,
      cancelAnimationFrame: frame.cancelAnimationFrame,
      localStorage
    }
  };
};

describe('TelemetryAutomationDirector', () => {
  it('sweeps between states with clamped control values and telemetry', async () => {
    const { Director, env, elements, frame, telemetry } = await createHarness();
    const director = new Director(env);

    const start = { system: 'faceted', geometry: 0, controls: { alpha: 0 } };
    const end = { system: 'faceted', geometry: 1, controls: { alpha: 2 } };

    director.defineState('start', start);
    director.defineState('end', end);

    await director.runSweep(start, end, { targetState: 'end', durationMs: 100, easing: 'linear' });
    frame.tick(50);
    frame.tick(60);

    expect(Number(elements.alpha.value)).toBeCloseTo(1);
    expect(telemetry.events.some((evt) => evt.event === 'automation-sweep-complete')).toBe(true);
  });

  it('modulates controls using anchor state centers within bounds', async () => {
    const { Director, env, elements, frame } = await createHarness();
    const director = new Director(env);

    director.defineState('anchor', { controls: { alpha: 0.6 } });

    const modId = director.defineModulator({
      control: 'alpha',
      anchorState: 'anchor',
      amplitude: 1,
      clampMin: 0,
      clampMax: 1,
      periodMs: 1000,
      waveform: 'sine'
    });

    frame.tick(250);
    expect(Number(elements.alpha.value)).toBeLessThanOrEqual(1);
    expect(Number(elements.alpha.value)).toBeGreaterThanOrEqual(0);

    director.stopModulator(modId);
  });

  it('lints automation packs for coverage and reference integrity', async () => {
    const { Director, env } = await createHarness();
    const director = new Director(env);

    const pack = {
      states: {
        base: { controls: { alpha: 0.3, beta: 1.5 } },
        offBounds: { controls: { alpha: -1 } }
      },
      sequences: {
        demo: [
          { state: 'base', holdMs: 100 },
          { state: 'missing', sweep: { durationMs: 200 } }
        ]
      },
      rules: [
        { id: 'bad-action', when: { event: 'automation-ready' }, action: { type: 'sweep', state: 'missing' } }
      ]
    };

    const report = director.lintPack(pack, { packName: 'spec' });

    expect(report.errors.some((msg) => msg.includes("missing state 'missing'"))).toBe(true);
    expect(report.errors.some((msg) => msg.includes("below min"))).toBe(true);
    expect(report.stats.controls.covered).toContain('alpha');
    expect(report.warnings.some((msg) => msg.includes('Missing controls in pack'))).toBe(true);
  });

  it('analyzes automation packs with timeline stats for agents', async () => {
    const { Director, env } = await createHarness();
    const director = new Director(env);

    const pack = {
      states: {
        base: { controls: { alpha: 0.5 } },
        ramped: { controls: { alpha: 1 } }
      },
      sequences: {
        tour: [
          { state: 'base', holdMs: 200 },
          { state: 'ramped', sweep: { durationMs: 400 } }
        ]
      },
      rules: [{ id: 'trigger-on-ready', when: { event: 'automation-ready' }, action: { type: 'sequence', sequence: 'tour' } }]
    };

    const analysis = director.analyzePack(pack, { packName: 'spec' });

    expect(analysis.stats.states).toBe(2);
    expect(analysis.stats.sequences).toBe(1);
    expect(analysis.stats.rules).toBe(1);
    expect(analysis.stats.steps).toBe(2);
    expect(analysis.stats.estimatedDurationMs).toBe(600);
    expect(analysis.stats.triggers).toBe(1);
    expect(analysis.sequences[0]).toEqual({ name: 'tour', steps: 2, estimatedDurationMs: 600 });
    expect(analysis.lint.errors).toHaveLength(0);
  });
});
