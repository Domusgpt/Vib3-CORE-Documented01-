# Export formats

This reference documents the target export formats supported by the agentic pipelines and how they are validated.

## Supported formats
- **SVG Sprite Sheet (`svg-sprite`)** – Vector sprites for web or design tooling.
- **Lottie JSON (`lottie-json`)** – Motion-friendly JSON payloads for animation pipelines.
- **CSS Variables (`css-variables`)** – Theme-ready CSS custom properties.

## Golden snapshot validation
Exports should be validated with golden snapshot tests to ensure fidelity across updates.

1. Generate exports via CLI or pipeline.
2. Compare against stored snapshots in tests.
3. Update snapshots only when changes are intentional.

The current export format list is tracked in `tools/export/formats.js` with snapshot coverage in `src/testing/exportFormats.test.js`.
