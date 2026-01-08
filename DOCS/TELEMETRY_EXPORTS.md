# Telemetry export manifests

The telemetry export pipeline standardizes manifest payloads for downstream automation, QA, and observability. Each manifest is designed to be cache-friendly with deterministic hashes so CI can diff outputs without ambiguity.

## Manifest fields
- **license**: Propagates the source license for downstream consumers.
- **themeTags**: Array of descriptors (e.g., `"neon"`, `"calm"`) describing the aesthetic intent.
- **colorPalettes**: Named palettes with ordered swatches to aid sprite sheet rendering and CSS variable generation.
- **typography**: Token block containing font families and scale presets.
- **responsiveBreakpoints**: Design-system-aligned breakpoints for layout-sensitive exports.
- **previews**: Thumbnail or sprite sheet references with deterministic hashes.
- **assets**: Asset records (path/url/name) with hashes for cache validation.
- **hash**: Top-level manifest hash used by CI for drift detection.

## Preview generation
The telemetry director (`js/core/telemetry-director.js`) produces preview thumbnails or sprite sheets for representative scenes/states.

1. Collect scenes from the pack (`pack.scenes` or `pack.states`).
2. For each scene, render via `renderer.captureFrame(scene)` if available; otherwise, emit a metadata-only placeholder data URL.
3. Attach preview records to the manifest with computed hashes.

## CLI/export integration
Use `exportTelemetryManifest` from `tools/telemetry/manifestPipeline.js` to build manifests in export pipelines. The helper returns:

- `manifest`: enriched manifest payload.
- `hash`: deterministic hash of the manifest.
- `summary`: human-readable lines for CLI output including asset and preview hashes.

Include the summary in CLI logs to make cache validation and diffing easier for CI and agent workflows.

### Agentic CLI usage
For a step-by-step command runbook (setup, lint, export, and verification), see [`DOCS/CLI_ONBOARDING.md`](DOCS/CLI_ONBOARDING.md).

CLI entry point: `tools/cli/agent-cli.js` supports `telemetry:export` with `--json` and `--non-interactive` flags for agent pipelines.
