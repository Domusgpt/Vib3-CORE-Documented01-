# Changelog

All notable changes to VIB3+ CORE (`@vib3code/sdk`) will be documented in this file.

## [2.0.0] — 2026-01-30

### Added

#### SpatialInputSystem (`src/reactivity/SpatialInputSystem.js` — 1,783 lines)
- Universal spatial input system decoupling "card tilting" from physical device orientation
- 8 input source types: deviceTilt, mousePosition, gyroscope, gamepad, perspective, programmatic, audio, MIDI
- 6 built-in profiles: cardTilt, wearablePerspective, gameAsset, vjAudioSpatial, uiElement, immersiveXR
- Full serialization (exportConfig/importConfig)
- Integrated into VIB3Engine with 7 new methods

#### Creative Tooling (3,837 lines)
- `ColorPresetsSystem.js` — 22 themed color presets (Ocean, Lava, Neon, Monochrome, etc.) with group parameter application
- `TransitionAnimator.js` — 14 easing functions with smooth state interpolation and sequencing
- `PostProcessingPipeline.js` — 14 composable effects (bloom, chromatic aberration, vignette, film grain, etc.) with 7 preset chains
- `ParameterTimeline.js` — Keyframe-based parameter animation with BPM sync for music-driven sequences

#### Platform Integrations (4,693 lines)
- `Vib3React.js` — `<Vib3Canvas>` React component + `useVib3()` hook
- `Vib3Vue.js` — Vue 3 component + composable
- `Vib3Svelte.js` — Svelte component + store
- `FigmaPlugin.js` — Figma plugin manifest, code, and UI generator
- `ThreeJsPackage.js` — Three.js ShaderMaterial wrapper with 4D rotation uniforms
- `TouchDesignerExport.js` — GLSL TOP export for TouchDesigner
- `OBSMode.js` — Transparent background + OBS browser source mode

#### Advanced Features (4,262 lines)
- `WebXRRenderer.js` — WebXR VR/AR rendering with 6DOF spatial extraction
- `WebGPUCompute.js` — WGSL particle simulation + audio FFT compute shaders
- `MIDIController.js` — Web MIDI API with learn mode and CC mapping
- `AIPresetGenerator.js` — Text-to-preset via LLM + mutation/crossbreeding
- `OffscreenWorker.js` — OffscreenCanvas worker rendering + SharedArrayBuffer

#### Tooling
- `shader-sync-verify.js` — 937-line tool verifying inline shaders match external shader files across all 3 systems

### Fixed
- Quantum system color control restored — `u_hue` and `u_saturation` now drive actual HSL color output (was using hardcoded palettes)
- Faceted system saturation wired — full `hsl2rgb()` pipeline added to GLSL + WGSL shaders
- Faceted system audio reactivity wired — `u_bass`, `u_mid`, `u_high` uniforms now drive density/morph/hue
- `clickIntensity` uniform bug fixed — was mapping to `u_mouseIntensity`, now correctly maps to `u_clickIntensity`

---

## [1.0.0] — 2025-12-15

### Added

#### Core Engine
- `VIB3Engine.js` — Main orchestrator for 3 visualization systems
- `CanvasManager.js` — Canvas lifecycle management with multi-layer support
- `Parameters.js` — Parameter definitions with validation and ranges
- `ParameterMapper.js` — Parameter-to-uniform mapping across systems
- `RendererContracts.js` — Interface contracts for renderer adapters

#### Visualization Systems
- **Quantum** (`QuantumEngine.js`, `QuantumVisualizer.js`) — Complex lattice visualizations with quantum-inspired patterns, 24 geometry variants, 5-layer rendering
- **Faceted** (`FacetedSystem.js`) — Clean 2D geometric patterns with 4D rotation projection, 24 geometry variants
- **Holographic** (`RealHolographicSystem.js`, `HolographicVisualizer.js`) — 5-layer glassmorphic audio-reactive effects

#### C++ WASM Core (3,072 lines)
- `Rotor4D` — Clifford algebra Cl(4,0) 4D rotation via sandwich product
- `Mat4x4` — Column-major 4x4 matrix operations
- `Vec4` — 4-component vector operations
- 3 projection modes: perspective, stereographic, orthographic
- Emscripten bindings via `embind.cpp`
- JavaScript math fallback (`src/math/`) for environments without WASM

#### Render Infrastructure (8,400 lines)
- Dual GPU backends: WebGL 2.0 (primary) + WebGPU (secondary)
- `UnifiedRenderBridge` — Cross-backend abstraction with automatic fallback
- `ShaderProgram`, `RenderState`, `CommandBuffer`, `RenderTarget`, `RenderResourceRegistry`
- Multi-canvas coordination via `MultiCanvasBridge`
- External shader files (GLSL + WGSL) for all 3 systems

#### 24-Geometry System
- 8 base geometries: Tetrahedron, Hypercube, Sphere, Torus, Klein Bottle, Fractal, Wave, Crystal
- 3 core type warps: Base (0-7), Hypersphere (8-15), Hypertetrahedron (16-23)
- Encoding: `index = core_type * 8 + base_geometry`

#### 6D Rotation System
- 6 rotation planes: XY, XZ, YZ (3D) + XW, YW, ZW (4D)
- 3 implementations: WASM Rotor (Clifford algebra), GLSL matrices, WGSL matrices

#### Reactivity
- `ReactivityManager` — Audio, tilt, and interaction reactivity
- `ReactivityConfig` — Serializable configuration with validation
- Audio reactivity (bass/mid/high bands with configurable targets)
- Device tilt with dramatic mode
- Mouse, click, scroll, and touch interaction

#### Export System (15,136 lines)
- VIB3Package (JSON state), SVG, CSS animations, Lottie, Shader source
- Trading card generator with system-specific renderers (Quantum, Faceted, Holographic)

#### MCP Agentic Control
- `MCPServer.js` — Full MCP protocol server with 14 tools
- `AgentCLI.js` — Command-line interface
- Telemetry service with OpenTelemetry-compatible events, spans, and exporters

#### Scene & Resource Management
- `Scene4D` / `Node4D` — 4D scene graph
- `ResourceManager`, `MemoryPool`, `Disposable` — Lifecycle management

#### Testing & CI/CD
- 34 test files (10,000+ lines) — unit, E2E, visual regression
- Playwright E2E with 69 browser tests
- 6 CI/CD workflows: Pages deploy, benchmarks, exports, GPU visual tests, Flutter builds

#### Cross-Platform
- Browser (Vite-served)
- CLI (`vib3` binary)
- Flutter plugin (iOS + Android + Web)
- GitHub Pages (26 HTML pages)
