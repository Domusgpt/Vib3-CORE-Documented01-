# VIB3+ CORE — Master Plan & Full Audit

**Date**: January 31, 2026
**Version**: 2.0.0 (`@vib3code/sdk`)
**Owner**: Clear Seas Solutions LLC
**Status**: Engine complete. Product launch pending.

---

## Executive Summary

The codebase is complete. The product isn't. You have 95,000+ lines of working engine code across 570+ files, but the gap between "engine" and "product people adopt" is **distribution, onboarding, and ecosystem**. Phases A–D of the v2.0.0 roadmap shipped all planned features. This document captures everything that remains — from the previous session's Phase 5 plan, to the full codebase audit, to new items discovered during review — organized into a single actionable plan.

**What's done**:
- 3 active visualization systems (Quantum, Faceted, Holographic) — all working
- 24-geometry system with 6D rotation — all working
- Dual GPU backends (WebGL primary, WebGPU secondary) — both functional
- SpatialInputSystem (8 input sources, 6 profiles) — complete
- Creative Tooling (color presets, transitions, post-processing, timeline) — complete
- Platform Integrations (React, Vue, Svelte, Figma, Three.js, TouchDesigner, OBS) — code complete
- Advanced Features (WebXR, WebGPU Compute, MIDI, AI Presets, OffscreenWorker) — code complete
- MCP Agentic Control (14 tools) — working
- C++ WASM Core with JS fallback — working
- Export System (SVG, CSS, Lottie, Shader, Trading Cards, VIB3Package) — working
- 693+ tests passing, 34 test files
- 6 CI/CD workflows active

**What's not done**: Everything below.

---

## 1. Dev Track Priorities: Expand, Launch, Scale, Integrate

### 1.1 Expand

#### CLI Scaffolding (`npx @vib3code/sdk init`)
- **Status**: NOT DONE
- **Current state**: `bin.vib3` exists in package.json pointing to `src/cli/index.js` (580 lines). CLI supports `create`, `state`, `set`, `geometry`, `system`, `randomize`, `reset`, `tools`, `validate`. But there is NO `init` command that scaffolds a new project.
- **Why it matters**: This is how Three.js, Vite, and every modern tool gets adopted. If someone can't go from zero to a running visualization in under 60 seconds, you lose them.
- **Action**: Add `vib3 init` command that creates a minimal project with `index.html`, `package.json`, and a working VIB3+ visualization. Support `--template react|vue|svelte|vanilla`.
- **Priority**: HIGH

#### Preset Gallery as Hosted Web App
- **Status**: NOT DONE
- **Current state**: `docs/index.html` is a static gallery of 13 algorithmic art HTML pages. No shareable permalinks. No embed codes. No user-created presets.
- **Why it matters**: Not just a docs page. A shareable, embeddable gallery where each preset has a permalink. Think CodePen but for 4D visualizations. This becomes your viral loop.
- **Action**: Build a gallery app where each visualization state gets a unique URL (`vib3.app/?geometry=16&hue=180&system=quantum`), embed snippet, and social share card.
- **Priority**: HIGH

#### TypeScript Types
- **Status**: PARTIALLY DONE — Critical gaps
- **Current state**: `types/adaptive-sdk.d.ts` referenced in package.json line 7 **DOES NOT EXIST**. 11 type files exist (2,527 lines total) covering `core/VIB3Engine.d.ts`, `reactivity/index.d.ts`, and `render/*.d.ts`.
- **Missing types for v2.0.0 modules**:
  - `SpatialInputSystem` — no types
  - `creative/*` (ColorPresetsSystem, TransitionAnimator, PostProcessingPipeline, ParameterTimeline) — no types
  - `integrations/*` (React, Vue, Svelte, Figma, Three.js, TouchDesigner, OBS) — no types
  - `advanced/*` (WebXR, WebGPU Compute, MIDI, AI Presets, OffscreenWorker) — no types
  - `agent/mcp/*` — no types
- **Why it matters**: TypeScript users won't adopt without autocomplete. The main entry point's types field points to a file that doesn't exist — `import` from `@vib3code/sdk` gives no type info at all.
- **Action**: Create `types/adaptive-sdk.d.ts` as a barrel that re-exports all module types. Add `.d.ts` files for all v2.0.0 modules.
- **Priority**: HIGH

### 1.2 Launch

#### npm Publish
- **Status**: NOT DONE
- **Current state**: `package.json` declares `@vib3code/sdk` v2.0.0 with 80+ export paths. No publish scripts. No CI automation. No `prepublishOnly` hook. Package has never been published.
- **Why it matters**: `@vib3code/sdk` needs to be on npm. That's the launch. Everything else is secondary.
- **Action**: Add `prepublishOnly` script (runs tests + build), create `.github/workflows/publish.yml` for automated publish on Git tags.
- **Priority**: CRITICAL

#### GitHub Pages Demo Site
- **Status**: PARTIALLY DONE — Needs polish
- **Current state**: `docs/` has 26 HTML pages deployed to GitHub Pages. Root `index.html` is a meta-refresh redirect (3-second delay to `docs/webgpu-live.html`). Not a landing page.
- **Why it matters**: Polish one into a proper landing page with live interactive demos, not a redirect. First impressions matter.
- **Action**: Replace `index.html` redirect with a proper landing page. Include live embedded demo, feature highlights, quick-start code snippet, and links to docs/gallery.
- **Priority**: HIGH

#### One Killer Integration Example Per Framework
- **Status**: NOT DONE
- **Current state**: Integration code exists in `src/integrations/` but no standalone example apps. `examples/` directory has Flutter demo and two standalone HTML demos only.
- **Why it matters**: A React app, a Three.js scene, a TouchDesigner patch. Each in its own example directory with its own README. Developers evaluate tools by running examples.
- **Action**: Create `examples/react/`, `examples/vue/`, `examples/svelte/`, `examples/threejs/`, `examples/touchdesigner/` with minimal working apps.
- **Priority**: HIGH

### 1.3 Scale

#### CDN Distribution
- **Status**: NOT DONE
- **Current state**: Vite config outputs ESM bundles only. No UMD/IIFE build for `<script src="https://unpkg.com/@vib3code/sdk">`. Creative coders who don't use npm can't use VIB3+.
- **Why it matters**: `<script src="https://unpkg.com/@vib3code/sdk">` for people who don't use npm. This is how many creative coders work.
- **Action**: Add UMD/IIFE build target to vite.config.js. Expose `window.VIB3` global. Test with plain HTML `<script>` tag.
- **Priority**: MEDIUM

#### WebGPU as Primary Path
- **Status**: NOT DONE — WebGL is primary, WebGPU is secondary
- **Current state**: `UnifiedRenderBridge` tries WebGPU first but WebGL is the tested/default path. WebGPU backend (1,409 lines) is functional but not actively tested in CI with real GPU. Playwright tests run Chromium only.
- **Why it matters**: WebGPU is shipping in all major browsers now. Make it the default with WebGL as fallback, not the other way around. Performance will be your differentiator.
- **Action**: Flip default priority in UnifiedRenderBridge. Add WebGPU-specific CI tests. Benchmark WebGL vs WebGPU and document results.
- **Priority**: MEDIUM

#### WASM Build Pipeline
- **Status**: PARTIALLY DONE — Manual build only
- **Current state**: `cpp/build.sh` (130 lines) supports release/debug/native/clean modes. Requires locally-installed Emscripten SDK. Pre-built `wasm/vib3_core.{js,wasm}` committed to repo. No CI workflow compiles WASM.
- **Why it matters**: The C++ core needs a reproducible build. Emscripten in CI, pre-built `.wasm` in the npm package. Users should never need to compile C++.
- **Action**: Add WASM build step to CI. Include pre-built `.wasm` in npm package via `files` field. Document the build process.
- **Priority**: MEDIUM

### 1.4 Integrate into Workflows

#### Figma Plugin Published to Community
- **Status**: NOT DONE
- **Current state**: `src/integrations/FigmaPlugin.js` (854 lines) generates complete plugin manifest, code, and UI. But it's a code generator, not a published plugin.
- **Why it matters**: You have the code. Ship the plugin. The Figma Community is where designers discover tools.
- **Action**: Generate the plugin bundle, test in Figma Dev Mode, publish to Figma Community.
- **Priority**: MEDIUM

#### OBS Plugin Documented with Screenshots
- **Status**: NOT DONE
- **Current state**: `src/integrations/OBSMode.js` (754 lines) implements transparent background + browser source mode. No visual documentation.
- **Why it matters**: VJs and streamers won't read API docs. They need a 5-step visual guide with screenshots.
- **Action**: Create `DOCS/OBS_SETUP_GUIDE.md` with screenshots showing OBS configuration step by step.
- **Priority**: LOW-MEDIUM

#### Storybook
- **Status**: NOT DONE — Broken setup
- **Current state**: Storybook scripts and devDependencies exist in package.json (`@storybook/html-vite ^8.1.6`). But `.storybook/` config directory **DOES NOT EXIST**. Running `npm run storybook` will fail.
- **Why it matters**: This is how design system teams evaluate tools. A working Storybook with all geometry variants, color presets, and system demos is a powerful evaluation tool.
- **Action**: Create `.storybook/main.js` and `.storybook/preview.js`. Add stories for each visualization system, geometry variant, and creative tool.
- **Priority**: LOW-MEDIUM

---

## 2. Low-Hanging Fruit

These are high-impact, low-effort improvements. Audit status for each:

### 2.1 Add Root LICENSE File
- **Status**: NOT DONE
- **Audit**: No `LICENSE`, `LICENSE.md`, or `LICENSE.txt` exists. `package.json` declares `"license": "SEE LICENSE IN DOCS/LICENSE_ATTESTATION_PROFILE_CATALOG.md"` but that file was not found either.
- **Why it matters**: Companies won't touch code without a clear license. This blocks all adoption.
- **Action**: Create root `LICENSE` file. Pick MIT for community (or dual-license for commercial) and ship it.
- **Priority**: CRITICAL — Unblocks everything

### 2.2 Fix `index.html` Entry Point
- **Status**: NOT DONE — Currently a meta-refresh redirect
- **Audit**: `index.html` does `<meta http-equiv="refresh" content="3; url=docs/webgpu-live.html">` with fallback links. Styled but not a real landing page.
- **Why it matters**: First impressions matter. A 3-second redirect is not a product experience.
- **Action**: Replace with proper landing page or at minimum a clean hub with live demo embed.
- **Priority**: HIGH

### 2.3 Verify 80+ Package Exports
- **Status**: BROKEN — 14 broken export paths found
- **Audit**: The following exports reference files that DO NOT EXIST:
  | Export Path | Missing File |
  |-------------|-------------|
  | `./` (types) | `types/adaptive-sdk.d.ts` |
  | `./ui/adaptive/renderers/webgpu` | `src/ui/adaptive/renderers/webgpu/index.ts` |
  | `./quaternion` | `src/ui/adaptive/renderers/ShaderQuaternionSynchronizer.js` |
  | `./sensors` | `src/ui/adaptive/SensoryInputBridge.js` |
  | `./core/quaternion` | `src/core/quaternion/index.ts` |
  | `./core/quaternion/poseSchema` | `src/core/quaternion/poseSchema.ts` |
  | `./core/quaternion/registry` | `src/core/quaternion/registry.ts` |
  | `./ui/adaptive/renderers/pose-registry` | `src/ui/adaptive/renderers/QuaternionPoseRegistrySynchronizer.ts` |
  | `./ui/adaptive/renderers/pose-monitor` | `src/ui/adaptive/renderers/PoseReliabilityMonitor.ts` |
  | `./ui/adaptive/renderers/pose-confidence` | `src/ui/adaptive/renderers/poseConfidence.ts` |
  | `./ui/adaptive/localization` | `src/ui/adaptive/localization/index.ts` |
  | `./product/telemetry/facade` | `src/product/telemetry/createTelemetryFacade.js` |
  | `./product/telemetry/reference-providers` | `src/product/telemetry/providers/referenceTelemetryProviders.js` |
  | Types references | `types/product/telemetry/*.d.ts` (entire directory) |
- **Why it matters**: One broken import kills trust. `import { X } from '@vib3code/sdk/quaternion'` will crash at runtime.
- **Action**: Remove dead exports (quaternion, pose, product/telemetry, sensors, localization) or implement the missing modules. Verify every remaining path resolves.
- **Priority**: CRITICAL — Must fix before npm publish

### 2.4 Add `engines` Field to package.json
- **Status**: DONE
- **Audit**: `"engines": { "node": ">=18.19.0" }` exists at line 354.
- **No action needed**.

### 2.5 Create CHANGELOG.md
- **Status**: NOT DONE
- **Audit**: No `CHANGELOG.md`, `CHANGELOG.txt`, or `HISTORY.md` exists anywhere in the project.
- **Why it matters**: You've been versioning but there's no changelog. This is trivial to write and signals professionalism.
- **Action**: Create `CHANGELOG.md` covering v1.0.0 through v2.0.0 changes.
- **Priority**: MEDIUM

### 2.6 Screenshot/GIF Assets in README
- **Status**: NOT DONE
- **Audit**: README.md contains only 3 SVG badge shields. Zero embedded screenshots, GIFs, or videos. No `/assets`, `/images`, or `/screenshots` directories.
- **Why it matters**: A picture of a 4D tesseract rotating is worth more than any amount of API documentation for getting people interested.
- **Action**: Record 30-second demo videos/GIFs of each system. Embed in README. Create `assets/` directory for media.
- **Priority**: HIGH

### 2.7 Error Messages Audit
- **Status**: PARTIALLY DONE
- **Audit results**:
  | Scenario | Handling | Quality |
  |----------|----------|---------|
  | WebGPU unavailable | Falls back to WebGL via UnifiedRenderBridge | GOOD |
  | WASM fails to load | Falls back to JS math modules, 10s timeout | EXCELLENT |
  | AudioContext blocked | Returns `false`, emits error event | PARTIAL — no silent mode |
  | WebGL unavailable | Draws "WebGL Required" text on canvas | GOOD |
  | WebGPU device error | `console.error` only, not wired to telemetry | GAP |
- **Action**: Wire WebGPU device errors to telemetry. Add silent/fallback mode for audio. Ensure all error states produce user-friendly messages.
- **Priority**: MEDIUM

### 2.8 Add `npm run dev` Alias
- **Status**: NOT DONE
- **Audit**: Only `"dev:web": "vite --open"` exists. No `"dev"` alias.
- **Why it matters**: Most people type `npm run dev`. The `:web` suffix adds friction.
- **Action**: Add `"dev": "vite --open"` to scripts.
- **Priority**: LOW — Trivial fix

---

## 3. Testing, Feedback, and Infrastructure for Beta

### 3.1 Testing Gaps to Close

#### Unit Tests for v2.0.0 Modules
- **Status**: NOT DONE — 15,512 lines of new code with zero test coverage
- **Audit**: The following v2.0.0 files have NO tests:
  | Module | File | Lines | Tests |
  |--------|------|-------|-------|
  | SpatialInputSystem | `src/reactivity/SpatialInputSystem.js` | 1,783 | NONE |
  | ColorPresetsSystem | `src/creative/ColorPresetsSystem.js` | 980 | NONE |
  | TransitionAnimator | `src/creative/TransitionAnimator.js` | 683 | NONE |
  | PostProcessingPipeline | `src/creative/PostProcessingPipeline.js` | 1,113 | NONE |
  | ParameterTimeline | `src/creative/ParameterTimeline.js` | 1,061 | NONE |
  | Vib3React | `src/integrations/frameworks/Vib3React.js` | 591 | NONE |
  | Vib3Vue | `src/integrations/frameworks/Vib3Vue.js` | 628 | NONE |
  | Vib3Svelte | `src/integrations/frameworks/Vib3Svelte.js` | 654 | NONE |
  | FigmaPlugin | `src/integrations/FigmaPlugin.js` | 854 | NONE |
  | ThreeJsPackage | `src/integrations/ThreeJsPackage.js` | 660 | NONE |
  | TouchDesignerExport | `src/integrations/TouchDesignerExport.js` | 552 | NONE |
  | OBSMode | `src/integrations/OBSMode.js` | 754 | NONE |
  | WebXRRenderer | `src/advanced/WebXRRenderer.js` | 680 | NONE |
  | WebGPUCompute | `src/advanced/WebGPUCompute.js` | 1,051 | NONE |
  | MIDIController | `src/advanced/MIDIController.js` | 703 | NONE |
  | AIPresetGenerator | `src/advanced/AIPresetGenerator.js` | 777 | NONE |
  | OffscreenWorker | `src/advanced/OffscreenWorker.js` | 1,051 | NONE |
  | shader-sync-verify | `tools/shader-sync-verify.js` | 937 | NONE |
- **Priority**: HIGH

#### Math Library Edge Cases
- **Status**: NOT DONE
- **Why it matters**: NaN inputs, zero vectors, degenerate rotors. The math is correct but you need proof it's robust. Geometric algebra has subtle normalization issues.
- **Action**: Add edge-case tests for Vec4, Mat4x4, Rotor4D, Projection with NaN, Infinity, zero, and denormalized inputs.
- **Priority**: MEDIUM

#### Cross-Browser Matrix
- **Status**: NOT DONE — Chromium only
- **Audit**: `playwright.config.js` defines a single project: `chromium` with `Desktop Chrome` device. No Firefox, Safari, or mobile browser projects.
- **Why it matters**: WebGPU support varies significantly across browsers. Safari has different WebGL quirks. You need proof it works everywhere.
- **Action**: Add Firefox and WebKit projects to Playwright config. Test WebGPU on Chrome, WebGL fallback on Firefox/Safari.
- **Priority**: HIGH for beta

#### Mobile Testing
- **Status**: NOT DONE
- **Why it matters**: DeviceOrientation, touch input, gyroscope — these are core features of SpatialInputSystem. You need real device testing or at minimum BrowserStack/Sauce Labs in CI.
- **Action**: Add mobile browser projects to Playwright. Consider BrowserStack integration for real device testing.
- **Priority**: MEDIUM

#### Performance Benchmarks as Tests
- **Status**: PARTIALLY DONE — Benchmarks exist, no thresholds
- **Audit**: `benchmarks.yml` workflow exists. `src/benchmarks/BenchmarkRunner.js` and `MetricsCollector.js` implemented. But benchmarks don't fail CI if frame time exceeds thresholds.
- **Action**: Add assertion thresholds to benchmark runner. Fail CI on regression.
- **Priority**: MEDIUM

#### Accessibility Audit
- **Status**: NOT DONE — Zero accessibility support
- **Audit**: Zero occurrences of `prefers-reduced-motion` in the entire codebase. Zero `aria-` attributes. No keyboard focus management. No screen reader support.
- **Why it matters**: `prefers-reduced-motion` should disable or slow animations. Keyboard navigation matters for all interactive controls.
- **Action**: Add `@media (prefers-reduced-motion: reduce)` CSS rules. Add ARIA labels to interactive UI elements. Document keyboard shortcuts in accessible format.
- **Priority**: MEDIUM

#### Memory Leak Testing
- **Status**: NOT DONE — But cleanup patterns are comprehensive
- **Audit**: Strong `destroy()`/`dispose()` patterns across all systems. Guard flags prevent double-destruction. WebGL resources explicitly deleted. Workers properly terminated. However, no automated memory leak detection tests exist.
- **Gap found**: `SpatialInputSystem` has no explicit `destroy()` method. Inconsistent naming between `destroy()` and `dispose()` across modules.
- **Action**: Add memory leak detection test (run engine for N minutes, switch systems, measure heap). Standardize cleanup method naming. Add `destroy()` to SpatialInputSystem.
- **Priority**: MEDIUM

### 3.2 Feedback Infrastructure

#### GitHub Discussions
- **Status**: NOT DONE
- **Audit**: No `.github/discussions.yml` or discussion configuration. Only `.github/workflows/` exists.
- **Action**: Enable GitHub Discussions for the repo. Create categories: Q&A, Showcases, Feature Requests.
- **Priority**: LOW-MEDIUM

#### Error Telemetry (opt-in)
- **Status**: PARTIALLY DONE
- **Audit**: `TelemetryService.js` (464 lines) has OpenTelemetry-compatible event tracing with span tracking, structured events, and multiple exporters (Prometheus, JSON, NDJSON, Console). But no `window.onerror` crash reporter for end-user error collection.
- **Action**: Add opt-in `window.onerror` / `window.onunhandledrejection` reporter that sends anonymized crash data. Must be off by default.
- **Priority**: LOW-MEDIUM

#### Public Roadmap
- **Status**: NOT DONE
- **Action**: Create GitHub Projects board. Let potential users see what's coming and vote.
- **Priority**: LOW

#### Discord Community
- **Status**: NOT DONE
- **Why it matters**: Creative coders live in Discord. You need a channel for real-time feedback during beta.
- **Action**: Create Discord server with channels: #general, #showcase, #bugs, #feature-requests, #dev.
- **Priority**: LOW-MEDIUM

### 3.3 Infrastructure

#### Automated npm Publish from CI
- **Status**: NOT DONE
- **Audit**: No publish workflow. No `prepublishOnly` script. No release automation of any kind.
- **Action**: Create `.github/workflows/publish.yml` triggered by Git tags. Flow: tag → CI builds → tests → publishes to npm. Add `prepublishOnly: "npm test && npm run build:web"`.
- **Priority**: CRITICAL

#### Canary/Nightly Builds
- **Status**: NOT DONE
- **Audit**: No scheduled workflows. All workflows triggered by push or manual dispatch.
- **Action**: Add workflow publishing `@vib3code/sdk@canary` on every main branch commit. Power users test bleeding edge.
- **Priority**: LOW-MEDIUM

#### CDN with Versioning
- **Status**: NOT DONE — Depends on npm publish
- **Why it matters**: unpkg and jsDelivr automatically work with npm packages. Once published, CDN URLs work for free.
- **Action**: After npm publish, verify `https://unpkg.com/@vib3code/sdk` and `https://cdn.jsdelivr.net/npm/@vib3code/sdk` work. Document CDN usage.
- **Priority**: MEDIUM (after npm publish)

#### Hosted Demo with URL State
- **Status**: NOT DONE
- **Audit**: Zero occurrences of `URLSearchParams`, `location.search`, or `location.hash` in any `docs/*.html` file. Demo pages don't support shareable state URLs.
- **Why it matters**: `vib3.app/?geometry=16&hue=180&system=quantum` — shareable URLs that reproduce exact states.
- **Action**: Add URL state serialization/deserialization to `docs/webgpu-live.html`. Read params on load, update URL on parameter change.
- **Priority**: HIGH

---

## 4. Distribution, Supplemental Media, and Repo Strategy

### 4.1 Distribution Strategy

| Channel | Priority | Status | Notes |
|---------|----------|--------|-------|
| **npm** | Critical | NOT DONE | `@vib3code/sdk` — primary distribution channel |
| **CDN** | High | NOT DONE | unpkg/jsDelivr (automatic after npm publish) |
| **GitHub Releases** | High | NOT DONE | Pre-built WASM + bundles as release assets |
| **Figma Community** | Medium | NOT DONE | Plugin listing from `FigmaPlugin.js` |
| **Chrome Web Store** | Low-Medium | NOT DONE | Standalone visualizer extension |
| **Flutter pub.dev** | Medium | NOT DONE | If the Flutter integration matures |

### 4.2 Supplemental Media and Assets to Plan

#### 30-Second Demo Videos
- **Status**: NOT DONE
- One per system (Quantum, Faceted, Holographic). Screen captures of the actual engine running. Post on Twitter/X, embed in README.

#### Interactive Tutorial
- **Status**: NOT DONE
- A step-by-step guided experience in the browser. "Click here to change the geometry. Now drag to rotate in 4D." This is your onboarding.

#### API Reference Site
- **Status**: NOT DONE
- Generated from JSDoc/TSDoc. Host on GitHub Pages or a subdomain. The CLAUDE.md is great for AI context but humans need searchable docs.

#### Blog Post Series
- **Status**: NOT DONE
- "How 4D rotation actually works", "Building a WebGPU visualization engine", "Geometric algebra for graphics programmers". Content marketing that also attracts contributors.

#### Trading Card Showcase
- **Status**: PARTIALLY DONE — Generator exists, no public gallery
- You have `TradingCardGenerator.js` (3,054 lines) and 13 card HTML pages in `docs/`. Make a public gallery of generated cards. This is inherently shareable content.

### 4.3 Repo Strategy

Recommended multi-repo structure:

```
Domusgpt/vib3-core           ← Engine SDK (this repo)
Domusgpt/vib3-docs           ← Documentation site (Docusaurus/Starlight)
Domusgpt/vib3-examples       ← Example projects (one per framework)
Domusgpt/vib3-site           ← Marketing site / landing page
Domusgpt/vib3-figma-plugin   ← Figma plugin (separate publish cycle)
Domusgpt/vib3-media          ← Screenshots, videos, press kit, brand assets
```

**Why separate repos**:
- **vib3-docs**: Docs have a different deploy cycle than code. Fix a typo without triggering CI tests. Use Docusaurus or Starlight — they have versioned docs built in.
- **vib3-examples**: Each example should be independently clonable. A React developer shouldn't need to clone the whole engine to see the React example.
- **vib3-site**: Marketing copy, landing page, SEO. Different team/skills than engine development.
- **vib3-media**: Brand guidelines, logos, screenshots, video assets, press kit. Creative assets don't belong in a code repo.

**Keep in core repo**:
- Tests — tests and code must always be in sync
- CI/CD — workflows need access to source
- CLAUDE.md and technical docs — they're engineering context, not user docs

---

## 5. Additional Issues Found in Audit (Not in Previous Plan)

These items were discovered during the full codebase audit and are NOT covered in the screenshots above.

### 5.1 Broken TypeScript Entry Point
- **Severity**: CRITICAL
- **Finding**: `package.json` line 7 declares `"types": "./types/adaptive-sdk.d.ts"` but this file does not exist. Any TypeScript consumer gets zero type information.
- **Action**: Create the file immediately or update the path.

### 5.2 Storybook Configuration Missing
- **Severity**: LOW
- **Finding**: `storybook` and `build:storybook` scripts exist. `@storybook/html-vite` is in devDependencies. But `.storybook/` directory does not exist. Scripts will crash.
- **Action**: Either create `.storybook/` config or remove the broken scripts/deps.

### 5.3 SpatialInputSystem Missing Cleanup
- **Severity**: MEDIUM
- **Finding**: `SpatialInputSystem.js` (1,783 lines) has no `destroy()` or `dispose()` method. Event listeners are registered but never explicitly cleaned up.
- **Action**: Add `destroy()` method that removes all event listeners and clears state.

### 5.4 Inconsistent Cleanup Method Naming
- **Severity**: LOW
- **Finding**: Some systems use `destroy()`, others use `dispose()`. HolographicVisualizer uses `destroy()`, FacetedSystem uses `dispose()`, MIDIController uses `destroy()`.
- **Action**: Standardize on one name (prefer `dispose()` to match the `Disposable.js` base class in `src/scene/`).

### 5.5 WebGPU Device Errors Not Wired to Telemetry
- **Severity**: LOW
- **Finding**: `WebGPUBackend.js` has `device.onuncapturederror = (event) => { console.error(...) }` but doesn't record to TelemetryService.
- **Action**: Wire WebGPU errors to telemetry event stream.

### 5.6 Archive Directory Bloat
- **Severity**: LOW
- **Finding**: `archive/` contains 15 directories of legacy code. This inflates repo size and clone time.
- **Action**: Consider moving to a separate branch or deleting entirely. Keep a release tag for historical reference.

### 5.7 Missing GitHub Community Files
- **Severity**: LOW
- **Finding**: No `CODEOWNERS`, `SECURITY.md`, `FUNDING.yml`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue templates, or PR templates.
- **Action**: Add standard community health files to `.github/`.

### 5.8 Flaky Timing Test
- **Severity**: LOW
- **Finding**: `withTiming` test sometimes fails by <1ms (documented in SESSION_014_PLAN).
- **Action**: Increase tolerance or use `performance.now()` with wider margins.

---

## 6. Complete Priority Roadmap

### Phase E-1: Pre-Launch Blockers (Do First)

| # | Item | Status | Effort |
|---|------|--------|--------|
| 1 | Add root `LICENSE` file | NOT DONE | Trivial |
| 2 | Fix/remove 14 broken package.json exports | NOT DONE | Small |
| 3 | Create `types/adaptive-sdk.d.ts` barrel file | NOT DONE | Small |
| 4 | Add `npm run dev` alias | NOT DONE | Trivial |
| 5 | Add `prepublishOnly` script | NOT DONE | Trivial |
| 6 | Create `.github/workflows/publish.yml` | NOT DONE | Small |
| 7 | Create `CHANGELOG.md` | NOT DONE | Small |

### Phase E-2: Launch (npm Publish + Landing Page)

| # | Item | Status | Effort |
|---|------|--------|--------|
| 8 | npm publish `@vib3code/sdk` v2.0.0 | NOT DONE | Small (after E-1) |
| 9 | Replace `index.html` with proper landing page | NOT DONE | Medium |
| 10 | Add URL state to demo page | NOT DONE | Medium |
| 11 | Record 3 demo videos/GIFs | NOT DONE | Medium |
| 12 | Embed media in README.md | NOT DONE | Small |

### Phase E-3: Adoption Friction (Onboarding)

| # | Item | Status | Effort |
|---|------|--------|--------|
| 13 | CLI `init` scaffolding command | NOT DONE | Medium |
| 14 | Framework example apps (React, Vue, Svelte, Three.js) | NOT DONE | Large |
| 15 | TypeScript types for all v2.0.0 modules | PARTIAL | Large |
| 16 | Storybook configuration + stories | NOT DONE | Medium |
| 17 | CDN/UMD build configuration | NOT DONE | Small |

### Phase E-4: Quality & Confidence (Testing)

| # | Item | Status | Effort |
|---|------|--------|--------|
| 18 | Unit tests for 18 v2.0.0 modules | NOT DONE | Large |
| 19 | Math edge-case tests (NaN, zero, degenerate) | NOT DONE | Medium |
| 20 | Cross-browser Playwright (Firefox, Safari) | NOT DONE | Medium |
| 21 | Mobile testing setup | NOT DONE | Medium |
| 22 | Memory leak detection tests | NOT DONE | Medium |
| 23 | Performance benchmark thresholds | PARTIAL | Small |
| 24 | Accessibility (prefers-reduced-motion, ARIA) | NOT DONE | Medium |
| 25 | Fix SpatialInputSystem missing destroy() | NOT DONE | Small |
| 26 | Fix flaky timing test | NOT DONE | Trivial |

### Phase E-5: Scale & Distribution

| # | Item | Status | Effort |
|---|------|--------|--------|
| 27 | WebGPU as primary render path | NOT DONE | Medium |
| 28 | WASM build in CI | PARTIAL | Medium |
| 29 | Canary/nightly builds | NOT DONE | Small |
| 30 | Figma Community plugin publish | NOT DONE | Medium |
| 31 | OBS visual setup guide | NOT DONE | Small |
| 32 | GitHub Releases with WASM + bundles | NOT DONE | Small |

### Phase E-6: Ecosystem & Community

| # | Item | Status | Effort |
|---|------|--------|--------|
| 33 | Preset gallery web app with permalinks | NOT DONE | Large |
| 34 | Interactive tutorial | NOT DONE | Large |
| 35 | API reference site (JSDoc → Docusaurus) | NOT DONE | Large |
| 36 | GitHub Discussions | NOT DONE | Trivial |
| 37 | GitHub community health files | NOT DONE | Small |
| 38 | Discord community | NOT DONE | Trivial |
| 39 | Public roadmap (GitHub Projects) | NOT DONE | Trivial |
| 40 | Error telemetry (opt-in) | PARTIAL | Medium |
| 41 | Blog post series | NOT DONE | Large (content) |
| 42 | Trading card public gallery | PARTIAL | Medium |
| 43 | Archive cleanup | NOT DONE | Small |

---

## 7. Summary: What to Do Next (Priority Order)

1. **License file** — Unblocks everything
2. **Fix broken exports** — Trust killer if shipped broken
3. **npm publish pipeline** — Makes the product real
4. **Landing page with live demo** — First impression
5. **CLI scaffolding (`npx @vib3code/sdk init`)** — Adoption friction
6. **3 demo videos** — Marketing fuel
7. **Cross-browser test matrix** — Confidence for beta
8. **vib3-examples repo** — One per integration
9. **CHANGELOG.md** — Signals professionalism
10. **Discord community** — Feedback channel

---

## 8. File Reference

### Key Files to Modify
| File | Action Needed |
|------|---------------|
| `package.json` | Remove broken exports, add `dev` alias, add `prepublishOnly` |
| `index.html` | Replace redirect with landing page |
| `LICENSE` | Create (new file) |
| `CHANGELOG.md` | Create (new file) |
| `types/adaptive-sdk.d.ts` | Create (new file) |
| `playwright.config.js` | Add Firefox + WebKit projects |
| `vite.config.js` | Add UMD/IIFE build target |
| `.storybook/main.js` | Create (new file) |
| `.github/workflows/publish.yml` | Create (new file) |
| `src/cli/index.js` | Add `init` command |
| `src/reactivity/SpatialInputSystem.js` | Add `destroy()` method |
| `README.md` | Add screenshots/GIFs, improve quick-start |
| `docs/webgpu-live.html` | Add URL state support |

### New Directories Needed
| Directory | Purpose |
|-----------|---------|
| `examples/react/` | React integration example |
| `examples/vue/` | Vue integration example |
| `examples/svelte/` | Svelte integration example |
| `examples/threejs/` | Three.js integration example |
| `assets/` | Screenshots, GIFs, demo videos |
| `.storybook/` | Storybook configuration |
| `.github/ISSUE_TEMPLATE/` | Issue templates |

---

*Generated: January 31, 2026 — Full codebase audit + Phase 5 plan consolidation*
*VIB3+ CORE — Clear Seas Solutions LLC*
