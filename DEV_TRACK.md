# VIB3+ Continued Development Track

This document consolidates the ongoing development plan into a single, session-stamped track that can be updated as work progresses. It aligns with the unified SDK blueprint and defines an elegant, integrated architecture path across math, rendering, agentic tooling, and cross-platform targets.

## Tooling setup (required)
- Enable corepack and install pnpm 9.4.0.
- Install dependencies via `pnpm install`.
- Keep Node.js 18.19+ available for all build/test workflows.

## Architecture spine (integrated system plan)
### Unified package layout (target)
- **@vib3/core**: Scene graph, renderer abstraction, resource management.
- **@vib3/math**: 4D vectors, rotors/matrices, projections, stability helpers.
- **@vib3/geometry**: Polychora/tesseracts, slicing, topology definitions.
- **@vib3/materials**: Shaders, holographic/quantum materials, color pipelines.
- **@vib3/webgl**: WebGL 2.0 backend implementation.
- **@vib3/webgpu**: WebGPU backend behind feature flags.
- **@vib3/agent**: MCP tools, telemetry orchestration, validation workflows.
- **@vib3/cli**: Non-interactive automation CLI with JSON output support.

### Architectural principles
- Prefer rotor/matrix orientation state over Euler storage to avoid drift.
- Use shared renderer contracts with strict lifecycle/disposal paths.
- Provide projection helpers (stereographic + perspective) with clamping.
- Treat agentic tools as workflow-level interfaces (create scene → rotate → render).
- Keep cross-platform render command buffers batched to reduce FFI overhead.

## Detailed development track (phased)
### Phase 1 — Math foundation
**Goal:** Complete 6-plane rotation utilities, projection helpers, and stability tests.
- Implement rotor/matrix utilities for all six rotation planes.
- Add stereographic + perspective projections with singularity clamping.
- Add stability tests for drift with periodic renormalization.
- Capture baseline metrics for rotation precision and render stability.

### Phase 2 — Rendering core consolidation
**Goal:** Unify the four systems behind a shared scene graph.
- Extract renderer contracts and resource manager interfaces.
- Adapt Faceted/Quantum/Holographic/Polychora to the shared contract.
- Centralize GPU resource disposal patterns and document lifecycle rules.

### Phase 3 — Agentic integration
**Goal:** Establish workflow tools and telemetry schemas.
- Define MCP tools: create scene, apply rotation, render preview, export pack.
- Add structured telemetry (error codes, suggestions, valid options).
- Implement CLI JSON output mode and non-interactive flags.

### Phase 4 — Cross-platform execution
**Goal:** Prepare shared core for multi-surface usage.
- Formalize WASM targets for the shared core.
- Add Flutter bindings with batched render command buffers.
- Prototype WebGPU backend behind feature flags.

### Phase 5 — Production hardening
**Goal:** Licensing, exports, XR benchmarks, and golden snapshots.
- Draft licensing tiers and activation workflows.
- Add export format support with golden snapshot tests.
- Document XR integration and performance benchmarks.

## Session log (stamped)
Use the following format to stamp each session. Update the status, notes, and blockers as you go.

### Session 001 — Platform baseline
**Stamp:** 2025-02-14
- **Focus:** Tooling setup, dependency install, and baseline lint/test.
- **Status:** IN_PROGRESS
- **Notes:** Corepack enabled; pnpm 9.4.0 activated. Dependency install and lint/test pending.
- **Blockers:** None.

### Session 002 — Math foundation kickoff
**Stamp:** PENDING
- **Focus:** Rotation plane utilities + projection helpers.
- **Status:** PENDING
- **Notes:**
- **Blockers:**

### Session 003 — Stability testing
**Stamp:** PENDING
- **Focus:** Drift/renormalization tests and precision reporting.
- **Status:** PENDING
- **Notes:**
- **Blockers:**

### Session 004 — Renderer contract extraction
**Stamp:** PENDING
- **Focus:** Shared renderer contract and resource manager skeleton.
- **Status:** PENDING
- **Notes:**
- **Blockers:**

### Session 005 — System integration
**Stamp:** PENDING
- **Focus:** Adapt Faceted/Quantum/Holographic/Polychora to shared core.
- **Status:** PENDING
- **Notes:**
- **Blockers:**

### Session 006 — Agentic tool definitions
**Stamp:** PENDING
- **Focus:** MCP tool workflows + telemetry schema.
- **Status:** PENDING
- **Notes:**
- **Blockers:**

### Session 007 — CLI JSON modes
**Stamp:** PENDING
- **Focus:** Non-interactive CLI, JSON outputs, telemetry integration.
- **Status:** PENDING
- **Notes:**
- **Blockers:**

### Session 008 — Cross-platform core
**Stamp:** PENDING
- **Focus:** WASM build path + shared core bindings plan.
- **Status:** PENDING
- **Notes:**
- **Blockers:**

### Session 009 — WebGPU prototype
**Stamp:** PENDING
- **Focus:** Feature-flagged WebGPU backend spike.
- **Status:** PENDING
- **Notes:**
- **Blockers:**

### Session 010 — Production hardening
**Stamp:** PENDING
- **Focus:** Licensing, export formats, XR benchmarks, golden snapshots.
- **Status:** PENDING
- **Notes:**
- **Blockers:**
