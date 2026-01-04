# Telemetry and CLI Gap Analysis

This note tracks the current state of telemetry outputs and CLI usability for the VIB3+ engine. The repository now includes production-ready telemetry modules, JSONL sinks, and browser hooks instead of only design intent.

## Status snapshot (implemented)

1. **Telemetry facade and schema**
   - `src/product/telemetry/createTelemetryFacade.js` normalizes payloads, applies the shared JSON schema (`src/product/telemetry/schema.js`), and fans out to providers.
   - Default providers include a structured console logger and a JSONL file sink (`telemetry/logs.jsonl`), with an HTTP stub for custom targets.

2. **CLI commands**
   - `pnpm telemetry:emit -- --event slider-change --system quantum --rot4dXY 0.5` writes JSONL and prints a summary line.
   - `pnpm telemetry:tail` streams the JSONL file for live debugging.
   - `pnpm telemetry:validate telemetry/logs.jsonl` checks captured events against the shipped schema with Ajv.

3. **UI integration points**
   - Slider changes, randomize/reset, gallery saves/loads, trading-card export start/finish, and error handlers emit telemetry with the same payload shape as the CLI.
   - The browser client persists a `sessionId` in `localStorage` so CLI and UI events can be correlated in the JSONL log.

## Payload shape (JSONL)
```json
{
  "event": "slider-change" | "gallery-load" | "export-start" | "export-finish" | "error",
  "timestamp": "2024-07-22T12:34:56.789Z",
  "sessionId": "uuid",
  "context": {
    "system": "quantum" | "faceted" | "holographic",
    "geometry": "hypercube" | "rhombic-dodeca" | "…",
    "variation": 0,
    "controls": {
      "rot4dXY": 0.12,
      "rot4dXZ": 0.34,
      "rot4dYZ": 0.56,
      "rot4dXW": 0.78,
      "rot4dYW": 0.9,
      "rot4dZW": 1.2,
      "audioReactive": true,
      "bgAudioGain": 0.5
    }
  },
  "metrics": {
    "frameTimeMs": 14.8,
    "exportDurationMs": 220
  },
  "meta": {
    "version": "1.0.0",
    "userAgent": "VIB3+ CLI/1.0"
  }
}
```

## Acceptance checklist (now met)
- Imports of `./product/telemetry/facade` and `./product/telemetry/reference-providers` resolve to real modules with the payload schema and provider defaults above.
- CLI scripts exist for emit/tail/validate, documented in `README.md`.
- Telemetry outputs default to JSONL with schema validation and fail-safe logging when a sink is unavailable.
- Control and export pathways emit at least: slider changes, gallery loads, variation saves/loads, export start/finish, and error events.
