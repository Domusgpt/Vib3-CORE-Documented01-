# Phase 5 E2E runbook — production hardening

This runbook executes the Phase 5 end‑to‑end checklist in a consistent, reproducible way. It is intended for CI or manual validation prior to release.

## Prerequisites
- Node.js 18.19+
- pnpm 9.4.0 (`corepack enable` → `corepack prepare pnpm@9.4.0 --activate`)
- Project dependencies installed (`pnpm install`)

## Step 1 — Web playground verification
1. Start dev server: `pnpm dev:web`
2. Confirm system switching (Faceted → Quantum → Holographic → Polychora).
3. Adjust rotations and visual parameters, verify live updates.

## Step 2 — MCP workflow
1. Create visualization: `create_4d_visualization`.
2. Apply rotation: `set_rotation`.
3. Request preview: `render_preview`.
4. Save state: `save_to_gallery`.

## Step 3 — Telemetry export
1. Run CLI: `pnpm cli:telemetry -- <pack.json> --json --non-interactive --preview-count=4`.
2. Confirm JSON output includes hashes and manifest metadata.

## Step 4 — Gallery operations
1. Save a new variation and reload it.
2. Confirm parameter equivalence after load.

## Step 5 — Export formats
1. Generate export pack for each system.
2. Compare against golden snapshot hashes.

## Step 6 — XR benchmark
1. Run benchmark scenario with target scenes.
2. Record fps, GPU time, and memory usage.
3. Store results in `DOCS/PHASE5_XR_BENCHMARK_REPORT.md`.

## Reporting
- Log deviations and attach output artifacts.
- Flag regressions before release.
