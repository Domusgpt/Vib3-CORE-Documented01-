# Phase 4 — Cross-platform execution plan (2026 readiness)

This document completes Phase 4 by defining the cross-platform execution architecture and implementation milestones required to make VIB3+ competitive with 2026 offerings across web, native, and XR surfaces. It complements the unified SDK blueprint with a concrete plan for a shared core, binding strategy, and platform-quality targets.

## Objectives
- Establish a shared core that can run in WebAssembly and be embedded in native shells without per-frame FFI overhead.
- Provide consistent rendering backends for WebGL 2 and an experimental WebGPU path gated by feature flags.
- Deliver Flutter bindings with a batched command buffer and deterministic telemetry.
- Preserve workflow-oriented agentic tooling by exposing consistent JSON schemas and non-interactive CLI behaviors.

## Cross-platform architecture spine
### Shared core (WASM-first)
**Goal:** One math/geometry/rendering core built for WASM (and optionally native builds) with minimal glue.

**Core layers:**
- **Math runtime**: rotors/matrices, 4D vectors, projection helpers.
- **Geometry generation**: polychora, slicing, warp cores.
- **Render command graph**: platform-agnostic command buffer for draw calls, state changes, and resource allocation.
- **Telemetry hooks**: event/span emission compatible with existing JSON exporters.

**Key patterns:**
- **Batched commands**: submit render commands in blocks to avoid per-call overhead.
- **State caching**: diff render states to minimize command traffic.
- **Resource handles**: opaque IDs to avoid passing large buffers across FFI.

### WebGL 2 backend (baseline)
**Goal:** Keep WebGL 2 as the stable renderer for parity and performance.

- Provide a renderer contract adapter that maps command buffers to WebGL calls.
- Keep shader sources aligned with the materials package for reuse across backends.
- Maintain resource disposal compliance with the WebGL resource manager.

### WebGPU backend (feature flagged)
**Goal:** Provide an experimental path to modern GPU APIs without breaking production flows.

- Introduce a feature flag (build-time + runtime) that gates WebGPU usage.
- Keep fallback to WebGL 2 for unsupported hardware or denied permissions.
- Align pipeline layout with material/shader abstractions so 2026 GPU devices can adopt the backend without refactors.

### Flutter bindings
**Goal:** Provide a Flutter bridge via a batched command buffer and minimal per-frame bridge overhead.

- Use a platform channel or FFI to send command buffers to the shared core.
- Serialize only deltas to reduce bridge size.
- Provide hooks for texture/canvas integration using Flutter’s `Texture` API.

## Competitive 2026 readiness checklist
- **Performance**: stable 60fps on desktop, adaptive quality on mobile.
- **Predictability**: deterministic command buffers + snapshot-ready telemetry.
- **Portability**: WASM shared core + Flutter bindings + WebGL/WebGPU parity.
- **Agentic workflows**: JSON outputs and tool schemas for automation.
- **Security**: minimal permissions and safe default fallbacks.

## Implementation milestones
### Milestone 4.1 — Shared core boundary
- Define an explicit render command schema and resource handle contract.
- Extract math + geometry routines into a standalone core module.
- Provide a reference WASM build path and validate with existing math tests.

### Milestone 4.2 — WebGL 2 adapter
- Map command buffer ops to WebGL calls.
- Implement resource handle lifecycle mapping.
- Add GPU resource accounting telemetry.

### Milestone 4.3 — WebGPU prototype
- Implement a minimal WebGPU backend behind a feature flag.
- Validate shader/material parity with WebGL for core scenes.
- Document unsupported features and fallback behavior.

### Milestone 4.4 — Flutter bridge
- Prototype a batched command channel from Flutter to the shared core.
- Validate texture output and resize handling.
- Add telemetry emission from the bridge to maintain a single observability pipeline.

## Risk and mitigation
- **Performance regressions**: mitigate by command batching and state caching.
- **Platform fragmentation**: keep fallback paths and feature detection.
- **Telemetry mismatch**: normalize event schemas across platforms.

## Deliverables
- `@vib3/core` and `@vib3/math` shared WASM build target.
- `@vib3/webgl` renderer adapter.
- `@vib3/webgpu` experimental backend with feature flag.
- Flutter binding prototype with documented render bridge.
- Updated Phase 4 status in the development track.
