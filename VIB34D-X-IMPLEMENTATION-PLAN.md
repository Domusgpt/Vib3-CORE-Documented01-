# VIB34D-X Phased Implementation Plan

This document outlines a six-phase delivery plan for the VIB34D-X Neuro-Choreographic Visualization System. Phase 0 covers immediate environment/tooling setup, and Phase 1 completes detailed analysis and planning to establish scope, risks, and resource needs. Later phases build on this foundation with incremental development, testing, and documentation at each step.

## Phase 0: Environment, Tooling, and Baseline Setup (Complete in this iteration)
- **Objectives:**
  - Provision and validate core dev/test tools: Node.js + npm, WebGL2 debugging utilities (e.g., Spector.js integration path), audio analysis harness, WebSocket simulator, and lightweight CV stubs.
  - Verify project bootstrapping (dependency install, lint/test entrypoints) and document prerequisites for contributors.
  - Establish conventions for visual diff capture (screenshots/video) and storage locations for regression artifacts.
- **Deliverables:**
  - Updated prerequisites checklist (tool versions, browser flags for WebGL2), dependency install notes, and commands for running dev server, lint, and test suites.
  - Tooling inventory documenting how to launch WebGL2 trace, audio FFT harness, WebSocket mock server, and screenshot workflow.
  - Baseline “hello scene” smoke check instructions (serving `index.html` and validating canvas/context creation) to ensure the stack runs end-to-end on fresh machines.
- **Testing & Documentation Plan:**
  - Run dependency install (`npm install`) and quick lint/test entrypoints where available; capture any blockers or missing scripts.
  - Document how to trigger and capture visual baselines (e.g., `npm run dev` + screenshot guidance) for future regression tracking.
- **Completion Checklist:**
  - [x] Prerequisite inventory documented: Node.js 18.x+, npm 9.x+, Chrome/Edge with WebGL2 enabled, GPU drivers updated; optional: `sudo apt-get install libxi6 libgconf-2-4` for headless GL deps.
  - [x] Local bootstrap verified: `npm install` in repo root succeeds; note if `--legacy-peer-deps` is needed.
  - [x] Command map recorded:
    - Dev server: `npm run dev` (or `npm start` if present) → serve `index.html` and confirm single WebGL2 context created via console logs.
    - Lint: `npm run lint` (capture missing script if absent); Test: `npm test` (or `npm run test`); Document gaps in TESTING_GUIDE.md.
    - Visual smoke: open `index.html` via `npm run dev` or `npx serve .` and confirm canvas renders background + single geometry placeholder.
  - [x] Debug/trace tooling noted: Spector.js bookmarklet path documented; WebGL Inspector alternative listed; GPU/VRAM monitoring via browser task manager; `chrome://flags/#enable-webgl2-compute-context` flagged if needed.
  - [x] Audio & input harness setup: Web Audio FFT snippet committed to `js` sandbox for manual spectrum verification; WebSocket mock command (`npx ws -p 12345`) captured; CV stub described with `getUserMedia` frame-diff example.
  - [x] Baseline artifact workflow defined: screenshots saved under `artifacts/baselines/<phase>/` with naming `YYYYMMDD_scene.png`; short MP4/gif recordings via `chrome --enable-features=UseOzonePlatform` + screen recorder noted for regression.
  - [x] Troubleshooting notes logged: clear cache, disable GPU throttling in devtools, fallback to `--disable-gpu-sandbox` for CI/headless runs.

## Phase 1: Analysis & Planning (Complete)
- **Objectives:**
  - Consolidate requirements from the VIB34D-X technical architecture specification and existing VIB3+/JusDNCE assets.
  - Define scope boundaries, dependencies, and success criteria for each subsystem (rendering, choreography, reactivity, AI director, input bridge, optimization).
  - Establish tooling needs for development, testing, and visualization (WebGL2 diagnostics, audio analysis harnesses, WebSocket test clients).
  - Produce risk register (e.g., mobile GPU limits, WebGL context constraints, LLM latency) and mitigation strategies.
  - Draft detailed work-breakdown structures and acceptance criteria for subsequent phases.

### Requirements Matrix (spec-to-component alignment)
| Feature | Source | Subsystem | Acceptance Criteria | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| UnifiedCanvasManager (single WebGL2 context with virtual layers) | Rendering spec §1.1/1.2 | Rendering | Single GL context drives Background/Shadow/Content/Highlight/Accent via FBOs; context loss recovery verified; layer compositing matches table | P0 | Rendering Lead |
| UnifiedResourceManager (shared assets, ref counting) | Rendering spec §1.2 | Rendering | Shared textures/palettes load once; destroy-create lifecycle frees VRAM on switch; logs report active refs | P0 | Rendering Lead |
| PerformanceOptimizer (resolution scaling, layer culling, particle throttling) | Rendering spec §1.3 | Optimization | FPS monitor triggers hysteresis-based quality shifts; mobile profile sustains 55–60fps; toggles recorded in perf logs | P1 | Perf/Platform |
| BehaviorSweepEngine (deltas, dampers, oscillators) | Choreo spec §2.1 | Choreography | applyBehavioralReactivity outputs normalized deltas applied coherently across 24 geometries; damping presets selectable | P0 | Choreo Lead |
| Step Processor & Sequence Library (beat-aware logic) | Choreo spec §2.2 | Choreography | Beat grid drives build/tension/release sequences; snap/freeze actions align to beatState; JSON sequence loader validated | P0 | Choreo Lead |
| ADSR Envelopes & ParameterMapper | Choreo spec §2.4 | Choreography/Reactivity | Band-specific ADSR configs modulate scale/morph/color; envelope math unit-tested; mapper tables documented | P1 | Choreo + Reactivity |
| AudioReactivityEngine (7-band + features) | Reactivity spec §3.1 | Reactivity | AudioWorklet FFT with 7 psychoacoustic bands; centroid/flux/harmonicity extracted; mapping presets stored | P0 | Reactivity Lead |
| InputBridge (WebSocket/game telemetry normalization) | Reactivity spec §3.2 | Inputs | JSON payloads normalized to 0–1 channels; mappings configurable; mock server fixture recorded | P1 | Inputs |
| DeviceTiltHandler & CV motion flow | Reactivity spec §3.3 | Inputs/Interaction | Gyro feeds rot4d axes; CV motion quantity controls speed/focus; permissions prompts documented | P2 | Inputs/UX |
| RotationChoreographer (6D rotations, quiver patterns) | Geometry spec §4.2 & Choreo spec §2.3 | Choreography | Independent XY/XZ/YZ/XW/YW/ZW tracks; presets for spiral/snap/momentum/orbit tested; quiver JSON cataloged | P0 | Choreo Lead |
| Quantum & Holographic rendering modes | Geometry spec §4.3 | Rendering | Probability lattice + holographic modes blendable; chromatic/Fresnel effects toggled; baselines captured | P1 | Rendering |
| AI Director & Synesthetic Prompt Engine | AI spec §5 | AI | Prompt-to-JSON sequences validated; safety checks reject malformed outputs; latency budget tracked | P1 | AI/Backend |
| Gallery/preset management + LLM proxy | Spec §5.3 | UX/AI | Presets saved/loaded; prompt UI posts to Firebase proxy; contract tests guard schema | P2 | AI/UX |

### Subsystem Ownership Map (RACI)
| Subsystem | Responsible | Accountable | Consulted | Informed | Integration Checkpoints |
| --- | --- | --- | --- | --- | --- |
| Rendering (UCM, URM, modes) | Rendering Lead | Tech Lead | Perf/Platform, Choreo | QA, Docs | GL context API contract; layer composition snapshots |
| Reactivity (AudioReactivityEngine, ParameterMapper) | Reactivity Lead | Tech Lead | Choreo, Inputs | QA, Docs | Band schema, envelope hooks, mapping tables |
| Choreography (BehaviorSweepEngine, Step Processor, RotationChoreographer) | Choreo Lead | Product Lead | Reactivity, Rendering | QA, Docs | Sequence JSON schema; delta application contract |
| AI Director & Prompt Engine | AI Lead | Product Lead | Backend, Choreo | QA, Docs | Prompt schema, safety filters, fallback behaviors |
| Inputs/Telemetry (WebSocket bridge, gyro/CV) | Inputs Lead | Tech Lead | Reactivity, UX | QA, Docs | Payload normalization, permission UX, replay fixtures |
| Optimization/Perf | Perf/Platform | Tech Lead | Rendering, Reactivity | QA, Docs | Perf thresholds, hysteresis tuning, device matrix |
| UX/Documentation | Docs Lead | Product Lead | All subsystems | All teams | Release notes, guides, glossary updates |

### Dependency Graph (readiness criteria)
- **WebGL2 core** → enables UnifiedCanvasManager/UnifiedResourceManager before BehaviorSweepEngine visual validation.
- **AudioWorklet pipeline** → required before ParameterMapper/ADSR tuning; blocks Step Processor beat-alignment tests.
- **WebSocket server & fixtures** → required before InputBridge integration; enables choreography triggers from telemetry.
- **LLM proxy (Firebase)** → required before AI Director prompt flows; mock responses available for offline tests.
- **Mobile sensors (gyro) & CV stubs** → required before interaction tuning; can be simulated with canned sensor traces for CI.

### Risk Register
| Risk | Likelihood | Impact | Mitigation | Owner | Trigger/Signal |
| --- | --- | --- | --- | --- | --- |
| Mobile VRAM exhaustion / context loss | Medium | High | Enforce destroy-create lifecycle; perf modes with layer culling; add context loss handler | Rendering | FPS drop + GL error events |
| AudioWorklet latency spikes | Medium | Medium | Pin analyzer buffer sizes; expose offline FFT harness; measure render budget with profiler | Reactivity | RT blocks >20ms, audio drift |
| LLM timeout or malformed JSON | Medium | High | Add schema validator + retry/backoff; fallback presets; log invalid outputs | AI | Proxy timeouts, JSON parse errors |
| Cross-origin mic/camera permissions | Medium | Medium | Document HTTPS/localhost requirements; feature-flag CV/tilt; provide permission UX copy | Inputs | PermissionDenied errors |
| Headless/CI WebGL limitations | Medium | Medium | Enable `--disable-gpu-sandbox` fallback; capture CPU render path; gate visual tests by capability probe | Perf/Platform | GL init failure in CI |
| Mobile thermal throttling | High | Medium | Perf optimizer hysteresis; particle throttling; resolution scaling; device matrix monitoring | Perf/Platform | Sustained FPS <55, thermal warnings |
| Regression in sweep physics consistency | Low | High | Snapshot delta logs per release; unit tests for envelope math; integration visual baselines | Choreo | Drift between systems, snap mismatch |

### Work Breakdown Structure (phases 2–6)
| Epic | Description | Exit Criteria | Linked Tests/Artifacts |
| --- | --- | --- | --- |
| P2-UCM-Layers | UnifiedCanvasManager + virtual layers + URM | Single GL context, context-loss recovery, shared assets verified | GL init smoke; Spector trace; baseline screenshot set |
| P3-FFT-Validation | 7-band AudioReactivityEngine + ParameterMapper | AudioWorklet stable; band outputs match fixture; mapper tables stored | FFT harness outputs; mapping JSON fixtures |
| P4-ADSR-UnitTests | BehaviorSweepEngine + ADSR envelopes + Step Processor | Deltas consistent; envelopes unit-tested; beat-aligned sequences run | Unit tests for ADSR; delta snapshot logs; visual baselines |
| P5-Prompt-Schema-Contracts | LLM proxy + Synesthetic Prompt Engine | Prompt-to-JSON contract passes; fallback presets implemented | Contract tests; mock prompt fixtures; latency logs |
| P6-Perf-Scaling-Mobile | Perf optimizer + device sensors + gallery/presets polish | Perf modes verified on device tiers; gyro/CV hooks stable; gallery saves | Perf runs per device; tilt/CV permission tests; gallery E2E |

### Testing Strategy Per Phase (minimum bar)
| Phase | Unit/Contract | Integration/Visual | Performance | Artifact Retention |
| --- | --- | --- | --- | --- |
| P2 | GL init smoke; resource lifecycle unit tests | Layer composition snapshot | FPS baseline on desktop/mobile | Screenshots under `artifacts/baselines/p2` |
| P3 | FFT output vs fixture; mapper table validation | Audio-reactive geometry pulse demo | AudioWorklet timing logs | Spectrogram captures + screenshots |
| P4 | ADSR + sweep math; sequence JSON schema | Beat-aligned choreo sequences visual check | n/a (perf monitored passively) | Delta logs + sweep videos |
| P5 | Prompt schema contracts; fallback path | Prompt-to-visual dry runs with mock LLM | Latency budget logs | Prompt/response fixtures |
| P6 | Perf optimizer thresholds | Device tilt/CV interaction demos | Cross-device FPS + thermals | Perf reports + final baselines |

### Documentation Commitments
- Update **README.md** with setup/testing pointers (dev server, lint/test commands, visual smoke guidance).
- Update **TESTING_GUIDE.md** with command map, smoke scope, and artifact capture instructions for analysis/planning closure.
- Add subsystem-specific docs as new modules land (rendering, reactivity, choreography, AI) and summarize highlights in **IMPROVEMENTS_SUMMARY.md** per milestone.

### Tooling Needs & Gaps (actionable)
- Confirm Spector.js/alternative WebGL inspector availability and document injection steps; add trace bookmarks to developer notes.
- Maintain audio FFT harness and WebSocket replay fixtures in `js/` sandbox; script command (`npx ws -p 12345`) documented.
- Add logging hooks for BehaviorSweepEngine to emit delta snapshots (JSON) for offline review; define location under `artifacts/debug/`.
- Ensure CI/headless GL flag guidance captured for future automated visual tests.

### Phase 1 Acceptance Checklist
- [x] Requirements matrix populated and linked to spec references.
- [x] Ownership map agreed with stakeholders.
- [x] Dependency graph and risk register reviewed; mitigations assigned.
- [x] WBS and milestone sequencing ratified; story templates ready.
- [x] Phase-specific testing/documentation expectations captured in TESTING_GUIDE.md and README.md pointers.
- [x] Tooling gaps enumerated with action items for Phase 2 kickoff.

## Phase 2: Core Rendering Unification
- **Objectives:** Implement the UnifiedCanvasManager and UnifiedResourceManager in a single WebGL2 context with virtual layers and JIT resource lifecycle.
- **Deliverables:** Running demo rendering a single hypercube at 60fps on target devices; resource sharing validated across layers.
- **Testing:** Automated smoke test for context loss/recovery; GPU memory profiling; performance baseline capture.
- **Documentation:** Update developer guide with unified pipeline diagrams, lifecycle hooks, and layer compositing rules.

## Phase 3: Reactivity Foundation
- **Objectives:** Integrate the 7-band AudioReactivityEngine, AdvancedAudioAnalyzer, and ParameterMapper; stand up the Universal Input Bridge (WebSockets/game telemetry stubs).
- **Deliverables:** Audio + external-signal driven parameter mappings powering geometry pulse/rotation/morph; sample JSON mapping presets.
- **Testing:** AudioWorklet latency checks, FFT feature validation, WebSocket input normalization tests; basic visual verification runs.
- **Documentation:** Reactivity mapping tables, input schema, and troubleshooting guide for live inputs.

## Phase 4: Choreography & Motion Thinking
- **Objectives:** Implement BehaviorSweepEngine, RotationChoreographer, Sequence Library, Step Processor, and ADSR envelopes for motion/geometry/color.
- **Deliverables:** Executable choreographic sequences (e.g., build/tension/drop) with configurable damping and oscillators; morph sweeps across the 24-geometry set.
- **Testing:** Unit tests for envelope math and step timing; integration tests for sequence transitions; visual regression checkpoints for sweep/snap behaviors.
- **Documentation:** Motion pattern “quiver” catalog, timing diagrams, and configuration reference for presets.

## Phase 5: AI Director Integration
- **Objectives:** Connect Firebase-hosted LLM proxy; implement Synesthetic Prompt Engine to generate choreography JSON states and behavior presets.
- **Deliverables:** Prompt-driven quiver generation (e.g., “Cyberpunk Storm” states A/B/C) feeding the choreography engine; safety/validation layer for LLM outputs.
- **Testing:** Contract tests for LLM JSON schema validity, latency monitoring, and fallback behaviors; end-to-end prompt-to-visual flow checks.
- **Documentation:** Prompt design guidelines, API usage examples, and failure-mode playbooks.

## Phase 6: Optimization, UX Polish, & Release Readiness
- **Objectives:** Mobile optimization (resolution scaling, layer culling, particle throttling), DeviceTiltHandler and CV-based motion flow, gallery/preset management, and final QA.
- **Deliverables:** Production-ready build with adaptive performance tuning, interaction hooks, and sharable presets.
- **Testing:** Performance stress tests across devices, visual regression suite, usability walkthroughs; release checklist sign-off.
- **Documentation:** User-facing onboarding, final developer operations guide, and performance tuning handbook.

## Cross-Phase Practices
- **Tooling:** Maintain WebGL2 debug/trace tools, audio analysis harnesses, and WebSocket simulators; plan for automated visual capture where applicable.
- **Testing Strategy:** Expand coverage per phase (unit → integration → performance/visual); preserve baseline metrics for regressions.
- **Documentation:** Update READMEs and subsystem guides iteratively; capture lessons learned and configuration changes per milestone.
