# Control & API Reference

This document walks through every control surface in `index.html` and the JavaScript entry points they call so you can quickly map UI inputs to runtime behavior.

## UI layout overview
- **Top navigation**: System selector buttons (`switchSystem('faceted' | 'quantum' | 'holographic' | 'polychora')`), global Save button (`saveToGallery()`), gallery/audio/device-tilt/LLM/Interactivity toggles, and quick-access toolbar.
- **Canvas containers**: Four stackable `<div class="holographic-layers">` containers: `vib34dLayers`, `quantumLayers`, `holographicLayers`, and `polychoraLayers`.
- **Bottom bezel tabs**: Tab strip for Controls, Color, Geometry, Reactivity, and Export. Each tab exposes its own randomizer button plus quick-access buttons when the bezel is collapsed.

## Slider controls
Each `<input type="range">` updates its paired readout and calls `updateParameter(param, value)` from `js/controls/ui-handlers.js`.

| Category | Control id | Range (step) | Display | Notes |
| --- | --- | --- | --- | --- |
| 3D rotations | `rot4dXY` | -6.28 to 6.28 (0.01) | `rot4dXY-display` | XY plane rotation. |
|  | `rot4dXZ` | -6.28 to 6.28 (0.01) | `rot4dXZ-display` | XZ plane rotation. |
|  | `rot4dYZ` | -6.28 to 6.28 (0.01) | `rot4dYZ-display` | YZ plane rotation. |
| 4D rotations | `rot4dXW` | -6.28 to 6.28 (0.01) | `rot4dXW-display` | XW plane rotation. |
|  | `rot4dYW` | -6.28 to 6.28 (0.01) | `rot4dYW-display` | YW plane rotation. |
|  | `rot4dZW` | -6.28 to 6.28 (0.01) | `rot4dZW-display` | ZW plane rotation. |
| Visual | `gridDensity` | 5 to 100 (1) | `gridDensity-display` | Grid resolution. |
|  | `morphFactor` | 0 to 2 (0.01) | `morphFactor-display` | Morph blend factor. |
|  | `chaos` | 0 to 1 (0.01) | `chaos-display` | Noise/chaos. |
|  | `speed` | 0.1 to 3 (0.01) | `speed-display` | Animation speed. |
| Color | `hue` | 0 to 360 (1) | `hue-display` | Hue in degrees. |
|  | `saturation` | 0 to 1 (0.01) | `saturation-display` | Color saturation. |
|  | `intensity` | 0 to 1 (0.01) | `intensity-display` | Color brightness. |

### Slider handling pipeline
1. The slider's `oninput` calls `updateParameter(param, value)`.
2. `updateParameter` records the value in `window.userParameterState`, updates the readout element, and routes the parameter to the active engine (`faceted`, `quantum`, `holographic`, or `polychora`).
3. Each engine uses its own setter: `parameterManager.setParameter` (faceted), `updateParameter` (quantum/holographic), or `updateParameters` (polychora). When an engine is not ready, the handler retries once before logging a warning.

## Toggle controls
- **System reactivity matrix**: Checkboxes for each system/interaction type (`facetedMouse`, `facetedClick`, `facetedScroll`, `quantumMouse`, `quantumClick`, `quantumScroll`, `holographicMouse`, `holographicClick`, `holographicScroll`) call `toggleSystemReactivity(system, interaction, checked)`.
- **Audio-reactive channels**: Low/Medium/High checkboxes for Color/Geometry/Movement call `toggleAudioReactivity(level, channel, checked)` with `mediumColor` enabled by default.
- **Device tilt**: `toggleDeviceTilt()` toggles gyroscope-driven rotation and updates the tilt button state.
- **Audio master toggle**: `toggleAudio()` toggles the audio engine used by the reactivity matrix.
- **Interactivity menu**: `toggleInteractivity()` exposes the interaction panel and uses `interactivityEnabled` tracking from the UI handlers module.

## Geometry & system selection
- **System selector buttons** call `switchSystem(systemName)` and visually mark the active system via `data-system` attributes.
- **Geometry tab** uses `selectGeometry(index)` to switch among the 24 faceted/quantum options or the six polychora presets. `window.geometries` defines the labels for each system.

## Quick actions and gallery hooks
- **Randomizers**: `randomizeAll()` (parameters only) and `randomizeEverything()` (parameters + geometry + hue) are wired to the Randomize buttons across tabs and quick-access bar.
- **Reset**: `resetAll()` restores all slider defaults and updates readouts.
- **Gallery**: `saveToGallery()`, `openGallery()`, and `quickSave()/quickGallery()` integrate with `js/gallery` modules for persistence.

## State management
- `initializeStateManager()` runs during boot to restore state from URL parameters or `localStorage`, then sets up auto-save and keyboard shortcuts.
- `captureCurrentState()` collects active system/geometry, parameters, UI state (active tab, bezel collapse, performance overlay), performance mode, and reactivity settings.
- `restoreState(state)` replays captured values into the UI and engines after validating the payload.
- Auto-save uses a 2s debounce (`autoSaveDelay`) and keeps a history stack (50 entries) for undo/redo behaviors.

## Data dictionaries
- **`window.geometries`**: Lists 24 faceted and quantum geometry labels (base, hypersphere core, hypertetrahedron core), a single holographic mode, and six polychora polychora solids.
- **`window.userParameterState`**: Captures the most recent slider values for persistence and gallery snapshots.

## Related modules
- `js/controls/ui-handlers.js` – Slider/toggle handlers, randomize/reset helpers, and interactivity toggles.
- `js/core/state-manager.js` – State capture/restore, URL/localStorage integration, and undo/redo history.
- `js/interactions/device-tilt.js` – Gyroscope-driven rotation controls and button state updates.
- `js/audio/audio-engine.js` – Audio reactivity toggles consumed by `toggleAudio` and `toggleAudioReactivity`.
