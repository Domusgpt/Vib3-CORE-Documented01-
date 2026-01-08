# VIB3+ SDK Development Track (Consolidated Execution List)

This document translates the strategic blueprint and QA findings into a single, actionable execution list. Items are organized by layer and include status markers for the current implementation cycle.

## Status Legend
- ✅ **Completed in current implementation**
- 🟡 **In progress**
- ⬜ **Planned**

---

## 1) Core Architecture & Package Topology
⬜ **Adopt scoped packages** following Babylon.js-style layering: `@vib3/core`, `@vib3/math`, `@vib3/geometry`, `@vib3/materials`, `@vib3/webgl`, `@vib3/webgpu`, `@vib3/agent`, `@vib3/cli`.
⬜ **Ensure ES module exports & tree-shaking** by declaring `"sideEffects"` accurately and using explicit exports for subpaths.
⬜ **Enforce rendering-agnostic math/geometry** by removing rendering dependencies from `@vib3/math`/`@vib3/geometry`.
⬜ **Implement extension registry** (PixiJS-style) for projections, loaders, and renderers.

---

## 2) 4D Mathematics & Rotation Correctness
⬜ **Rotor algebra** (8-component rotor: scalar + 6 bivectors + pseudoscalar) with regular renormalization.
⬜ **Matrix-based 4D rotation utilities** for GPU-friendly pipelines.
✅ **Align 4D rotation parameter ranges** across UI, parameter validation, and mapping layers.
✅ **Replace 4D physics orientation with matrix integration**, avoiding Euler-only storage in physics core.

---

## 3) 4D → 3D Projection & Numerical Stability
✅ **Add singularity clamping** to 4D projection math to avoid division spikes.
✅ **Expose projection mode selection** (perspective / stereographic / orthographic) in shader-based paths.
⬜ **Clamp singularities in export shaders** (card generators and WebGL export pipeline).
⬜ **Add projection type control in UI** (dropdown or advanced settings panel).

---

## 4) WebGL / WebGPU Rendering
✅ **Expand WebGPU rotor storage to 8 components** in instance buffers.
⬜ **Update WebGPU shader bindings** to consume 8-component rotors (two vec4s).
⬜ **Implement WebGPU backend parity** for holographic and polychora render modes.

---

## 5) Agentic API Design (MCP & Tooling)
⬜ **Workflow-based MCP tools** (e.g., `create_4d_visualization` with semantically rich responses).
⬜ **Progressive disclosure** of tools via `search_tools`.
⬜ **Structured error formats** with actionable metadata.
⬜ **OpenTelemetry instrumentation** for tool usage, GPU cost, and latency.
⬜ **Agent-ready CLI** with JSON output, streaming progress, and idempotency keys.

---

## 6) Cross-Platform Strategy
⬜ **C++/Rust core + WASM/WebGL** baseline (Rive model).
⬜ **Flutter bindings via FFI** with batched command buffers.
⬜ **Shared shader source** via GLSL + SPIRV-Cross to WGSL/Metal.
⬜ **Protobuf schema** for cross-language data interchange (Vec4, Transform4D, Polychoron).

---

## 7) Module Usage & Resource Management
⬜ **Full bundle and granular imports** with explicit side-effect registration modules.
⬜ **Reference-counted GPU resources** with `ResourceManager` and `disposeAll()` flow.

---

## 8) Licensing & Commercial Model
⬜ **MIT runtime** for core packages.
⬜ **Tiered commercial tooling** (export gating, advanced rendering modes, editor SaaS).
⬜ **License verification** with offline caching, grace periods, and version-locked terms.

---

## 9) Roadmap Phases
⬜ **Phase 1 (Math Foundation)**: rotors, projections, polytope generators, tests.
⬜ **Phase 2 (Rendering Core)**: unified renderer, resource management, 5-layer pipeline.
⬜ **Phase 3 (Agentic Integration)**: MCP tools, CLI, telemetry, `llms.txt`.
⬜ **Phase 4 (Cross-Platform)**: Rust/WASM, Flutter FFI, WebGPU.
⬜ **Phase 5 (Production Hardening)**: licensing, editor, export formats, XR.

---

## 10) Redundancy & Refactor Targets
⬜ **Extract GLSL math kernels** into a single source to share between JS and shaders.
⬜ **Move reactivity inputs to event streams** for agent subscription.
⬜ **Define a `RenderTarget` abstraction** (Canvas, OffscreenCanvas, Flutter Texture).
⬜ **Implement telemetry facade** using OpenTelemetry semantic conventions.

---

## QA Fixes Integrated in This Cycle
- ✅ WebGPU instance rotor storage expanded to 8 components.
- ✅ Physics orientation now uses matrix integration; Euler planes retained only for UI.
- ✅ Projection math clamped for stability and projection modes added.
- ✅ Rotation parameter ranges unified and validated in UI layer.
- ✅ Polychora parameters now share projection/rotation and common UI mappings.
