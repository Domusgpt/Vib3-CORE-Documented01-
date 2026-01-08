# Strategic development blueprint (2026-01-07)

This document captures the unified SDK direction for VIB3+ and provides an actionable architecture spine for agentic-first development.

## Unified architecture stack
- **Rendering core**: WebGL engine becomes the renderer of record.
- **Agentic wrapper**: MCP/automation layer orchestrates workflows, telemetry, and validation.
- **SDK scaffolding**: Public API layer with modular packages for core, math, geometry, materials, webgl, webgpu, agent, and cli.

## Package layout target
```
@vib3/core      → Scene graph, resource management, abstract renderer
@vib3/math      → 4D vectors, rotors, matrices, projections
@vib3/geometry  → Polychora, tesseracts, slicing algorithms
@vib3/materials → Shaders, holographic/quantum rendering modes
@vib3/webgl     → WebGL 2.0 backend
@vib3/webgpu    → WebGPU backend (experimental)
@vib3/agent     → MCP server, tools, telemetry
@vib3/cli       → Agent-friendly CLI interface
```

## Math + rendering principles
- 4D rotations require rotors or 4×4 matrices; avoid storing orientation as Euler angles.
- Provide stereographic and perspective projections with singularity clamping.
- Renormalize rotors/matrices periodically to avoid drift.

## Agentic API design
- Prefer workflow-oriented tools (create scene, apply rotations, render preview) over low-level API exposure.
- Emit structured telemetry with explicit error codes, suggestions, and valid options.
- Add JSON output mode, non-interactive flags, and streaming progress events to the CLI.

## Cross-platform strategy
- Plan a shared core (Rust/C++/WASM) with thin platform bindings (web, Flutter, native).
- Batch render commands to avoid per-frame FFI overhead.
- Share shader sources and cross-compile to target platforms.

## Licensing direction (draft)
- MIT runtime for core packages with paid tiers for advanced tooling and exports.
- Provide transparent changelogs, pricing notices, and grandfathering policies.

## Phased roadmap
1. **Math foundation**: rotors, projections, core polychora generators.
2. **Rendering core**: renderer abstraction, system consolidation, resource disposal.
3. **Agentic integration**: MCP tools, telemetry, CLI JSON outputs.
4. **Cross-platform**: WASM core, Flutter bindings, WebGPU backend.
5. **Production hardening**: licensing, editor tooling, export formats, XR integration.

## Detailed blueprint actions
### Phase 1 — Mathematical foundation
- Implement rotor/matrix utilities for all six rotation planes.
- Provide stereographic + perspective projection helpers with clamping.
- Add automated stability tests for rotation drift.

### Phase 2 — Rendering core consolidation
- Extract renderer contracts and resource manager interfaces.
- Unify the four visualization systems behind a shared scene graph.
- Document disposal patterns to prevent GPU leaks.

### Phase 3 — Agentic integration
- Define MCP tools around workflows (create scene, apply rotation, render preview).
- Add telemetry spans and error schemas for validation and tooling.
- Implement CLI JSON output modes and non-interactive flags.

### Phase 4 — Cross-platform execution
- Formalize a WASM target and shared math core.
- Add Flutter bindings with a batched render command buffer.
- Prototype WebGPU backend behind feature flags.

### Phase 5 — Production hardening
- Draft licensing tiers and activation flow.
- Add export format support with golden snapshot tests.
- Document XR integration and performance benchmarks.
