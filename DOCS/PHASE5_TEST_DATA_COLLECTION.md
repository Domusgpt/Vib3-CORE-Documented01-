# Phase 5 test data collection guide

This guide describes where to store raw test data, how to enrich it with context, and how to summarize it into the Phase 5 metrics reports.

## Data collection folders
- `tests/artifacts/` — raw logs, telemetry exports, and snapshots.
- `DOCS/PHASE5_METRICS_REPORT.json` — aggregated metrics snapshot.
- `DOCS/PHASE5_TEST_REPORT.md` — human‑readable summary report.

## Required data sets
1. **Telemetry export**
   - CLI output JSON from `pnpm cli:telemetry`.
   - Store raw JSON under `tests/artifacts/telemetry/`.

2. **Golden snapshot hashes**
   - Export hash manifests for each system.
   - Store under `tests/artifacts/exports/` with timestamps.

3. **MCP workflow traces**
   - Capture tool calls + response payloads.
   - Store under `tests/artifacts/mcp/`.

4. **XR benchmark logs**
   - Capture FPS, frame time, and memory stats.
   - Store under `tests/artifacts/xr/`.

## Aggregation rules
- Aggregate performance metrics into `PHASE5_METRICS_REPORT.json`.
- Summarize regressions and failures in `PHASE5_TEST_REPORT.md`.
- Attach raw artifacts under `tests/artifacts/` for audit.

## Naming conventions
- Use `YYYYMMDD_HHMM_<scenario>` for artifact names.
- Include commit hash in the report header.
