# Agentic CLI onboarding

This guide aligns the current CLI surface (package scripts and telemetry helpers) with an agentic workflow. It is intentionally explicit so automation agents and humans can share the same runbook.

## Prerequisites (tools to install)
- **Node.js 18.19+** (project engine requirement)
- **pnpm 9.4.0** (`corepack enable` then `corepack prepare pnpm@9.4.0 --activate`)
- Optional: **Storybook** support is baked into `pnpm storybook` once dependencies are installed.
- Optional: environment bootstrap script for Firebase, gcloud, Flutter, Android SDK, and GH CLI is in [`DOCS/ENV_SETUP.md`](DOCS/ENV_SETUP.md).
- Optional: CI/test workflow and command checklist lives in [`DOCS/CI_TESTING.md`](DOCS/CI_TESTING.md).
- Optional: renderer lifecycle overview for system orchestration is in [`DOCS/RENDERER_LIFECYCLE.md`](DOCS/RENDERER_LIFECYCLE.md).
- Optional: GCP + Firebase provisioning steps live in [`DOCS/PROJECT_SETUP.md`](DOCS/PROJECT_SETUP.md).
- Optional: repository directory manifest is in [`DOCS/REPO_MANIFEST.md`](DOCS/REPO_MANIFEST.md).
- Optional: development track analysis is in [`DOCS/DEV_TRACK_ANALYSIS.md`](DOCS/DEV_TRACK_ANALYSIS.md).

## Baseline setup
```bash
pnpm install
```

## Daily dev commands
| Goal | Command | Notes |
| --- | --- | --- |
| Start the web playground | `pnpm dev:web` | Opens Vite dev server. |
| Build production bundle | `pnpm build:web` | Outputs `dist/`. |
| Lint core engine sources | `pnpm lint` | ESLint runs on `src/**/*.{js,ts}`. |
| Run tests | `pnpm test` | Runs Vitest in CLI mode. |
| Analyze bundle size | `pnpm analyze:bundle` | Vite build in analyze mode. |
| CI bundle check | `pnpm check:bundle` | Builds and runs size guard. |
| Telemetry export (CLI) | `pnpm cli:telemetry -- <pack.json> --json --non-interactive --preview-count=4` | Agent-friendly JSON output. |
| Storybook | `pnpm storybook` | Runs UI component workshop. |

## Telemetry export workflow (agentic)
1. **Prepare a pack** with `pack.scenes` (or `pack.states`) so preview generation has material.
2. **Call the telemetry director** (`js/core/telemetry-director.js`) to generate previews and manifest data:
   - `TelemetryDirector.generatePreviewSprites(pack, count)`
   - `TelemetryDirector.exportPack(pack, options)`
3. **Use the manifest pipeline** (`tools/telemetry/manifestPipeline.js`) to normalize metadata, compute hashes, and emit CLI-friendly summaries.
4. **Persist the results** in your export path along with hash summaries for CI and caching.

## Recommended agent checklist
- Confirm Node/pnpm versions match the project constraints.
- Install dependencies with `pnpm install`.
- Run `pnpm lint` before export steps.
- Use telemetry hash summaries for diff checks and CI caching.
- Capture preview image artifacts if export tasks include visual outputs.
- Review [`DOCS/CONTROL_REFERENCE.md`](DOCS/CONTROL_REFERENCE.md) and do a quick knowledge check:
  - Name the geometry types available in the engine.
  - List the control parameter names for each geometry type.

If the answers are incomplete, continue with the workflow but flag the miss and point to the fix:
- **If geometry types are wrong/missing:** review [`DOCS/CONTROL_REFERENCE.md`](DOCS/CONTROL_REFERENCE.md) to confirm the active system list.
- **If control names are wrong/missing:** review [`DOCS/CONTROL_REFERENCE.md`](DOCS/CONTROL_REFERENCE.md) for the exact control IDs and parameter names.

### Knowledge check response template (copy/paste)
```
Geometry types:
- <type 1>
- <type 2>
- <type 3>
- <type 4>

Controls by geometry:
- <type 1>: <control ids...>
- <type 2>: <control ids...>
- <type 3>: <control ids...>
- <type 4>: <control ids...>
```

If any section is incomplete, proceed with the task but annotate the gap and point to [`DOCS/CONTROL_REFERENCE.md`](DOCS/CONTROL_REFERENCE.md) as the source of truth.

## Troubleshooting
- If `pnpm` is missing, run `corepack enable` then re-run the install step.
- If telemetry previews fail in a browser context, ensure `TelemetryDirector` has a renderer that implements `captureFrame(scene)`.
