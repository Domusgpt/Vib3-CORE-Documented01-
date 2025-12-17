# VIB3+ Engine

VIB3+ Engine is a WebGL-based visualization tool that combines 5-layer holographic rendering with 4D polytopal mathematics and 100 geometric variations. It provides a highly customizable and interactive experience for generating complex and beautiful geometric patterns.

## Features

*   **5-Layer Holographic Rendering:** Creates a sense of depth and complexity.
*   **4D Polytopal Mathematics:** Explores geometries beyond our three-dimensional world.
*   **100 Geometric Variations:** A vast library of shapes and patterns to explore.
*   **Interactive Controls:** Manipulate the visualizations in real-time.
*   **Audio Reactivity:** Visualizations can react to audio input.
*   **Export Options:** Save your creations as JSON, CSS, HTML, or PNG.

## Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/VIB3-PLUS/VIB3-Engine.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd VIB3-Engine
    ```
3.  Open `index.html` in your web browser.

### Development commands (Phase 1 baseline)

- **Run dev server / smoke:** `npm run dev` (or `npm start`) and load `index.html`; confirm a single WebGL2 context renders a background plus placeholder geometry.
- **Static harness server (for screenshots/browser tool):** `npm run dev:static` starts a lightweight `python -m http.server 8000` from repo root so remote/browser tooling can reach the unified canvas demo without 404s; pair with port-forward `8000` when capturing screenshots.
- **Lint:** `npm run lint` (log if script missing during planning).
- **Tests:** `npm test` (or `npm run test`) to identify existing coverage and gaps; failures are noted for follow-up.
- **WebSocket mock fixture:** `npx ws -p 12345` to feed dummy telemetry into the InputBridge during manual checks.
- **Visual artifacts:** save baseline screenshots to `artifacts/baselines/p1/` for regression tracking.
- **Phase 1 harness:** in the browser console call `vibPhase1Harness.runWebGLSmokeProbe()` for GL capability, `vibPhase1Harness.runAudioHarness()` for the 7-band FFT sample, and `vibPhase1Harness.startTelemetryReplay(console.log)` to stream fixture payloads.
- **Phase 2 unified canvas demo:** load the page and check `window.vibUnifiedDemo.diagnostics()` for layer/FBO stats; use `window.vibUnifiedDemo.reinitialize()` to rebuild the five-layer stack and `window.vibUnifiedDemo.stop()` / `.start()` to pause or resume the virtual-layer compositing loop. The content layer now renders a live WebGL2 wireframe cube driven by audio band energy instead of the placeholder scissor blocks.
- **Reactive background + accent rings:** the demo now includes a GLSL-powered gradient background that breathes with bass/tone bands and a pulse-ring accent layer tied to combo multiplier telemetry. Use the floating 🧪 overlay to tweak telemetry or call `window.vibUnifiedDemo.pushTelemetry({ combo_multiplier: 3 })` to see accent density swell.
- **Highlight streak shaders:** the highlight layer now renders WebGL2 streaks driven by upper-band energy and telemetry zones (calm/combat/recover). Push telemetry or crank highs to watch the shimmering rim lighting sweep across the scene instead of the old scissor stripes.
- **Phase 2 reactive layers:** the unified compositor now reacts to live audio (mic if permitted, oscillator fallback) and telemetry; call `vibUnifiedDemo.inputs.enableMic()` from the console to request microphone access and `vibUnifiedDemo.pushTelemetry({ player_health: 0.42, combo_multiplier: 3 })` to modulate the shadow/accents without music. The shadow layer now uses a shader-driven vignette instead of scissor clears for smoother grounding tied to bass/health.
- **Unified debug panel:** open the floating "🧪 Unified Canvas Debug" widget (bottom-right) to start/stop the compositor, request mic input, push telemetry with sliders, and monitor energy/FPS/dimensions without leaving the page or console.
- **Wireframe geometry controls:** from the debug panel, switch between cube/tesseract wireframes and adjust line width; telemetry zone "combat" auto-selects tesseract while low health thickens the edges for clearer visual feedback.
- **Band normalization tests:** run `npm test` to validate psychoacoustic band aggregation via `normalizeBandsFromFFT`; this locks the 7-band mapping for future audio-reactive work.

## Usage

The user interface is divided into several panels:

*   **Controls:** Adjust parameters like rotation, density, chaos, and speed.
*   **Geometry:** Select from a wide range of geometric variations.
*   **Variations:** Browse and apply different pre-configured variations.
*   **Gallery:** View and manage your saved creations.
*   **Export:** Export your creations in various formats.

### Keyboard Shortcuts

*   **Ctrl+Z:** Undo
*   **Ctrl+Y or Ctrl+Shift+Z:** Redo
*   **Ctrl+L:** Copy share link
*   **i:** Toggle interactivity

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.
