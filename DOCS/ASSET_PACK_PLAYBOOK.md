# Agentic Asset Pack Playbook

This guide teaches agents how to spin up the VIB3+ playground, drive it programmatically, and export consistent asset packs (HTML cards, gallery saves, and screenshots) for web design or other digital use.

## Environment quickstart
1. Install dependencies: `pnpm install` (Node 18+).  
2. Run the dev server: `pnpm dev:web` and open the reported localhost URL.  
3. For static review, serve `index.html` alongside the `js/` and `src/` folders (a simple `pnpm dlx serve .` works).  
4. Keep the browser console open—most automation hooks are exposed on `window`.

## Core control surface (for agents & scripts)
- **System switcher:** `window.switchSystem(systemName)` swaps the active engine and syncs UI state back into the renderer.  
- **Geometry selector:** `window.selectGeometry(index)` updates the geometry buttons and routes `geometry` to the engine via `updateParameter`.  
- **Parameter routing:** `window.updateParameter(param, value)` is the canonical path every slider uses; `window.enhancedUpdateParameter` logs intent before delegating.  
- **Bulk helpers:** `randomizeAll()`, `randomizeEverything()`, and `resetAll()` provide one-call changes that hit every slider (plus geometry/hue for `randomizeEverything`).  
- **State capture:** `captureCurrentState()`/`restoreState(state)` (from the state manager) allow you to snapshot a configuration, replay it, or feed it to gallery saves and exports.  
- **Reactivity/audio:** `toggleSystemReactivity(system, interaction, enabled)` and `toggleAudioReactivity(level, channel, enabled)` gate which inputs respond during capture runs.  
- **Device tilt:** `toggleDeviceTilt()` enables gyro-based rotation; useful for motion-rich captures.

## Export & gallery surfaces
- **Trading cards:** Call `createTradingCard(format)` to download a self-contained HTML card of the current view. Formats include the default `classic`; engines inject current parameters so the card stays live.  
- **Gallery saves:** `saveToGallery()` stores the active system/geometry/parameters to the on-page gallery with undo/redo history. Use `openGallery()` for a modal view and quick restore, or `quickSave()/quickGallery()` for toolbar access.  
- **Viewer portal:** `viewerPortal.exportAsTradingCard()` (from `ViewerPortal.js`) can emit a card directly from the immersive viewer if you need a full-bleed look.

## Repeatable asset-pack recipes
- **Palette study (static):** Pick a system with `switchSystem`, lock geometry via `selectGeometry`, then sweep `hue`, `saturation`, and `intensity` with `updateParameter` calls. Save each variant with `saveToGallery()`; batch-export cards afterward with `createTradingCard()`.  
- **Motion set (live):** Enable tilt (`toggleDeviceTilt`), randomize parameters (`randomizeAll`), and capture a state snapshot (`captureCurrentState`). Replay the same motion across systems by switching systems and calling `restoreState(snapshot)` before export.  
- **Geometry sweep:** Loop `selectGeometry` across indices, apply a fixed parameter preset (using `restoreState`), and call `createTradingCard()` per geometry. This yields a consistent pack of HTML previews covering the full catalog.  
- **Audio-reactive pack:** Enable chosen channels with `toggleAudioReactivity`, set tempo/speed, and record a short screen capture while the canvas reacts. Store the exact slider/a11y configuration in the gallery for later regeneration.

## Packaging tips
- Keep a naming scheme that encodes `system-geometry-variant` per saved card or screenshot.  
- For web delivery, ship the exported HTML cards alongside PNG/JPEG thumbnails (capture with the browser or your automation harness).  
- Preserve the `window.userParameterState` snapshot in JSON next to each asset; it makes future edits reproducible via `restoreState`.  
- Include the gallery save JSON when sharing packs so teammates can reload the same presets locally.
