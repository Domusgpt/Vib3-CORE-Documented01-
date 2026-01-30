# Dev track analysis and next steps

This document summarizes the current development track status, highlights gaps, and proposes the
next execution steps. It should be updated after each multi-system delivery.

**Last Updated:** 2026-01-30 (v2.0.0)

## Current status snapshot
- **Math foundation:** rotation utilities, projection clamping, and stability tests are in place.
- **Renderer lifecycle:** unified contract and lifecycle manager are defined with adapters for the
  core systems; resource tracking is centralized in the WebGL backend.
- **Agentic tooling:** MCP/CLI response envelopes are standardized with schema validation.
- **Docs/ops:** environment setup, CI testing, repo manifest, and project provisioning guides are
  documented.
- **WebGPU scaffold:** experimental backend initializes device/context and supports clear-pass render frames.
- **WebGPU status/testing:** documented current WebGPU state and validation requirements.
- **v2.0.0 Core Fixes (Phase A):** Quantum color restored, Faceted saturation + audio wired, clickIntensity bug fixed, shader sync tool added.
- **v2.0.0 SpatialInputSystem:** Universal spatial input with 8 source types, 6 profiles, integrated into VIB3Engine. Decouples "card tilting" from device orientation.
- **v2.0.0 Creative Tooling (Phase B):** Color presets (22), transitions (14 easings), post-processing (14 effects), parameter timeline (BPM sync).
- **v2.0.0 Platform Integrations (Phase C):** React, Vue, Svelte component wrappers; Figma plugin; Three.js ShaderMaterial; TouchDesigner GLSL export; OBS mode.
- **v2.0.0 Advanced Features (Phase D):** WebXR renderer, WebGPU compute shaders, MIDI controller, AI preset generator, OffscreenCanvas worker.

## Completed phases
| Phase | Status | Deliverables |
|-------|--------|-------------|
| Phase 1: Foundation | ✅ Complete | Math, geometry, parameters |
| Phase 2: Rendering | ✅ Mostly Complete | Contracts, adapters, backends |
| Phase 3: Agentic | ✅ Complete | MCP, CLI, Telemetry |
| Phase 4: WebGPU | 🔄 In Progress | Scaffold exists |
| Phase 5: Hardening | ✅ Complete | 694 tests, XSS prevention |
| Phase A: Parity & Polish | ✅ Complete | Color/audio/saturation fixes |
| Phase B: Creative Tooling | ✅ Complete | 4 modules, 3,837 lines |
| Phase C: Platform Integrations | ✅ Complete | 7 modules, 4,693 lines |
| Phase D: Advanced | ✅ Complete | 5 modules, 4,262 lines |
| SpatialInputSystem | ✅ Complete | 1,783 lines, 8 sources, 6 profiles |

## Key gaps to close
1. **v2.0.0 module test coverage:**
   - Creative, integrations, and advanced modules need unit/integration tests.
   - SpatialInputSystem profiles need validation tests.
2. **WebGPU prototype (Phase 4):**
   - Confirm feature-flag gating and parity with WebGL backend entry points.
   - Establish a minimal shader/material pipeline that mirrors the WebGL contract.
3. **Platform integration validation:**
   - Test React/Vue/Svelte components with actual framework projects.
   - Validate Figma plugin with Figma Developer Console.
   - Test TouchDesigner GLSL export in actual TD environment.
4. **Cross-platform command buffers:**
   - Document and validate the render command buffer format for Flutter/WASM integration.
   - Ensure command buffer batching and lifecycle hooks align with `RendererContract`.
5. **Telemetry export hardening:**
   - Add validation for telemetry manifests and scene packs in CI.
   - Produce golden snapshot tests for core geometries.

## Recommended next steps
1. **Test coverage for v2.0.0 modules:**
   - Write Vitest unit tests for SpatialInputSystem (profile loading, input feeding, sensitivity).
   - Write tests for creative tooling (preset application, transition interpolation, timeline playback).
   - Add E2E tests for OBS mode and framework components.
2. **NPM publish preparation:**
   - Verify all package.json exports resolve correctly.
   - Test tree-shaking with the creative/integrations/advanced imports.
   - Run `npm pack --dry-run` to verify published file list.
3. **WebGPU spike (Phase 4):**
   - Build a feature-flagged WebGPU backend scaffold in `src/render/backends/`.
   - Add a minimal triangle pipeline with uniform updates and buffer management.
4. **Renderer diagnostics:**
   - Expand `RenderResourceRegistry` stats to include peak usage and per-frame deltas.
5. **Project automation:**
   - Provide a scripted `make setup` (or `pnpm setup`) that runs env + project setup steps.

## Risks and mitigation
- **GPU resource churn:** ensure registry-based disposal is called during renderer swaps.
- **Numerical drift:** keep normalization utilities and baseline tests running in CI.
- **Cross-platform divergence:** ensure WebGL and WebGPU share material definitions.
- **v2.0.0 module breadth:** 18 new files need test coverage before production use.
- **Framework integration drift:** framework APIs evolve; pin versions in test fixtures.
