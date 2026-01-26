# Phase 5 testing + metrics collection plan

This plan defines the extensive testing regimen, data collection artifacts, and analysis hooks required to measure system health, performance, and stability. It is designed to feed actionable metrics into Phase 5 production hardening.

## Objectives
- Establish a repeatable, high‑coverage test matrix across systems and surfaces.
- Capture deterministic metrics for performance, stability, and correctness.
- Produce machine‑readable artifacts to support analysis and regression detection.

## Test matrix
### 1) Unit + integration
- Core math (rotors, projections), geometry generators, render contracts.
- Scene graph lifecycle + resource disposal.

### 2) Agentic workflow validation
- MCP tool calls: create → rotate → preview → save/load.
- Schema validation and error handling coverage.

### 3) Export pipeline validation
- Export format generation + golden snapshot hashes.
- Telemetry manifest integrity (hashes, metadata, licensing tags).

### 4) Cross‑platform sanity
- WebGL baseline rendering.
- WebGPU scaffold (feature‑flagged) fallback behavior.
- Flutter bridge smoke tests (structure + command buffering).

### 5) XR benchmark validation
- Target frame budgets, memory caps, and regression thresholds.

## Metrics to capture
- **Performance**: FPS, frame time (CPU/GPU), memory usage.
- **Stability**: error counts, context loss events, resource leaks.
- **Correctness**: hash diffs against golden snapshots, schema validation errors.
- **Workflow**: MCP operation latency, telemetry export time, CLI success rate.

## Data collection artifacts
- `DOCS/PHASE5_TEST_REPORT.md` — summary report (human‑readable).
- `DOCS/PHASE5_METRICS_REPORT.json` — machine‑readable metrics snapshot.
- `DOCS/PHASE5_XR_BENCHMARK_REPORT.md` — XR results template.

## Collection cadence
- **Per PR**: unit + integration tests, schema validation, export diff checks.
- **Weekly**: full E2E runbook + XR benchmark.
- **Release**: full matrix + artifact archival.

## Analysis guidance
- Compare metrics against previous run and baseline thresholds.
- Flag regressions above 5% for FPS or export hash changes.
- Aggregate MCP tool latencies to identify workflow bottlenecks.
