# Phase 5 — Production hardening plan (2026 readiness)

This plan defines the production-hardening track to deliver competitive, end‑to‑end readiness for 2026. It focuses on licensing, export formats, XR benchmarks, and golden snapshot validation, with an explicit E2E checklist so every system path can be exercised in a controlled workflow.

## Objectives
- Finalize licensing tiers and activation workflows with predictable upgrade paths.
- Deliver export formats with golden snapshots and deterministic telemetry hashes.
- Establish XR performance benchmarks with reproducible metrics.
- Provide an end‑to‑end execution checklist that validates every system surface.

## Workstreams
### 1) Licensing tiers + activation workflow
- Confirm tier matrix and entitlements across core, materials, and exports.
- Define activation flow and offline licensing fallback.
- Add structured licensing metadata to telemetry export manifests.

### 2) Export formats + golden snapshots
- Formalize export targets (JSON, sprites, manifests).
- Define golden snapshot pipeline and hash comparison rules.
- Add CI steps to validate export consistency across systems.

### 3) XR benchmarks + performance baselines
- Define XR test scenes and target frame budgets.
- Capture GPU, CPU, and memory utilization baselines.
- Add regression thresholds and reporting format.

### 4) End‑to‑end system verification
- Build a single E2E checklist that touches: web app, CLI telemetry export, MCP preview, gallery save/load, and export pipeline.
- Ensure the checklist is runnable in CI or in a manual validation session.

## End‑to‑end validation checklist
1. **Web playground**: `pnpm dev:web`, verify system switching and parameter updates.
2. **MCP workflow**: create visualization → set rotation → render preview → save to gallery.
3. **Telemetry export**: run CLI export with `--json` and validate manifest hashes.
4. **Gallery operations**: save/load variations and confirm state fidelity.
5. **Export formats**: generate export pack and compare against golden snapshot hashes.
6. **XR benchmark**: run benchmark scenario and record metrics in the report format.

## Deliverables
- Licensing tier specification and activation flow documentation.
- Export format spec + golden snapshot test harness.
- XR benchmark suite with baseline metrics.
- Phase 5 E2E checklist runbook and report template.
