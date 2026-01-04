# Telemetry Automation & State Sweeps

The telemetry director bridges UI controls with automation-friendly state management so agents can define reusable states, sweep between them with easing, and author rule-based sequences that exceed the stock engine panel. It exposes a programmable surface on top of the existing telemetry bus.

## Quick start
- Snapshot the live UI (all sliders, reactivity toggles, audio cells, geometry):
  ```js
  captureAutomationState('calm-grid');
  ```
- Apply a saved state immediately (auto-switches system/geometry):
  ```js
  applyAutomationState('calm-grid');
  ```
- Sweep from one state into another over 4s with smooth easing:
  ```js
  applyAutomationState('neon-burst', { fromState: 'calm-grid', sweep: { durationMs: 4000, easing: 'smooth' } });
  ```
- Run a multi-step sequence with holds:
  ```js
  runAutomationSequence('tour', [
    { state: 'calm-grid', holdMs: 800 },
    { state: 'pulse', sweep: { durationMs: 1800 } },
    { state: 'neon-burst', sweep: { durationMs: 2200 }, holdMs: 1000 }
  ]);
  ```

## State payload
Each state stores:
- `system` and `geometry` (auto-applied via `switchSystem`/`selectGeometry`).
- **Controls**: every slider from `telemetryControls` (rotations, grid/morph/chaos/speed, color sliders, audio gain) plus reactivity/audio checkboxes.
- **Reactivity grid**: per-system mouse/click/scroll toggles mapped through `toggleSystemReactivity`.
- **Audio reactivity**: low/medium/high × color/geometry/movement checkboxes, wired to `toggleAudioReactivity`.

## Command ingress (agent-friendly)
Automation can be driven via telemetry events or `localStorage`:
- Emit a telemetry event with `event: "automation-command"` and a context payload:
  ```js
  window.telemetry.emit('automation-command', {
    context: {
      automation: {
        action: 'sweep',
        state: 'calm-grid',
        targetState: 'neon-burst',
        durationMs: 2500,
        easing: 'smooth'
      }
    }
  });
  ```
- Drop a JSON command into `localStorage.setItem('vib3-automation-command', '{"action":"apply-state","state":"pulse"}')` to trigger from outside the frame (storage listener picks it up).

Supported actions: `snapshot`, `apply-state`, `sweep`, and `sequence` (with `steps` array shaped like `runAutomationSequence`).

### New command actions
- `define-sequence` — registers a named sequence for reuse (`sequence` and `steps` required).
- `define-rule` — installs a rule (see below) with `rule` shape `{ when, action, cooldownMs? }`.
- `clear-rules` — removes every installed rule and cancels interval triggers.
- `register-pack` — loads a pack `{ states, sequences?, rules? }` under a `pack` namespace and persists to localStorage.
- `load-pack` — pulls a previously saved pack from localStorage by name.
- `modulate` — starts a time-based modulator `{ control, amplitude, center?, periodMs?, waveform?, clampMin?, clampMax? }`.
- `stop-modulator` / `clear-modulators` — stops one modulator by id or all running modulators.

CLI ergonomics: `pnpm telemetry:automate -- --action modulate --control speed --amplitude 0.35 --center 1.2 --periodMs 2600 --waveform triangle`
emits the same `automation-command` event to start a live modulation from outside the frame.

## Telemetry emitted
Automation actions emit structured events for downstream collection:
- `automation-state-snapshot`, `automation-state-define`, `automation-state-apply`
- `automation-sweep-start` / `automation-sweep-step` / `automation-sweep-complete`
- `automation-sequence-start` / `automation-sequence-complete` / `automation-sequence-cancel`

Each includes `context.automation` describing `state`, `targetState`, `sequence`, `durationMs`, `easing`, and sweep `progress` for step events, enabling replay or audit.

## Style-pack readiness
Because states capture every control and toggle, you can serialize `director.states` to ship multi-state presets inside style packs. Pair a style pack with a short automation sequence to animate transitions as part of asset-pack exports or onboarding demos.

Use the new helpers to package and replay style packs without touching UI sliders:
```js
// Register a pack (namespacing all states/sequences under "packA:")
registerAutomationPack('packA', {
  states: {
    calm: captureAutomationState('temp') // or hand-author a JSON state
  },
  sequences: {
    ramp: [
      { state: 'packA:calm', sweep: { durationMs: 1500 } },
      { state: 'packA:calm', holdMs: 500 }
    ]
  }
});

// Persisted packs can be reloaded later
loadAutomationPack('packA');

// Export the pack for bundling into an asset/style pack
const packJson = exportAutomationPack('packA');
```

### Pack linting & coverage for agents
- Use `window.lintAutomationPack(pack, { packName: 'demo' })` in-browser or `pnpm telemetry:lint-pack -- path/to/automation-pack.json demo` in the CLI to validate that every referenced state/sequence exists, controls stay within slider min/max/step metadata, and coverage spans the shipped UI controls.
- Lint reports emit an `automation-pack-lint` telemetry event so you can harvest validation status in CI pipelines alongside JSONL telemetry checks.
- Missing or off-step controls surface as warnings to keep packs exportable while still guiding agents toward UI-safe presets.
- Need timeline-level insight? `window.analyzeAutomationPack(pack, { packName: 'demo' })` or `pnpm telemetry:analyze-pack -- path/to/automation-pack.json demo` combines lint feedback with estimated sequence durations, modulator counts, and trigger coverage so agents can preflight "tour" experiences and animation sweeps without a live canvas.

### Headless CLI validation loop

Use the CLI to validate automation packs the same way CI and headless harnesses do. The fixtures in `tests/fixtures/` mirror common shapes for green and red paths.

- Analyze a valid pack and see sweep durations, modulator counts, and trigger coverage: `node tools/telemetry/cli.js analyze-pack tests/fixtures/automation-pack-valid.json fixtures-demo`
- Surface lint failures and exit non-zero when references are broken: `node tools/telemetry/cli.js lint-pack tests/fixtures/automation-pack-invalid.json fixtures-bad`

These commands match the assertions in `tests/telemetry-cli.test.js` so agents can trust local and CI runs to report the same signals.

## Rule-driven animation
Rules let agents overdrive the UI by binding telemetry events to automation actions (apply, sweep, or sequence) with cooldowns and interval triggers.

```js
defineAutomationRule({
  id: 'loudness-react',
  when: { event: 'slider-change', control: 'intensity', gt: 70 },
  action: { type: 'sweep', state: 'calm-grid', targetState: 'neon-burst', durationMs: 1800 }
});

// Interval example: run a tour every 30s
defineAutomationRule({
  id: 'tour-loop',
  when: { event: 'automation-ready', everyMs: 30000 },
  action: { type: 'sequence', sequence: 'tour' }
});
```

Paired with telemetry ingestion, rules unlock agent-side “dynamic visual laws” that react to live metrics or orchestration events while persisting to JSON packs for style-pack publishing.

## Continuous modulation (LFO-style sweeps)
Modulators provide agent-controlled, continuous motion across any numeric control (rotations, chaos, color, audio gain, etc.). They stack with sequences and rules for deeper expressiveness.

```js
// Oscillate the speed slider around its current value
const id = startAutomationModulator({ control: 'speed', amplitude: 0.25, periodMs: 2200, waveform: 'sine' });

// Anchor to a stored preset and clamp within safe bounds
startAutomationModulator({
  id: 'chaos-wobble',
  control: 'chaos',
  anchorState: 'calm-grid',
  amplitude: 0.18,
  periodMs: 3400,
  waveform: 'triangle',
  clampMin: 0,
  clampMax: 1
});

// Stop one or all modulators
stopAutomationModulator(id);
stopAutomationModulator();
```

Modulators and sweeps honor each slider's `min`/`max`/`step` attributes, so even aggressive automation or CLI commands stay within UI-safe ranges. Provide tighter `clampMin`/`clampMax` overrides when anchoring to packs to guarantee asset-pack exports reuse consistent bounds.

Events emitted: `automation-modulator-start`, `automation-modulator-step`, and `automation-modulator-stop` with `context.automation`

## Headless testing and agent harnessing

The telemetry director now supports dependency injection so you can run it in headless tests or agent simulators without the browser DOM. Pass a custom `env` with `window`, `document`, `requestAnimationFrame`, and `telemetry` objects to `new TelemetryAutomationDirector(env)` to validate automation logic off-device.

- See `tests/telemetry-director.test.js` for an in-repo example that clamps sweep outputs, runs wave-modulators against injected slider metadata, and records emitted telemetry events while ticking a fake animation clock.
- Use the same pattern inside your agents to author “simulation first” packs: inject a document with mock sliders/toggles, run sweeps or modulators, assert on control clamping, then ship the resulting state packs to the live UI.
fields describing the modulator id, control, waveform, amplitude/center, clamps, and normalized progress.
