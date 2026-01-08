# Dev track plan (2026-01-07)

This plan captures the staged work needed to deliver a production-ready agentic telemetry pipeline and export workflow. It is written as a living track plan so future sessions can append progress and maintain consistent architecture decisions.

## North-star goals
1. Agent-friendly CLI onboarding and help output.
2. Deterministic telemetry manifest exports with previews and asset hashing.
3. Clear documentation for automation, QA, and CI workflows.

## Architecture anchors
- **Telemetry pipeline**: `tools/telemetry/manifestPipeline.js` is the single source of truth for manifest normalization and hashing.
- **Preview generation**: `js/core/telemetry-director.js` generates previews (renderer-backed or placeholders) and passes them into manifests.
- **Docs hub**: `DOCS/` is the canonical location for workflow documentation (onboarding, telemetry, control references).

## Planned track (phased)
### Phase 1 — Onboarding + documentation hardening
- Publish an agentic CLI onboarding guide with tool requirements, commands, and telemetry workflow steps.
- Update README references so new onboarding docs are discoverable.
- Extend telemetry docs with explicit CLI integration guidance and export flow notes.
- Add a lightweight knowledge-check template that validates geometry/control comprehension without blocking execution.

### Phase 2 — Agentic workflow hooks
- Add CLI wrappers for telemetry export flows (pack selection, preview generation, manifest hashing).
- Emit summaries designed for CI cache validation and diffing.
- Provide optional validation hooks for manifest/preview consistency.

### Phase 3 — Quality and verification
- Add lint/test targets for telemetry outputs if applicable.
- Document CI steps for telemetry export validation.
- Add golden snapshot routines for preview images when the pipeline stabilizes.

## Risks and mitigations
- **Risk**: Hash drift due to unstable object serialization.  
  **Mitigation**: Keep stable hashing in `manifestPipeline.js` and avoid non-deterministic fields.
- **Risk**: Preview generation inconsistency across runtimes.  
  **Mitigation**: Maintain browser-safe fallback encoding and ensure renderer contracts are documented.

## Deliverables checklist
- [ ] CLI onboarding doc is complete and linked in README.
- [ ] Telemetry docs include export integration steps.
- [ ] Agentic CLI support documented or implemented.
- [ ] CI guidance includes telemetry hashes and preview artifacts.
