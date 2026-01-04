# VIB3+ Engine

The VIB3+ Engine is a browser-based playground for exploring faceted, quantum, holographic, and polychora visualizations with synchronized 6D rotations, color controls, and reactive inputs. This repository contains the production-ready HTML/JS bundle plus the modular engine sources that power the UI.

## Features
- **Multi-system viewer:** Switch between Faceted, Quantum, Holographic, and Polychora renderers from the top navigation bar.
- **6D rotation controls:** Independent sliders for 3D planes (XY/XZ/YZ) and 4D planes (XW/YW/ZW) route to the currently active engine.
- **Visual tuning:** Grid density, morph factor, chaos, animation speed, hue, saturation, and intensity sliders update live.
- **Reactivity matrix:** Per-system toggles for mouse, click, and scroll interactions, plus audio-reactive channel toggles (low/medium/high × color/geometry/movement).
- **Stateful experience:** State capture/restore with URL parameters and localStorage, randomize/reset helpers, and gallery save/load hooks.

## Project layout
- **index.html** – Entry point with the full control panel and script wiring for the four systems.
- **js/** – Browser modules for controls, gallery, audio/reactivity, and performance helpers.
- **src/** – Engine implementations imported by the shell (faceted/quantum/holographic/polychora) plus shared geometry/math utilities.
- **styles/** – CSS bundles for the responsive UI, tabs, and bezel controls.

## Running locally
1. Ensure Node.js 18.19+ is available (the project was authored with pnpm 9.4.0).
2. Install dependencies: `pnpm install`.
3. Start a dev server (Vite): `pnpm dev:web` then open the reported localhost URL. For a static preview you can also open `index.html` directly, but module imports expect the `./js` and `./src` folders to be served.
4. Build for production: `pnpm build:web`.

### Telemetry and CLI quickstart
- Emit a manual event (writes JSONL to `telemetry/logs.jsonl`): `pnpm telemetry:emit -- --event slider-change --system quantum --rot4dXY 0.5`.
- Tail the JSONL sink while interacting with the UI: `pnpm telemetry:tail`.
- Validate a log capture against the shipped schema: `pnpm telemetry:validate telemetry/logs.jsonl`.
- Drive automation from telemetry: `window.telemetry.emit('automation-command', { context: { automation: { action: 'sweep', state: 'calm', targetState: 'burst', durationMs: 2500 } } });`.
- Author reusable packs/rules entirely in the browser: `registerAutomationPack('neon-pack', { states: {...}, sequences: {...}, rules: [...] });` then `loadAutomationPack('neon-pack')` to replay.
- Drive continuous motion via modulators: `startAutomationModulator({ control: 'speed', amplitude: 0.35, center: 1.2, periodMs: 2600, waveform: 'triangle' });` and stop with `stopAutomationModulator()`.
- Send automation/pack/modulator commands from the CLI: `pnpm telemetry:automate -- --action modulate --control intensity --amplitude 0.25 --center 0.5 --periodMs 1800`.
- Lint automation packs for coverage, missing references, and off-step values before publishing to style packs: `pnpm telemetry:lint-pack -- path/to/automation-pack.json my-pack`.
- Preflight automation packs with duration and trigger insights: `pnpm telemetry:analyze-pack -- path/to/automation-pack.json my-pack` or call `analyzeAutomationPack(pack)` in the browser to combine lint feedback with estimated timeline stats.
- Automation sweeps and modulators auto-clamp to each slider's min/max/step so agent commands stay within safe UI bounds.
- Run telemetry/automation logic headlessly for agents or CI: `pnpm test` executes the injected-environment harness in `tests/telemetry-director.test.js` to validate sweeps, modulators, and emissions without a browser.

The UI now emits telemetry for slider changes, gallery saves/loads, trading-card exports, randomize/reset actions, and error paths. The browser client mirrors the JSONL schema and keeps a persistent `sessionId` in `localStorage` for correlation.

## Controls at a glance
Each slider dispatches `updateParameter(param, value)` and updates its paired label:

| Category | Control (id) | Range/Step | Notes |
| --- | --- | --- | --- |
| 3D Rotations | `rot4dXY`, `rot4dXZ`, `rot4dYZ` | -6.28 to 6.28 (0.01) | Euler-plane rotations routed to the active engine. |
| 4D Rotations | `rot4dXW`, `rot4dYW`, `rot4dZW` | -6.28 to 6.28 (0.01) | Hyperspace rotations. |
| Visual | `gridDensity` | 5–100 (1) | Grid resolution. |
|  | `morphFactor` | 0–2 (0.01) | Morph blend factor. |
|  | `chaos` | 0–1 (0.01) | Noise/chaos amount. |
|  | `speed` | 0.1–3 (0.01) | Animation speed. |
| Color | `hue` | 0–360 (1) | Degrees; displays as °. |
|  | `saturation`, `intensity` | 0–1 (0.01) | Color saturation and brightness. |

Complementary toggles include:
- System interaction switches: `facetedMouse`, `facetedClick`, `facetedScroll`, `quantumMouse`, `quantumClick`, `quantumScroll`, `holographicMouse`, `holographicClick`, `holographicScroll`.
- Audio-reactive channels: `low|medium|high` × `Color|Geometry|Movement`.
- Quick actions: Randomize All, Randomize Everything (parameters + geometry/hue), Reset All, Save/Load Gallery, and per-tab quick randomizers.

See [`DOCS/CONTROL_REFERENCE.md`](DOCS/CONTROL_REFERENCE.md) for the full walkthrough of sliders, switches, and the corresponding JavaScript APIs.

## Key runtime APIs
- `updateParameter(param, value)` – Routes slider updates to the active system engine with resilient retries if an engine is still loading.
- `randomizeAll()` / `randomizeEverything()` / `resetAll()` – Bulk parameter helpers used by quick-action buttons.
- State management (`js/core/state-manager.js`): `initializeStateManager()`, `captureCurrentState()`, `restoreState(state)`, URL/localStorage persistence, history/undo, and auto-save setup.
- Geometry and system switching: `switchSystem(systemName)` and `selectGeometry(index)` (defined in the app shell) plus `window.geometries` definitions for each system.

## Additional references
- [`DOCS/CONTROL_REFERENCE.md`](DOCS/CONTROL_REFERENCE.md) – Control IDs, slider ranges, toggle behaviors, and the underlying functions.
- [`DOCS/ASSET_PACK_PLAYBOOK.md`](DOCS/ASSET_PACK_PLAYBOOK.md) – Agentic onboarding and repeatable recipes for exporting cards, gallery saves, and motion captures.
- [`DOCS/TELEMETRY_STATUS.md`](DOCS/TELEMETRY_STATUS.md) – Telemetry/CLI gap analysis with the recommended payload format and command surface to make telemetry usable.
- [`DOCS/TELEMETRY_AUTOMATION.md`](DOCS/TELEMETRY_AUTOMATION.md) – Automation director usage for snapshots, sweeps, sequences, and agent-driven commands across every control/toggle.
- [`TESTING_GUIDE.md`](TESTING_GUIDE.md) – Available testing and verification steps.
- [`UI-OVERHAUL-PLAN.md`](UI-OVERHAUL-PLAN.md) – Design intents and pending UI polish tasks.
