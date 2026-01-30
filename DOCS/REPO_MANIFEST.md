# Repository Manifest

This document enumerates the repository's directory structure and provides a high-level purpose for
each folder. Use it as a navigation guide when onboarding or auditing the codebase.

## Top-level Folders

| Folder | Purpose |
|--------|---------|
| `.git/` | Git metadata and internal state |
| `.github/` | GitHub Actions workflows and CI configuration |
| `DOCS/` | Authored documentation (onboarding, setup, CI, lifecycle guides) |
| `archive/` | Archived/legacy code (old implementations, TBD systems like Polychora) |
| `cpp/` | Native C++ core (WASM sources, headers, bindings, math) |
| `demo-assets/` | Demo assets and sandbox content |
| `docs/` | Documentation site sources and static docs assets |
| `examples/` | Example applications (flutter_demo, etc.) |
| `flutter/` | Flutter plugin and platform integration |
| `scripts/` | Build and utility scripts |
| `src/` | Primary engine source tree (core, renderers, math, tooling) |
| `styles/` | CSS and style assets |
| `tests/` | Unit/integration tests (Playwright, Jest) |
| `tools/` | CLI/tooling scripts (telemetry, export, math utilities) |
| `types/` | Shared TypeScript type declarations |
| `wasm/` | WebAssembly artifacts and related assets |

## Depth-2 Directory Manifest

### `cpp/`
- `cpp/bindings/` — Native bindings and interop layers
- `cpp/include/` — Public C++ headers (vib3_ffi.h)
- `cpp/math/` — Math utilities for the native core
- `cpp/src/` — Native engine sources (Rotor4D, Mat4x4, Vec4)

### `docs/`
- `docs/src/` — Documentation site sources
- `docs/wasm/` — WebAssembly-related docs assets

### `examples/`
- `examples/flutter_demo/` — Complete Flutter demo application

### `flutter/`
- `flutter/android/` — Android plugin implementation (Kotlin + OpenGL ES 3.0)
- `flutter/ios/` — iOS plugin implementation and podspec
- `flutter/lib/` — Dart package sources (vib3_engine.dart, widgets)

### `src/`
- `src/agent/` — Agentic tooling and MCP integration
  - `src/agent/cli/` — Agent CLI interface
  - `src/agent/mcp/` — MCP server and tools (MCPServer.js, tools.js)
  - `src/agent/telemetry/` — Telemetry services and exporters
- `src/advanced/` — **NEW v2.0.0** Advanced features
  - WebXRRenderer.js, WebGPUCompute.js, MIDIController.js, AIPresetGenerator.js, OffscreenWorker.js
- `src/benchmarks/` — Performance benchmarks
- `src/cli/` — CLI entry points
- `src/config/` — Configuration helpers
- `src/core/` — Core engine orchestration
  - VIB3Engine.js (+ SpatialInputSystem integration), CanvasManager.js, ParameterMapper.js, Parameters.js
- `src/creative/` — **NEW v2.0.0** Creative tooling
  - ColorPresetsSystem.js, TransitionAnimator.js, PostProcessingPipeline.js, ParameterTimeline.js
- `src/export/` — Export pipeline
  - TradingCardGenerator, VIB3PackageExporter, SVGExporter, LottieExporter
  - `src/export/systems/` — System-specific card generators
- `src/faceted/` — Faceted visualization system (FacetedSystem.js — with audio + saturation v2.0.0)
- `src/features/` — Feature flags and optional subsystems
- `src/gallery/` — Gallery rendering and orchestration
- `src/geometry/` — Geometry generation and definitions
  - `src/geometry/buffers/` — Buffer builders
  - `src/geometry/generators/` — Shape generators (Tesseract, Torus, etc.)
  - `src/geometry/warp/` — Core warps (HypersphereCore, HypertetraCore)
- `src/holograms/` — Holographic visualization system
  - RealHolographicSystem.js, HolographicVisualizer.js
- `src/integrations/` — **NEW v2.0.0** Platform integrations
  - `src/integrations/frameworks/` — Vib3React.js, Vib3Vue.js, Vib3Svelte.js
  - FigmaPlugin.js, ThreeJsPackage.js, TouchDesignerExport.js, OBSMode.js
- `src/llm/` — LLM integrations (LLMParameterInterface, LLMParameterUI)
- `src/math/` — Math primitives (Vec4, Mat4x4, Rotor4D, Projection)
- `src/quantum/` — Quantum visualization system
  - QuantumEngine.js, QuantumVisualizer.js
- `src/reactivity/` — Reactivity configuration, management, and spatial input
  - ReactivityConfig.js, ReactivityManager.js, SpatialInputSystem.js (**NEW v2.0.0**)
- `src/render/` — Rendering backends and registries
  - `src/render/backends/` — WebGL and WebGPU backends
  - `src/render/commands/` — Render command buffer
- `src/scene/` — Scene composition helpers (Scene4D, Node4D, ResourceManager)
- `src/schemas/` — JSON schemas for tooling/validation
- `src/testing/` — Testing utilities
- `src/ui/` — UI integration and components
- `src/variations/` — Visual variations and presets
- `src/viewer/` — Viewer-facing wrappers (AudioReactivity, CardBending, GalleryUI)
- `src/wasm/` — WASM-specific entry points (WasmLoader)

### `tests/`
- `tests/agent/` — Agent/tooling tests
- `tests/e2e/` — End-to-end browser tests
- `tests/geometry/` — Geometry unit tests
- `tests/math/` — Math stability/unit tests
- `tests/render/` — Rendering tests
- `tests/scene/` — Scene tests

### `tools/`
- `tools/agentic/` — Agentic helper scripts
- `tools/cli/` — CLI tooling scripts
- `tools/export/` — Export pipeline tools
- `tools/math/` — Math test baselines/utilities
- `tools/telemetry/` — Telemetry tooling

### `types/`
- `types/render/` — Render-related type definitions

### `archive/` (Archived Code)
- `archive/polychora/` — TBD Polychora system (not production ready)
- `archive/duplicate-engines/` — Old engine implementations
- `archive/duplicate-holographic/` — Old holographic system variants
- `archive/legacy-docs/` — Historical documentation
- `archive/sdk-old/` — Previous SDK implementation (superseded by src/)
- `archive/platforms/` — Experimental platform targets

---

*Last updated: 2026-01-30 (v2.0.0)*
