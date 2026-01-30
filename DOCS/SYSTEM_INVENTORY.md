# VIB3+ SDK System Inventory

**Document Version:** 2.0.0
**Last Updated:** 2026-01-30
**Purpose:** Complete technical inventory for developers and AI agents

---

## Executive Summary

VIB3+ is a **general-purpose 4D rotation visualization SDK** designed for:
- Plugin marketplaces and browser extensions
- Wearable devices and XR platforms
- Agentic AI integration (MCP protocol)
- Cross-platform deployment (Web, Flutter, WASM)

The SDK provides 3 active visualization systems with shared 6D rotation mathematics, unified rendering contracts, comprehensive telemetry, a universal spatial input system, creative tooling, cross-platform framework integrations, and advanced features including WebXR, WebGPU compute, and MIDI.

---

## Quick Reference Card

| Metric | Value |
|--------|-------|
| **SDK Version** | 2.0.0 |
| **Visualization Systems** | 3 active (Quantum, Faceted, Holographic) + 1 archived (Polychora - TBD) |
| **Rotation Planes** | 6 (XY, XZ, YZ for 3D; XW, YW, ZW for 4D) |
| **Base Geometries** | 8 per system |
| **Core Warp Types** | 3 (Base, Hypersphere, Hypertetrahedron) |
| **Total Geometries** | 24 per system (8 base × 3 cores) |
| **Canvas Layers** | 5 per system (background, shadow, content, highlight, accent) |
| **MCP Tools** | 12 agent-accessible tools |
| **Spatial Input Sources** | 8 (deviceTilt, mouse, gyroscope, gamepad, perspective, programmatic, audio, MIDI) |
| **Spatial Profiles** | 6 built-in (cardTilt, wearablePerspective, gameAsset, vjAudioSpatial, uiElement, immersiveXR) |
| **Creative Effects** | 14 post-processing effects, 22 color presets, 14 easing functions |
| **Platform Integrations** | 7 (React, Vue, Svelte, Figma, Three.js, TouchDesigner, OBS) |
| **Advanced Modules** | 5 (WebXR, WebGPU Compute, MIDI, AI Presets, OffscreenWorker) |
| **Test Coverage** | 694+ tests passing |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      VIB3+ SDK Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   MCP Server │  │  Agent CLI   │  │  Telemetry   │           │
│  │   (12 tools) │  │   (JSONL)    │  │  (Prometheus)│           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    VIB3Engine                            │    │
│  │  - System switching (quantum/faceted/holographic/poly)   │    │
│  │  - Parameter management (ParameterManager)               │    │
│  │  - Canvas orchestration (CanvasManager)                  │    │
│  └─────────────────────────┬───────────────────────────────┘    │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              RendererLifecycleManager                    │    │
│  │  - Renderer registration and activation                  │    │
│  │  - Context transitions                                   │    │
│  │  - Contract enforcement                                  │    │
│  └──────┬──────────┬──────────┬──────────┬─────────────────┘    │
│         ▼          ▼          ▼          ▼                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Quantum  │ │ Faceted  │ │Holograph │ │Polychora │            │
│  │ Adapter  │ │ Adapter  │ │ Adapter  │ │ Adapter  │            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│       ▼            ▼            ▼            ▼                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Quantum  │ │ Faceted  │ │  Holo    │ │Polychora │            │
│  │ Engine   │ │ System   │ │ System   │ │ System   │            │
│  │ (588 LOC)│ │(~400 LOC)│ │(652 LOC) │ │(1065 LOC)│            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│       │            │            │            │                   │
│       └────────────┴────────────┴────────────┘                   │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              5-Layer Canvas System                       │    │
│  │  [background] [shadow] [content] [highlight] [accent]    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              WebGL / WebGPU Backend                      │    │
│  │  - Resource tracking (UnifiedResourceManager)            │    │
│  │  - Command buffers (RenderCommandBuffer)                 │    │
│  │  - Shader programs (ShaderProgram.js)                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## The 4 Visualization Systems

### 1. Quantum Engine
**File:** `src/quantum/QuantumEngine.js` (588 LOC)
**Purpose:** Complex quantum lattice visualizations with 24 geometry variants

| Property | Value |
|----------|-------|
| Canvas IDs | `quantum-background-canvas`, `quantum-shadow-canvas`, `quantum-content-canvas`, `quantum-highlight-canvas`, `quantum-accent-canvas` |
| Geometries | 24 (8 base × 3 cores) |
| Audio Reactive | Yes |
| Physics | No |

**Core Features:**
- Uses `QuantumHolographicVisualizer` for rendering
- Full 6D rotation support in shader
- `warpHypersphereCore()` and `warpHypertetraCore()` for geometry variants

### 2. Faceted System
**File:** `src/faceted/FacetedSystem.js`
**Purpose:** Clean 2D geometric patterns with 4D rotation projection

| Property | Value |
|----------|-------|
| Canvas IDs | `background-canvas`, `shadow-canvas`, `content-canvas`, `highlight-canvas`, `accent-canvas` |
| Geometries | 24 (8 base × 3 cores) |
| Audio Reactive | Yes (bass/mid/high uniforms — wired in v2.0.0) |
| Color Control | Full HSL (hue + saturation via `hsl2rgb()` — wired in v2.0.0) |
| Physics | No |

**Core Features:**
- Single WebGL context on `content-canvas`
- Geometry functions in fragment shader
- Core warp applied via `applyCoreWarp()` shader function
- Full `hsl2rgb()` color pipeline with saturation control (v2.0.0)
- Audio-reactive density/morph/hue shift (v2.0.0)
- Click intensity boost (v2.0.0)

### 3. Holographic System
**File:** `src/holograms/RealHolographicSystem.js` (652 LOC)
**Purpose:** 5-layer audio-reactive holographic effects

| Property | Value |
|----------|-------|
| Canvas IDs | `holo-background-canvas`, `holo-shadow-canvas`, `holo-content-canvas`, `holo-highlight-canvas`, `holo-accent-canvas` |
| Variants | 30 named variants |
| Audio Reactive | Yes (native) |
| Physics | No |

**Core Features:**
- Each layer has its own `HolographicVisualizer` instance
- Native microphone input for audio reactivity
- Beat detection (bass), melody detection (mid/high)
- Per-layer reactivity multipliers

### 4. Polychora System (ARCHIVED - TBD)

> **Status:** This system is archived and not production-ready. Files are located in `archive/polychora/`.

**File:** `archive/polychora/PolychoraSystem.js` (1065 LOC)
**Purpose:** 4D polytope visualization with glassmorphic effects (planned)

| Property | Value |
|----------|-------|
| Status | **ARCHIVED / TBD** |
| Canvas IDs | `polychora-*-canvas` (5 layers) |
| Polytopes | 6 planned (5-Cell, Tesseract, 16-Cell, 24-Cell, 600-Cell, 120-Cell) |
| Audio Reactive | Planned |
| Physics | Planned (`Polychora4DPhysics.js` in archive) |

**Planned Features (not yet production-ready):**
- 4D polytope distance functions in shader
- Complete 6D rotation matrices
- Advanced glass effects (refraction, chromatic aberration)
- 4D physics simulation

---

## The 24 Geometry System

### Encoding Formula
```
geometry_index = core_index * 8 + base_index

Where:
- core_index: 0 (Base), 1 (Hypersphere), 2 (Hypertetrahedron)
- base_index: 0-7 (one of 8 base geometries)
```

### Base Geometries (base_index 0-7)
| Index | Name | Description |
|-------|------|-------------|
| 0 | Tetrahedron | Simple 4-vertex lattice, fundamental polytope |
| 1 | Hypercube | 4D cube projection with 16 vertices, 32 edges |
| 2 | Sphere | Radial harmonic sphere with smooth surfaces |
| 3 | Torus | Toroidal field with continuous surface |
| 4 | Klein Bottle | Non-orientable surface with topological twist |
| 5 | Fractal | Recursive subdivision with self-similar structure |
| 6 | Wave | Sinusoidal interference patterns |
| 7 | Crystal | Octahedral crystal lattice structure |

### Core Warp Types (core_index 0-2)
| Index | Name | Effect |
|-------|------|--------|
| 0 | Base | Pure geometry, no warp applied |
| 1 | Hypersphere | Wraps base in 4D sphere using `warpHypersphereCore()` |
| 2 | Hypertetrahedron | Wraps base in 4D tetrahedron using `warpHypertetraCore()` |

### Full Geometry Table
| Index | Base | Core | Full Name |
|-------|------|------|-----------|
| 0-7 | 0-7 | Base | Tetrahedron, Hypercube, Sphere, Torus, Klein, Fractal, Wave, Crystal |
| 8-15 | 0-7 | Hypersphere | Hypersphere(Tetrahedron), Hypersphere(Hypercube), ... |
| 16-23 | 0-7 | Hypertetrahedron | Hypertetra(Tetrahedron), Hypertetra(Hypercube), ... |

---

## The 6D Rotation System

### Rotation Planes

| Plane | Axes | Type | Parameter |
|-------|------|------|-----------|
| XY | X ↔ Y | 3D Space | `rot4dXY` |
| XZ | X ↔ Z | 3D Space | `rot4dXZ` |
| YZ | Y ↔ Z | 3D Space | `rot4dYZ` |
| XW | X ↔ W | 4D Hyperspace | `rot4dXW` |
| YW | Y ↔ W | 4D Hyperspace | `rot4dYW` |
| ZW | Z ↔ W | 4D Hyperspace | `rot4dZW` |

### Application Order
Rotations are applied sequentially in shaders:
1. XY (3D)
2. XZ (3D)
3. YZ (3D)
4. XW (4D)
5. YW (4D)
6. ZW (4D)

### Parameter Range
All rotation parameters: `-6.28` to `6.28` (radians, ±2π)

---

## MCP Server & Agent Tools

### Available Tools (12 total)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_4d_visualization` | Create new visualization scene | `system`, `geometry_index`, `projection` |
| `set_rotation` | Set 6D rotation values | `XY`, `XZ`, `YZ`, `XW`, `YW`, `ZW` |
| `set_visual_parameters` | Set visual properties | Any parameter object |
| `switch_system` | Change visualization system | `system` |
| `change_geometry` | Change geometry type | `geometry_index` OR `base_type` + `core_type` |
| `get_state` | Get current engine state | (none) |
| `randomize_parameters` | Randomize all parameters | (none) |
| `reset_parameters` | Reset to defaults | (none) |
| `save_to_gallery` | Save to gallery slot | `slot`, `name` |
| `load_from_gallery` | Load from gallery slot | `slot` |
| `search_geometries` | Search available geometries | `core_type` |
| `get_parameter_schema` | Get parameter validation schema | (none) |

### Tool Response Format
```json
{
  "success": true,
  "operation": "tool_name",
  "timestamp": "2026-01-24T12:00:00.000Z",
  "duration_ms": 5.2,
  "suggested_next_actions": ["next_tool_1", "next_tool_2"],
  ...tool_specific_data
}
```

---

## Agent CLI Commands

### Command Types
| Command | Description |
|---------|-------------|
| `ping` | Health check |
| `status` | Get engine status |
| `help` | List available commands |
| `quit` / `exit` | Stop CLI |
| `set <param> <value>` | Set parameter value |
| `get <param>` | Get parameter value |
| `rotate <plane> <angle>` | Rotate on plane |
| `geometry <index>` | Set geometry (0-23) |
| `system <name>` | Switch system |
| `metrics` | Get telemetry metrics |

### Input/Output Formats
- **JSONL** (default): One JSON object per line
- **JSON**: Pretty-printed JSON
- **Text**: Human-readable text

---

## Renderer Contracts

### RendererContract Interface
```javascript
class RendererContract {
  init(context)                    // Initialize with WebGL/WebGPU context
  resize(width, height, pixelRatio) // Handle viewport changes
  render(frameState)               // Main render loop
  setActive(active)                // Activate/deactivate renderer
  dispose()                        // Clean up GPU resources
}
```

### ResourceManagerContract Interface
```javascript
class ResourceManagerContract {
  registerResource(type, id, resource, bytes) // Track GPU resource
  releaseResource(type, id)                   // Free GPU resource
  disposeAll()                                // Clean all resources
  getStats()                                  // Memory usage telemetry
}
```

---

## File Structure Summary

```
/home/user/Vib3-CORE-Documented01-/
├── src/                          # Core SDK (~72,000+ LOC)
│   ├── core/                     # Engine orchestration
│   │   ├── VIB3Engine.js         # Main unified engine (+ SpatialInput)
│   │   ├── RendererContracts.js  # Shared interfaces
│   │   └── renderers/            # System adapters
│   ├── quantum/                  # Quantum visualization
│   ├── faceted/                  # Faceted visualization (+ audio/saturation)
│   ├── holograms/                # Holographic visualization
│   ├── geometry/                 # 24-geometry system
│   ├── math/                     # 4D math utilities
│   ├── render/                   # Rendering pipeline
│   ├── scene/                    # Scene graph
│   ├── agent/                    # MCP/CLI/Telemetry
│   ├── export/                   # Export generators
│   ├── wasm/                     # WASM loader
│   ├── reactivity/               # Reactivity + SpatialInputSystem (v2.0.0)
│   ├── creative/                 # Creative tooling (v2.0.0)
│   ├── integrations/             # Platform integrations (v2.0.0)
│   └── advanced/                 # Advanced features (v2.0.0)
├── tools/                        # Tooling (+ shader-sync-verify.js)
├── cpp/                          # C++ math core (1,783 LOC)
├── js/                           # Client-side integration
├── tests/                        # Test suite (60 files)
├── DOCS/                         # Documentation
└── types/                        # TypeScript definitions
```

---

## Agent Onboarding Quiz

Before proceeding with development tasks, verify understanding by answering these questions:

### Required Knowledge Check

**Q1: How many rotation planes does the system support?**
Expected: 6 (XY, XZ, YZ for 3D; XW, YW, ZW for 4D)

**Q2: What is the geometry encoding formula?**
Expected: `geometry = coreIndex * 8 + baseIndex`

**Q3: How many canvas layers does each visualization system use?**
Expected: 5 (background, shadow, content, highlight, accent)

**Q4: What are the active visualization systems?**
Expected: 3 active (Quantum, Faceted, Holographic) + 1 archived (Polychora - TBD)

**Q5: What are the 3 core warp types?**
Expected: Base (0), Hypersphere (1), Hypertetrahedron (2)

**Q6: What are the 8 base geometry types?**
Expected: Tetrahedron, Hypercube, Sphere, Torus, Klein Bottle, Fractal, Wave, Crystal

**Q7: Which system has 4D physics support?**
Expected: Polychora (archived/TBD - not production-ready)

**Q8: What MCP tool changes the geometry?**
Expected: `change_geometry`

### If answers are incomplete:
- Review this document
- Check `DOCS/CONTROL_REFERENCE.md` for parameter details
- Read `src/agent/mcp/tools.js` for MCP tool definitions

---

## Current Development Status

### Phase Status (as of v2.0.0, 2026-01-30)
| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | ✅ Complete | Math, geometry, parameters |
| Phase 2: Rendering | ✅ Mostly Complete | Contracts exist, adapters implemented |
| Phase 3: Agentic | ✅ Complete | MCP, CLI, Telemetry working |
| Phase 4: WebGPU | 🔄 In Progress | Scaffold exists, needs shader pipeline |
| Phase 5: Hardening | ✅ Complete | 694 tests passing, XSS prevention, input validation |
| **Phase A: Parity & Polish** | **✅ Complete** | Quantum color, Faceted saturation/audio, clickIntensity fix, shader sync tool |
| **Phase B: Creative Tooling** | **✅ Complete** | Color presets, transitions, post-processing, timeline |
| **Phase C: Platform Integrations** | **✅ Complete** | React, Vue, Svelte, Figma, Three.js, TouchDesigner, OBS |
| **Phase D: Advanced** | **✅ Complete** | WebXR, WebGPU compute, MIDI, AI presets, OffscreenWorker |
| **SpatialInputSystem** | **✅ Complete** | 8 source types, 6 profiles, integrated into VIB3Engine |

### v2.0.0 Bugs Fixed
1. ~~`clickIntensity` uniform mapped to `u_mouseIntensity`~~ → Fixed (QuantumVisualizer.js:792)
2. ~~Faceted system missing saturation control~~ → Fixed (hsl2rgb + u_saturation uniform)
3. ~~Faceted system missing audio reactivity~~ → Fixed (bass/mid/high uniforms wired)
4. ~~Inline shaders can drift from external files~~ → Mitigated (shader-sync-verify.js tooling)

### Remaining Gaps
1. WebGPU backend needs full shader pipeline
2. Some systems don't fully implement RendererContract
3. New v2.0.0 modules need test coverage

---

## Cross-Platform Support

| Platform | Status | Implementation |
|----------|--------|----------------|
| Web (Browser) | ✅ Production | index.html + JS modules |
| WASM | ✅ Working | cpp/ → Emscripten → vib3.wasm |
| Flutter | 🔄 Scaffold | src/platforms/flutter/ |
| Node.js CLI | ✅ Working | src/agent/cli/ |
| React | ✅ Component (v2.0.0) | src/integrations/frameworks/Vib3React.js |
| Vue 3 | ✅ Component (v2.0.0) | src/integrations/frameworks/Vib3Vue.js |
| Svelte | ✅ Component (v2.0.0) | src/integrations/frameworks/Vib3Svelte.js |
| Three.js | ✅ ShaderMaterial (v2.0.0) | src/integrations/ThreeJsPackage.js |
| Figma | ✅ Plugin (v2.0.0) | src/integrations/FigmaPlugin.js |
| TouchDesigner | ✅ GLSL Export (v2.0.0) | src/integrations/TouchDesignerExport.js |
| OBS Studio | ✅ Browser Source (v2.0.0) | src/integrations/OBSMode.js |
| WebXR (VR/AR) | ✅ Renderer (v2.0.0) | src/advanced/WebXRRenderer.js |

---

## v2.0.0 New Systems

### SpatialInputSystem (`src/reactivity/SpatialInputSystem.js` — 1,783 lines)
Universal spatial input that decouples "card tilting" from physical device orientation. Any input source maps through a normalized spatial state (pitch/yaw/roll/x/y/z/intensity/velocity) to any visualization parameter.

- **8 input sources**: deviceTilt, mousePosition, gyroscope, gamepad, perspective, programmatic, audio, midi
- **6 built-in profiles**: cardTilt, wearablePerspective, gameAsset, vjAudioSpatial, uiElement, immersiveXR
- **Per-axis lerp smoothing**, dramatic mode (8x), sensitivity control
- **Full serialization** (exportConfig/importConfig)
- **Integrated into VIB3Engine** with 7 new methods

### Creative Tooling (`src/creative/` — 3,837 lines)
| Module | Lines | Purpose |
|--------|-------|---------|
| ColorPresetsSystem.js | 980 | 22 themed presets (Ocean, Lava, Neon, Monochrome, etc.) |
| TransitionAnimator.js | 683 | 14 easing functions, smooth state interpolation, sequencing |
| PostProcessingPipeline.js | 1,113 | 14 composable effects (bloom, chromatic aberration, vignette, etc.), 7 preset chains |
| ParameterTimeline.js | 1,061 | Keyframe animation with BPM sync for music-driven sequences |

### Platform Integrations (`src/integrations/` — 4,693 lines)
| Module | Lines | Purpose |
|--------|-------|---------|
| frameworks/Vib3React.js | 591 | `<Vib3Canvas>` React component + `useVib3()` hook |
| frameworks/Vib3Vue.js | 628 | Vue 3 component + composable |
| frameworks/Vib3Svelte.js | 654 | Svelte component + store |
| FigmaPlugin.js | 854 | Figma plugin manifest, code generator, and UI |
| ThreeJsPackage.js | 660 | Three.js ShaderMaterial with 4D rotation uniforms |
| TouchDesignerExport.js | 552 | GLSL TOP export for TouchDesigner |
| OBSMode.js | 754 | Transparent background + OBS browser source mode |

### Advanced Features (`src/advanced/` — 4,262 lines)
| Module | Lines | Purpose |
|--------|-------|---------|
| WebXRRenderer.js | 680 | WebXR VR/AR with 6DOF spatial extraction |
| WebGPUCompute.js | 1,051 | WGSL particle simulation + audio FFT compute shaders |
| MIDIController.js | 703 | Web MIDI API with learn mode and CC mapping |
| AIPresetGenerator.js | 777 | Text-to-preset via LLM + mutation/crossbreeding algorithms |
| OffscreenWorker.js | 1,051 | OffscreenCanvas worker rendering + SharedArrayBuffer |

### Shader Sync Tool (`tools/shader-sync-verify.js` — 937 lines)
Verifies inline shaders match external shader files. Parses GLSL uniforms and WGSL struct fields, compares across all 3 systems, produces color-coded console reports.

---

## Next Steps for Development

### Immediate Priorities
1. Add test coverage for v2.0.0 modules (creative, integrations, advanced, SpatialInput)
2. Complete WebGPU shader pipeline
3. Production-harden platform integration wrappers
4. Publish @vib3/sdk v2.0.0 to NPM

### Consolidation Tasks
- [ ] Audit RendererContract compliance for all 3 active systems
- [ ] Write integration tests for SpatialInputSystem profiles
- [ ] Add E2E tests for creative tooling (transitions, post-processing)
- [ ] Verify framework components (React, Vue, Svelte) with sample apps
- [ ] Document lifecycle rules in code comments

---

## Document References

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Development instructions (v2.0.0 updated) |
| `DEV_TRACK.md` | Session-by-session progress |
| `DOCS/CLI_ONBOARDING.md` | Agent CLI setup |
| `DOCS/CONTROL_REFERENCE.md` | UI control parameters |
| `DOCS/RENDERER_LIFECYCLE.md` | Renderer architecture |
| `DOCS/GPU_DISPOSAL_GUIDE.md` | Memory management |
| `DOCS/SYSTEM_AUDIT_2026-01-30.md` | Full system audit (v2.0.0 updated) |
| `24-GEOMETRY-6D-ROTATION-SUMMARY.md` | Geometry encoding |

---

*This document is the canonical system inventory. Update after significant changes.*
*Last major update: v2.0.0 — 2026-01-30*
