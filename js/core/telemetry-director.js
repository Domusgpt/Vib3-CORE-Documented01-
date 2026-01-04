import telemetry from './telemetry.js';
import { clampControlValue, readControlValue, getControlMeta } from './control-utils.js';
import { telemetryControls } from '../../src/product/telemetry/schema.js';

const ease = {
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t)
};

const waveforms = {
  sine: (t) => Math.sin(2 * Math.PI * t),
  triangle: (t) => 1 - 4 * Math.abs(Math.round(t - 0.25) - (t - 0.25)),
  saw: (t) => 2 * (t - Math.floor(t + 0.5)),
  pulse: (t) => (t % 1) < 0.5 ? 1 : -1,
  noise: () => (Math.random() * 2 - 1)
};

const systems = ['faceted', 'quantum', 'holographic', 'polychora'];
const interactions = ['mouse', 'click', 'scroll'];
const audioSensitivities = ['low', 'medium', 'high'];
const audioVisualModes = ['color', 'geometry', 'movement'];

function buildEnv(overrides = {}) {
  const win = overrides.window || (typeof window !== 'undefined' ? window : {});
  const doc = overrides.document || (typeof document !== 'undefined' ? document : null);
  const perf = overrides.performance || win.performance || { now: () => Date.now() };

  return {
    window: win,
    document: doc,
    performance: perf,
    telemetry: overrides.telemetry || telemetry,
    localStorage: overrides.localStorage || win.localStorage,
    requestAnimationFrame:
      overrides.requestAnimationFrame || win.requestAnimationFrame?.bind(win) || ((cb) => setTimeout(() => cb(perf.now()), 16)),
    cancelAnimationFrame: overrides.cancelAnimationFrame || win.cancelAnimationFrame?.bind(win) || ((id) => clearTimeout(id))
  };
}

function setCheckbox(id, checked, env) {
  const el = env.document?.getElementById?.(id);
  if (el) {
    el.checked = !!checked;
    const EventCtor = env.window?.Event || Event;
    el.dispatchEvent(new EventCtor('change', { bubbles: true }));
  }
}

function setControlValue(element, value, env) {
  if (!element) return;
  const EventCtor = env.window?.Event || Event;
  if (element.type === 'checkbox') {
    element.checked = !!value;
    element.dispatchEvent(new EventCtor('change', { bubbles: true }));
  } else {
    element.value = value;
    element.dispatchEvent(new EventCtor('input', { bubbles: true }));
  }
}

function applyControls(controls = {}, env) {
  Object.entries(controls).forEach(([param, value]) => {
    const slider = env.document?.getElementById?.(param);
    if (slider && typeof value !== 'undefined') {
      const clampedValue = typeof value === 'number' ? clampControlValue(param, value, env.document) : value;
      setControlValue(slider, clampedValue, env);
    }
    if (typeof env.window?.updateParameter === 'function' && slider?.type !== 'checkbox') {
      env.window.updateParameter(param, clampControlValue(param, value, env.document));
    }
  });
}

function applyReactivity(reactivity = {}, env) {
  if (typeof env.window?.toggleSystemReactivity !== 'function') return;
  systems.forEach((system) => {
    const config = reactivity[system];
    if (!config) return;
    interactions.forEach((interaction) => {
      if (typeof config[interaction] === 'boolean') {
        const checkboxId = `${system}${interaction.charAt(0).toUpperCase()}${interaction.slice(1)}`;
        setCheckbox(checkboxId, config[interaction], env);
        env.window.toggleSystemReactivity(system, interaction, config[interaction]);
      }
    });
  });
}

function applyAudioModes(audio = {}, env) {
  if (typeof env.window?.toggleAudioReactivity !== 'function') return;
  audioSensitivities.forEach((sensitivity) => {
    const modes = audio[sensitivity];
    if (!modes) return;
    audioVisualModes.forEach((mode) => {
      if (typeof modes[mode] === 'boolean') {
        const checkboxId = `${sensitivity}${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
        setCheckbox(checkboxId, modes[mode], env);
        env.window.toggleAudioReactivity(sensitivity, mode, modes[mode]);
      }
    });
  });
}

function captureControls(env) {
  const controls = {};
  telemetryControls.forEach((param) => {
    const el = env.document?.getElementById?.(param);
    if (!el) return;
    controls[param] = el.type === 'checkbox' ? el.checked : parseFloat(el.value);
  });
  return controls;
}

function captureReactivity(env) {
  const reactivity = {};
  systems.forEach((system) => {
    const config = {};
    interactions.forEach((interaction) => {
      const checkboxId = `${system}${interaction.charAt(0).toUpperCase()}${interaction.slice(1)}`;
      const el = env.document?.getElementById?.(checkboxId);
      if (el) config[interaction] = el.checked;
    });
    if (Object.keys(config).length) reactivity[system] = config;
  });
  return reactivity;
}

function captureAudio(env) {
  const audio = {};
  audioSensitivities.forEach((sensitivity) => {
    const modes = {};
    audioVisualModes.forEach((mode) => {
      const checkboxId = `${sensitivity}${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
      const el = env.document?.getElementById?.(checkboxId);
      if (el) modes[mode] = el.checked;
    });
    if (Object.keys(modes).length) audio[sensitivity] = modes;
  });
  return audio;
}

function activeGeometryIndex(env) {
  const active = env.document?.querySelector?.('.geom-btn.active');
  return active ? Number(active.dataset.index) || 0 : 0;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AutomationRuleEngine {
  constructor(director) {
    this.director = director;
    this.rules = new Map();
    this.cooldowns = new Map();
    this.intervalTimers = new Map();
  }

  defineRule(rule) {
    const id = rule.id || `rule-${Date.now()}`;
    const normalized = {
      ...rule,
      id
    };
    this.rules.set(id, normalized);

    if (rule.when?.everyMs) {
      this.startIntervalRule(id, normalized);
    }

    this.director.env.telemetry.emit('automation-rule-define', {
      context: { automation: { rule: id, source: rule.source || 'script' } }
    });
    return id;
  }

  startIntervalRule(id, rule) {
    this.stopIntervalRule(id);
    const timer = setInterval(() => this.runAction(rule, id), rule.when.everyMs);
    this.intervalTimers.set(id, timer);
  }

  stopIntervalRule(id) {
    if (this.intervalTimers.has(id)) {
      clearInterval(this.intervalTimers.get(id));
      this.intervalTimers.delete(id);
    }
  }

  clearRules() {
    this.rules.clear();
    Array.from(this.intervalTimers.keys()).forEach((id) => this.stopIntervalRule(id));
    this.director.env.telemetry.emit('automation-rule-clear', { context: { automation: { rule: 'all' } } });
  }

  matches(when, event) {
    if (!when) return false;
    if (when.event && when.event !== event.event) return false;
    if (when.system && event.context?.system && when.system !== event.context.system) return false;
    if (when.geometry && typeof event.context?.geometry !== 'undefined' && when.geometry !== event.context.geometry) return false;

    if (when.control) {
      const value = event.context?.controls?.[when.control];
      if (typeof value === 'undefined') return false;
      if (typeof when.gt === 'number' && !(value > when.gt)) return false;
      if (typeof when.gte === 'number' && !(value >= when.gte)) return false;
      if (typeof when.lt === 'number' && !(value < when.lt)) return false;
      if (typeof when.lte === 'number' && !(value <= when.lte)) return false;
    }

    return true;
  }

  async runAction(rule, id) {
    if (rule.cooldownMs) {
      const last = this.cooldowns.get(id);
      if (last && Date.now() - last < rule.cooldownMs) return;
      this.cooldowns.set(id, Date.now());
    }

    const { action = {} } = rule;
    if (action.type === 'apply' && action.state) {
      await this.director.applyState(action.state, {
        fromState: action.fromState,
        sweep: action.sweep
      });
    } else if (action.type === 'sweep' && action.state && action.targetState) {
      const from = this.director.states.get(action.state);
      const to = this.director.states.get(action.targetState);
      if (from && to) {
        await this.director.runSweep(from, to, {
          fromState: action.state,
          targetState: action.targetState,
          durationMs: action.durationMs,
          easing: action.easing
        });
      }
    } else if (action.type === 'sequence' && action.sequence) {
      await this.director.runSequence(action.sequence);
    } else if (action.type === 'modulate' && action.control) {
      this.director.defineModulator(action);
    } else if (action.type === 'stop-modulator') {
      this.director.stopModulator(action.modulator);
    }

    this.director.env.telemetry.emit('automation-rule-run', {
      context: {
        automation: {
          rule: id,
          action: action.type,
          state: action.state,
          targetState: action.targetState,
          sequence: action.sequence
        }
      }
    });
  }

  async handleEvent(event) {
    for (const [id, rule] of this.rules.entries()) {
      if (this.matches(rule.when, event)) {
        await this.runAction(rule, id);
      }
    }
  }
}

export class TelemetryAutomationDirector {
  constructor(env = {}) {
    this.env = buildEnv(env);
    this.states = new Map();
    this.namedSequences = new Map();
    this.statePacks = new Map();
    this.ruleEngine = new AutomationRuleEngine(this);
    this.modulators = new Map();
    this.modulatorFrame = null;
    this.activeSequence = null;
    this.commandUnsub = this.env.telemetry?.onEvent
      ? this.env.telemetry.onEvent((event) => {
          this.handleTelemetryCommand(event);
          this.ruleEngine.handleEvent(event);
        })
      : () => {};

    if (this.env.window?.addEventListener) {
      this.env.window.addEventListener('storage', (event) => {
        if (event.key === 'vib3-automation-command' && event.newValue) {
          try {
            const command = JSON.parse(event.newValue);
            this.handleTelemetryCommand({ event: 'automation-command', context: { automation: command } });
          } catch (error) {
            console.warn('⚠️ automation command parse failed', error.message);
          }
        }
      });
    }
  }

  snapshot(name) {
    const state = {
      system: this.env.window?.currentSystem || 'faceted',
      geometry: activeGeometryIndex(this.env),
      controls: captureControls(this.env),
      reactivity: captureReactivity(this.env),
      audio: captureAudio(this.env)
    };
    this.states.set(name, state);
    this.env.telemetry.emit('automation-state-snapshot', {
      context: {
        system: state.system,
        geometry: state.geometry,
        automation: { state: name }
      }
    });
    return state;
  }

  defineState(name, state) {
    this.states.set(name, state);
    this.env.telemetry.emit('automation-state-define', {
      context: {
        system: state.system,
        geometry: state.geometry,
        automation: { state: name, rule: state.rule }
      }
    });
  }

  async applyState(name, options = {}) {
    const target = this.states.get(name);
    if (!target) throw new Error(`State ${name} not found`);

    const fromState = options.fromState ? this.states.get(options.fromState) : null;
    if (options.sweep && fromState) {
      return this.runSweep(fromState, target, { ...options.sweep, targetState: name });
    }

    if (
      target.system &&
      target.system !== this.env.window?.currentSystem &&
      typeof this.env.window?.switchSystem === 'function'
    ) {
      this.env.window.switchSystem(target.system);
      await delay(50);
    }

    if (typeof target.geometry === 'number' && typeof this.env.window?.selectGeometry === 'function') {
      this.env.window.selectGeometry(target.geometry);
    }

    applyControls(target.controls, this.env);
    applyReactivity(target.reactivity, this.env);
    applyAudioModes(target.audio, this.env);

    this.env.telemetry.emit('automation-state-apply', {
      context: {
        system: target.system,
        geometry: target.geometry,
        controls: target.controls,
        reactivity: target.reactivity,
        automation: { state: name }
      }
    });
  }

  defineModulator(options = {}) {
    if (!options.control) return null;
    const id = options.id || `mod-${Date.now()}`;
    const meta = getControlMeta(options.control, this.env.document);
    const baseline =
      typeof options.center === 'number'
        ? options.center
        : options.anchorState && this.states.get(options.anchorState)
          ? this.states.get(options.anchorState).controls?.[options.control]
          : readControlValue(options.control, this.env.document);

    const modulator = {
      id,
      control: options.control,
      waveform: options.waveform || 'sine',
      amplitude: typeof options.amplitude === 'number' ? options.amplitude : 0.25,
      center:
        typeof baseline === 'number'
          ? clampControlValue(options.control, baseline, this.env.document, { min: meta?.min, max: meta?.max })
          : 0,
      periodMs: typeof options.periodMs === 'number' ? options.periodMs : 4000,
      clampMin: typeof options.clampMin === 'number' ? options.clampMin : meta?.min,
      clampMax: typeof options.clampMax === 'number' ? options.clampMax : meta?.max,
      startedAt: this.env.performance.now()
    };

    this.modulators.set(id, modulator);
    this.startModulatorLoop();

    this.env.telemetry.emit('automation-modulator-start', {
      context: {
        system: this.env.window?.currentSystem,
        automation: {
          modulator: id,
          control: modulator.control,
          waveform: modulator.waveform,
          periodMs: modulator.periodMs,
          amplitude: modulator.amplitude,
          center: modulator.center
        }
      }
    });

    return id;
  }

  startModulatorLoop() {
    if (this.modulatorFrame) return;
    const tick = (now) => {
      if (!this.modulators.size) {
        this.modulatorFrame = null;
        return;
      }

      this.modulators.forEach((modulator, id) => {
        const waveFn = waveforms[modulator.waveform] || waveforms.sine;
        const phase = ((now - modulator.startedAt) % modulator.periodMs) / modulator.periodMs;
        const signal = waveFn(phase);
        const value = clampControlValue(modulator.control, modulator.center + signal * modulator.amplitude, this.env.document, {
          min: modulator.clampMin,
          max: modulator.clampMax
        });

        applyControls({ [modulator.control]: value }, this.env);

        this.env.telemetry.emit('automation-modulator-step', {
          context: {
            system: this.env.window?.currentSystem,
            controls: { [modulator.control]: value },
            automation: {
              modulator: id,
              control: modulator.control,
              waveform: modulator.waveform,
              periodMs: modulator.periodMs,
              amplitude: modulator.amplitude,
              center: modulator.center,
              progress: Number(phase.toFixed(3))
            }
          }
        });
      });

      this.modulatorFrame = this.env.requestAnimationFrame(tick);
    };

    this.modulatorFrame = this.env.requestAnimationFrame(tick);
  }

  stopModulator(id) {
    if (id) {
      this.modulators.delete(id);
      this.env.telemetry.emit('automation-modulator-stop', { context: { automation: { modulator: id } } });
    } else {
      this.modulators.clear();
      this.env.telemetry.emit('automation-modulator-stop', { context: { automation: { modulator: 'all' } } });
    }

    if (!this.modulators.size && this.modulatorFrame) {
      this.env.cancelAnimationFrame(this.modulatorFrame);
      this.modulatorFrame = null;
    }
  }

  async runSweep(fromState, toState, options = {}) {
    const duration = options.durationMs || 3000;
    const easing = ease[options.easing] || ease.smooth;
    const startTime = this.env.performance.now();
    const startControls = fromState.controls || {};
    const endControls = toState.controls || {};

    this.env.telemetry.emit('automation-sweep-start', {
      context: {
        system: toState.system || this.env.window?.currentSystem,
        geometry: toState.geometry,
        controls: endControls,
        automation: {
          state: options.fromState || options.state,
          targetState: options.targetState,
          easing: options.easing || 'smooth',
          durationMs: duration
        }
      }
    });

    const step = (now) => {
      const rawT = Math.min(1, (now - startTime) / duration);
      const t = easing(rawT);
      const interpolated = {};

      Object.keys({ ...startControls, ...endControls }).forEach((key) => {
        const start = typeof startControls[key] === 'number' ? startControls[key] : endControls[key];
        const end = typeof endControls[key] === 'number' ? endControls[key] : startControls[key];
        if (typeof start === 'number' && typeof end === 'number') {
          interpolated[key] = clampControlValue(key, start + (end - start) * t);
        } else {
          interpolated[key] = rawT < 0.5 ? start : end;
        }
      });

      applyControls(interpolated, this.env);
      this.env.telemetry.emit('automation-sweep-step', {
        context: {
          system: toState.system || this.env.window?.currentSystem,
          geometry: toState.geometry,
          controls: interpolated,
          automation: {
            state: options.fromState,
            targetState: options.targetState,
            easing: options.easing || 'smooth',
            durationMs: duration,
            progress: Number(rawT.toFixed(3))
          }
        }
      });

      if (rawT < 1) {
        this.env.requestAnimationFrame(step);
      } else {
        applyReactivity(toState.reactivity, this.env);
        applyAudioModes(toState.audio, this.env);
        this.env.telemetry.emit('automation-sweep-complete', {
          context: {
            system: toState.system || this.env.window?.currentSystem,
            geometry: toState.geometry,
            controls: toState.controls,
            reactivity: toState.reactivity,
            automation: {
              state: options.fromState,
              targetState: options.targetState,
              easing: options.easing || 'smooth',
              durationMs: duration
            }
          }
        });
      }
    };

    this.env.requestAnimationFrame(step);
  }

  async runSequence(sequenceName, steps = []) {
    const resolvedSteps = steps?.length ? steps : this.namedSequences.get(sequenceName) || [];
    if (!resolvedSteps.length) {
      console.warn(`⚠️ sequence '${sequenceName}' is empty or undefined`);
      return;
    }

    this.activeSequence = { name: sequenceName, cancelled: false };
    this.env.telemetry.emit('automation-sequence-start', {
      context: { automation: { sequence: sequenceName } }
    });

    for (let i = 0; i < resolvedSteps.length; i++) {
      if (this.activeSequence.cancelled) break;
      const stepDef = resolvedSteps[i];
      const fromState = i === 0 ? stepDef.fromState : resolvedSteps[i - 1].state;
      await this.applyState(stepDef.state, {
        fromState,
        sweep: stepDef.sweep
      });
      if (stepDef.holdMs) {
        await delay(stepDef.holdMs);
      }
    }

    this.env.telemetry.emit('automation-sequence-complete', {
      context: { automation: { sequence: sequenceName, loop: false } }
    });
    this.activeSequence = null;
  }

  cancelSequence() {
    if (this.activeSequence) {
      this.activeSequence.cancelled = true;
      this.env.telemetry.emit('automation-sequence-cancel', {
        context: { automation: { sequence: this.activeSequence.name } }
      });
      this.activeSequence = null;
    }
  }

  defineSequence(name, steps) {
    if (!Array.isArray(steps)) return;
    this.namedSequences.set(name, steps);
    this.env.telemetry.emit('automation-sequence-define', { context: { automation: { sequence: name } } });
  }

  registerPack(name, pack = {}) {
    const states = pack.states || {};
    const sequences = pack.sequences || {};
    const rules = pack.rules || [];

    Object.entries(states).forEach(([stateName, state]) => this.defineState(`${name}:${stateName}`, state));
    Object.entries(sequences).forEach(([sequenceName, steps]) => this.defineSequence(`${name}:${sequenceName}`, steps));
    rules.forEach((rule) => this.ruleEngine.defineRule({ ...rule, id: rule.id || `${name}:${rule.when?.event || 'rule'}` }));

    this.statePacks.set(name, pack);
    try {
      this.env.localStorage?.setItem?.(`vib3-pack-${name}`, JSON.stringify(pack));
    } catch (error) {
      console.warn('⚠️ unable to persist pack to localStorage', error);
    }

    this.env.telemetry.emit('automation-pack-register', {
      context: {
        automation: {
          pack: name,
          states: Object.keys(states).length,
          sequences: Object.keys(sequences).length,
          rules: rules.length
        }
      }
    });
  }

  loadPack(name) {
    const stored = this.statePacks.get(name) || this.readPackFromStorage(name);
    if (stored) {
      this.registerPack(name, stored);
    } else {
      console.warn(`⚠️ pack '${name}' not found`);
    }
  }

  exportPack(name) {
    const states = Object.fromEntries(
      Array.from(this.states.entries())
        .filter(([key]) => key.startsWith(`${name}:`))
        .map(([key, value]) => [key.replace(`${name}:`, ''), value])
    );

    const sequences = Object.fromEntries(
      Array.from(this.namedSequences.entries())
        .filter(([key]) => key.startsWith(`${name}:`))
        .map(([key, value]) => [key.replace(`${name}:`, ''), value])
    );

    const rules = Array.from(this.ruleEngine.rules.values()).filter((rule) => rule.id?.startsWith(`${name}:`));

    return { states, sequences, rules };
  }

  readPackFromStorage(name) {
    try {
      const raw = this.env.localStorage?.getItem?.(`vib3-pack-${name}`);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('⚠️ unable to load pack from localStorage', error);
      return null;
    }
  }

  lintPack(pack = {}, options = {}) {
    const report = {
      errors: [],
      warnings: [],
      stats: {
        states: 0,
        sequences: 0,
        rules: 0,
        controls: { covered: [], missing: [] }
      }
    };

    const knownControls = new Set(telemetryControls);
    const coverage = new Set();
    const states = pack.states || {};
    const sequences = pack.sequences || {};
    const rules = pack.rules || [];
    const controlMeta = options.controlMeta || {};

    const metaForControl = (control) => controlMeta[control] || getControlMeta(control, this.env.document);

    Object.entries(states).forEach(([name, state]) => {
      report.stats.states++;
      if (!state || typeof state !== 'object') {
        report.errors.push(`State '${name}' is not an object`);
        return;
      }

      const controls = state.controls || {};
      const controlKeys = Object.keys(controls);
      if (!controlKeys.length) {
        report.warnings.push(`State '${name}' has no controls defined`);
      }

      controlKeys.forEach((control) => {
        const value = controls[control];
        coverage.add(control);
        if (!knownControls.has(control)) {
          report.warnings.push(`State '${name}' references unknown control '${control}'`);
        }

        const meta = metaForControl(control);
        if (meta && typeof value === 'number') {
          if (typeof meta.min === 'number' && value < meta.min) {
            report.errors.push(`State '${name}' control '${control}' is below min (${value} < ${meta.min})`);
          }
          if (typeof meta.max === 'number' && value > meta.max) {
            report.errors.push(`State '${name}' control '${control}' is above max (${value} > ${meta.max})`);
          }
          if (typeof meta.step === 'number') {
            const base = typeof meta.min === 'number' ? meta.min : 0;
            const rounded = base + Math.round((value - base) / meta.step) * meta.step;
            if (Math.abs(rounded - value) > 1e-6) {
              report.warnings.push(
                `State '${name}' control '${control}' is off-step (${value}); suggested ${rounded}`
              );
            }
          }
        }
      });
    });

    const stateNames = new Set(Object.keys(states));
    Object.entries(sequences).forEach(([name, steps]) => {
      report.stats.sequences++;
      if (!Array.isArray(steps) || !steps.length) {
        report.errors.push(`Sequence '${name}' is empty`);
        return;
      }

      steps.forEach((step, idx) => {
        if (!stateNames.has(step.state)) {
          report.errors.push(`Sequence '${name}' step ${idx} references missing state '${step.state}'`);
        }
        if (step.fromState && !stateNames.has(step.fromState)) {
          report.warnings.push(`Sequence '${name}' step ${idx} references missing fromState '${step.fromState}'`);
        }
      });
    });

    rules.forEach((rule, idx) => {
      report.stats.rules++;
      const action = rule?.action || {};
      if (!rule?.when) {
        report.warnings.push(`Rule ${rule.id || idx} is missing a 'when' clause`);
      }
      if (!action.type) {
        report.errors.push(`Rule ${rule.id || idx} is missing an action type`);
      }
      if (action.state && !stateNames.has(action.state)) {
        report.errors.push(`Rule ${rule.id || idx} references unknown state '${action.state}'`);
      }
      if (action.targetState && !stateNames.has(action.targetState)) {
        report.errors.push(`Rule ${rule.id || idx} references unknown targetState '${action.targetState}'`);
      }
      if (action.sequence && !sequences[action.sequence]) {
        report.errors.push(`Rule ${rule.id || idx} references unknown sequence '${action.sequence}'`);
      }
    });

    report.stats.controls.covered = Array.from(coverage);
    report.stats.controls.missing = Array.from(knownControls).filter((control) => !coverage.has(control));

    if (report.stats.controls.missing.length) {
      report.warnings.push(`Missing controls in pack: ${report.stats.controls.missing.join(', ')}`);
    }

    this.env.telemetry.emit('automation-pack-lint', {
      context: { automation: { pack: options.packName || 'ad-hoc', errors: report.errors.length, warnings: report.warnings.length } }
    });

    return report;
  }

  analyzePack(pack = {}, options = {}) {
    const lint = this.lintPack(pack, options);
    const sequences = pack.sequences || {};
    const rules = pack.rules || [];
    const analysis = {
      lint,
      stats: {
        ...lint.stats,
        steps: 0,
        estimatedDurationMs: 0,
        modulators: 0,
        triggers: 0
      },
      sequences: []
    };

    Object.entries(sequences).forEach(([name, steps]) => {
      let sequenceDuration = 0;
      const normalizedSteps = Array.isArray(steps) ? steps : [];
      normalizedSteps.forEach((step) => {
        const sweepDuration = step.sweep?.durationMs || step.durationMs || 0;
        const holdDuration = step.holdMs || 0;
        sequenceDuration += sweepDuration + holdDuration;
        if (step.modulate) analysis.stats.modulators++;
      });

      analysis.stats.steps += normalizedSteps.length;
      analysis.stats.estimatedDurationMs += sequenceDuration;
      analysis.sequences.push({ name, steps: normalizedSteps.length, estimatedDurationMs: sequenceDuration });
    });

    rules.forEach((rule) => {
      if (rule?.when) analysis.stats.triggers++;
      if (rule?.action?.type === 'modulate') analysis.stats.modulators++;
    });

    return analysis;
  }

  handleTelemetryCommand(event) {
    if (event.event !== 'automation-command') return;
    const automation = event.context?.automation || {};
    const action = automation.action;

    if (action === 'snapshot' && automation.state) {
      this.snapshot(automation.state);
    } else if (action === 'apply-state' && automation.state) {
      this.applyState(automation.state, {
        fromState: automation.fromState,
        sweep: automation.durationMs
          ? { durationMs: automation.durationMs, easing: automation.easing }
          : undefined
      });
    } else if (action === 'sweep' && automation.state && automation.targetState) {
      const from = this.states.get(automation.state);
      const to = this.states.get(automation.targetState);
      if (from && to) {
        this.runSweep(from, to, {
          fromState: automation.state,
          targetState: automation.targetState,
          durationMs: automation.durationMs,
          easing: automation.easing
        });
      }
    } else if (action === 'sequence' && Array.isArray(automation.steps)) {
      this.runSequence(automation.sequence || 'ad-hoc', automation.steps);
    } else if (action === 'define-sequence' && Array.isArray(automation.steps)) {
      this.defineSequence(automation.sequence || `sequence-${Date.now()}`, automation.steps);
    } else if (action === 'define-rule' && automation.rule) {
      this.ruleEngine.defineRule(automation.rule);
    } else if (action === 'clear-rules') {
      this.ruleEngine.clearRules();
    } else if (action === 'register-pack' && automation.pack && automation.definition) {
      this.registerPack(automation.pack, automation.definition);
    } else if (action === 'load-pack' && automation.pack) {
      this.loadPack(automation.pack);
    } else if (action === 'modulate' && automation.control) {
      this.defineModulator(automation);
    } else if (action === 'stop-modulator') {
      this.stopModulator(automation.modulator);
    } else if (action === 'clear-modulators') {
      this.stopModulator();
    }
  }
}

const director = new TelemetryAutomationDirector();

if (typeof window !== 'undefined') {
  window.telemetryDirector = director;
  window.captureAutomationState = (name) => director.snapshot(name);
  window.applyAutomationState = (name, options) => director.applyState(name, options);
  window.runAutomationSequence = (name, steps) => director.runSequence(name, steps);
  window.defineAutomationSequence = (name, steps) => director.defineSequence(name, steps);
  window.defineAutomationRule = (rule) => director.ruleEngine.defineRule(rule);
  window.clearAutomationRules = () => director.ruleEngine.clearRules();
  window.registerAutomationPack = (name, pack) => director.registerPack(name, pack);
  window.loadAutomationPack = (name) => director.loadPack(name);
  window.exportAutomationPack = (name) => director.exportPack(name);
  window.lintAutomationPack = (pack, options) => director.lintPack(pack, options);
  window.analyzeAutomationPack = (pack, options) => director.analyzePack(pack, options);
  window.startAutomationModulator = (options) => director.defineModulator(options);
  window.stopAutomationModulator = (id) => director.stopModulator(id);
}

export default director;
