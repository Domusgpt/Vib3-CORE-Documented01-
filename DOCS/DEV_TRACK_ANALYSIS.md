# Dev track analysis and next steps

This document summarizes the current development track status, highlights gaps, and proposes the
next execution steps for Phase 4 and beyond. It should be updated after each multi-system delivery.

## Current status snapshot
- **Math foundation:** rotation utilities, projection clamping, and stability tests are in place.
- **Renderer lifecycle:** unified contract and lifecycle manager are defined with adapters for the
  core systems; resource tracking is centralized in the WebGL backend.
- **Agentic tooling:** MCP/CLI response envelopes are standardized with schema validation.
- **Docs/ops:** environment setup, CI testing, repo manifest, and project provisioning guides are
  documented.
- **WebGPU scaffold:** experimental backend initializes device/context and supports clear-pass render frames.
- **WebGPU status/testing:** documented current WebGPU state and validation requirements.

## Key gaps to close
1. **WebGPU prototype (Phase 4):**
   - Confirm feature-flag gating and parity with WebGL backend entry points.
   - Establish a minimal shader/material pipeline that mirrors the WebGL contract.
2. **Cross-platform command buffers:**
   - Document and validate the render command buffer format for Flutter/WASM integration.
   - Ensure command buffer batching and lifecycle hooks align with `RendererContract`.
3. **Telemetry export hardening:**
   - Add validation for telemetry manifests and scene packs in CI.
   - Produce golden snapshot tests for core geometries.
4. **CI automation coverage:**
   - Wire Firebase Test Lab (optional) for mobile regression coverage.
   - Add bundle-size and telemetry smoke steps to CI.

## Recommended next steps
1. **WebGPU spike (Phase 4):**
   - Build a feature-flagged WebGPU backend scaffold in `src/render/backends/`.
   - Add a minimal triangle pipeline with uniform updates and buffer management.
2. **Renderer diagnostics:**
   - Expand `RenderResourceRegistry` stats to include peak usage and per-frame deltas.
   - Add a debug panel (docs/demo) to visualize resource usage over time.
3. **CLI + schema validation:**
   - Add CLI command for validating extension/tool-pack manifests using schema registry.
   - Add CI job that checks manifest validity for example packs.
4. **Project automation:**
   - Provide a scripted `make setup` (or `pnpm setup`) that runs env + project setup steps.

## Risks and mitigation
- **GPU resource churn:** ensure registry-based disposal is called during renderer swaps.
- **Numerical drift:** keep normalization utilities and baseline tests running in CI.
- **Cross-platform divergence:** ensure WebGL and WebGPU share material definitions.
