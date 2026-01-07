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
- [`TESTING_GUIDE.md`](TESTING_GUIDE.md) – Available testing and verification steps.
- [`UI-OVERHAUL-PLAN.md`](UI-OVERHAUL-PLAN.md) – Design intents and pending UI polish tasks.
