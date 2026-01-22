# Phase 5 metrics collection guide

This guide details how to capture performance and correctness metrics from the existing telemetry system and export pipelines so Phase 5 analysis can be executed without bespoke tooling.

## Telemetry sources
- **TelemetryService events**: emit render and tool events that can be exported as JSON.
- **Telemetry exporters**: JSON/NDJSON exporters are available via the telemetry module.

## Collection workflow
1. **Run tests**: `pnpm test` to capture unit + integration coverage.
2. **Generate telemetry exports**: `pnpm cli:telemetry -- <pack.json> --json --non-interactive --preview-count=4`.
3. **Record MCP workflow**: call MCP tools (create → rotate → preview) and store responses.
4. **Store artifacts**: place outputs under `tests/artifacts/` by type.

## Metrics mapping
- **frames_rendered_total** → `performance.avg_fps` trend
- **toolInvocations/toolErrors** → `workflow.cli_success_rate`
- **parameterChanges** → `workflow.mcp_latency_ms` trend analysis
- **export hash diffs** → `correctness.golden_hash_mismatches`

## Output artifacts
- `DOCS/PHASE5_METRICS_REPORT.json`
- `DOCS/PHASE5_TEST_REPORT.md`
- `DOCS/PHASE5_XR_BENCHMARK_REPORT.md`

## Validation helper
- `node tools/telemetry/validatePhase5Metrics.mjs`
