# VIB3+ SDK Development Log

**Project**: VIB3+ Unified Visualization SDK with C++ Core
**Branch**: `claude/refactor-swarm-agent-2Bx4M`
**Started**: 2026-01-08

---

## Session Log

### Session 1: 2026-01-08

**Objective**: Initial architecture planning and schema implementation

#### 16:00 - Project Analysis

Analyzed current codebase structure:
- **Core Engine**: `src/core/VIB3Engine.js` - Unified system coordinator
- **Parameters**: `src/core/Parameters.js` - 6D rotation + visual params
- **Geometry**: `src/geometry/GeometryLibrary.js` - 8 base geometries
- **Visualization Systems**: Quantum, Faceted, Holographic (24 geoms each)
- **LLM Interface**: Gemini-based natural language to parameters

Identified gaps from strategic blueprint:
- No telemetry/event system
- No JSON schemas for API validation
- No MCP server for agentic integration
- No CLI with JSON output
- Package exports need tree-shaking support

#### 16:30 - Schema Implementation

Created JSON schemas following agentic API design patterns:

**Files Created**:
1. `src/schemas/parameters.schema.json` - Full 6D rotation + visual params
2. `src/schemas/tool-response.schema.json` - Semantic return values with `suggested_next_actions`
3. `src/schemas/error.schema.json` - Actionable errors with `suggestion` field
4. `src/schemas/index.js` - AJV-based validation with normalize/flatten helpers

**Key Design Decisions**:
- Nested parameter structure for schemas (`rotation.XW` not `rot4dXW`)
- Bidirectional normalization (flat <-> nested) for engine compatibility
- Error schema includes `retry_possible` and `retry_after_ms` for agents

#### 17:00 - Architecture Planning

Created two architecture documents:
1. `REFACTORING_PLAN.md` - JavaScript/TypeScript refactoring roadmap
2. `CPP_CORE_ARCHITECTURE.md` - C++ core with WASM/FFI strategy

**C++ Core Strategy** (following Rive pattern):
- C++ core with SIMD optimization
- Emscripten -> WebAssembly for web
- FFI bindings for Flutter/native
- Protobuf schemas for cross-language types
- Command batching to minimize FFI overhead

---

### Session 2: 2026-01-08 (continued)

**Objective**: Phase 0 - Mathematical Foundation Implementation

#### Implementation - Math Module

Created complete 4D mathematics library in `src/math/`:

**Core Classes**:
1. `Vec4.js` - 4D vector with Float32Array for GPU compatibility
   - All standard operations (add, sub, scale, dot, normalize)
   - Projection methods (perspective, stereographic, orthographic)
   - Static factories (zero, unitX/Y/Z/W, randomUnit)

2. `Rotor4D.js` - 8-component rotor for proper 4D rotations
   - Scalar + 6 bivectors (XY, XZ, YZ, XW, YW, ZW) + pseudoscalar
   - `fromPlaneAngle()` for single-plane rotations
   - `fromEuler6()` for combined 6-angle rotations
   - `multiply()` for rotor composition
   - `rotate()` applies rotation to Vec4
   - `slerp()` for smooth interpolation
   - `toMatrix()` converts to 4x4 rotation matrix

3. `Mat4x4.js` - 4x4 matrix in column-major layout
   - All 6 rotation matrices: `rotationXY/XZ/YZ/XW/YW/ZW`
   - `rotationFromAngles()` composes all 6 rotations
   - `multiplyVec4()` transforms vectors
   - `inverse()`, `determinant()`, `transpose()`
   - `isOrthogonal()` validation

4. `Projection.js` - 4D to 3D projection functions
   - `perspective(v, d)` - standard 4D perspective
   - `stereographic(v)` - conformal hypersphere projection
   - `orthographic(v)` - parallel projection
   - `oblique(v, shear)` - cavalier-style projection
   - `SliceProjection` - cross-sectional slicing

5. `constants.js` - Mathematical constants and utilities
   - Polytope vertex/edge/face counts
   - Geometry encoding: `encodeGeometry(base, core)`
   - Plane indices and names
   - Utility functions (clamp, lerp, smoothstep)

**Unit Tests** (4 test files):
- `tests/math/Vec4.test.js` - 20+ tests
- `tests/math/Rotor4D.test.js` - 25+ tests
- `tests/math/Mat4x4.test.js` - 20+ tests
- `tests/math/Projection.test.js` - 15+ tests

**Key Implementation Notes**:
- Rotor multiplication follows geometric algebra product rules
- Matrix layout is column-major for direct WebGL uniform upload
- Projection handles singularities gracefully (returns large but finite values)
- Rotor `normalize()` should be called every frame to prevent drift

---

## Development Phases

### Phase 0: Mathematical Foundation
**Status**: COMPLETE ✅
**Completed**: 2026-01-08

- [x] Implement `Vec4` class with SIMD-ready Float32Array
- [x] Implement `Rotor4D` class (8 components, not quaternions)
- [x] Implement `Mat4x4` with GPU-friendly column-major layout
- [x] All 6 rotation plane matrices (XY, XZ, YZ, XW, YW, ZW)
- [x] Stereographic projection: `X = x/(1-w)`
- [x] Perspective projection: `X = x/(d-w)`
- [x] Orthographic and oblique projections
- [x] SliceProjection for 4D cross-sections
- [x] Unit tests for Vec4, Rotor4D, Mat4x4, Projection
- [x] Constants module with geometry encoding helpers

**Validation Results**:
- Rotor normalization drift < 1e-5 after 100 multiplications ✓
- Projection singularity handling with large but finite fallback ✓
- All rotation matrices are orthogonal with determinant 1 ✓

### Phase 1: Geometry Core
**Status**: COMPLETE ✅
**Completed**: 2026-01-08

- [x] 8 base geometry generators
- [x] `warpHypersphereCore()` function
- [x] `warpHypertetraCore()` function
- [x] Geometry encoding: `geometry = coreIndex * 8 + baseIndex`
- [x] Buffer generation for WebGL
- [x] GeometryFactory with caching
- [x] Unit tests for all generators and warp functions

**Base Geometries Created**:
- `Tesseract.js` - 16 vertices, 32 edges hypercube
- `Tetrahedron.js` - 5-cell (pentatope) with lattice generator
- `Sphere.js` - Hypersphere with Fibonacci distribution
- `Torus.js` - Clifford torus on S³
- `KleinBottle.js` - Non-orientable 4D surface
- `Fractal.js` - Sierpinski, Menger, tree, Cantor dust
- `Wave.js` - Standing waves, interference, helices
- `Crystal.js` - 16-cell, 24-cell, quasicrystals

**Core Warp Functions**:
- `warpHypersphereCore()` - Radial, stereographic, Hopf fibration methods
- `warpHypertetraCore()` - Tetrahedral, edge, cell projection methods

### Phase 2: Scene Graph & Resources
**Status**: COMPLETE ✅
**Completed**: 2026-01-08

- [x] `Scene4D` container
- [x] `Node4D` hierarchy with transform management
- [x] `ResourceManager` with reference counting
- [x] Memory pool allocators (ObjectPool, TypedArrayPool, Vec4Pool, Mat4x4Pool)
- [x] Cascade disposal system with dependency tracking
- [x] Unit tests for all components

**Scene Graph Components**:
- `Node4D.js` - Transform hierarchy with local/world matrices
- `Scene4D.js` - Scene container with traversal and queries
- `ResourceManager.js` - Reference-counted resource management
- `MemoryPool.js` - Object pooling for performance
- `Disposable.js` - Cascade disposal with dependencies

### Phase 3: Render Abstraction
**Status**: COMPLETE ✅
**Completed**: 2026-01-09

- [x] `RenderState` - GPU state management (blend, depth, stencil, rasterizer)
- [x] `RenderCommand` hierarchy (Clear, Draw, DrawIndexed, SetState, etc.)
- [x] `CommandBuffer` batching with state/depth sorting
- [x] `RenderTarget` abstraction with MRT support
- [x] `ShaderProgram` with 4D shader library
- [x] `WebGLBackend` - WebGL 2.0 implementation
- [x] Unit tests for all components

### Phase 4: WebAssembly Backend
**Status**: PLANNED
**Timeline**: Weeks 17-20

- [ ] Emscripten configuration
- [ ] WebGL 2.0 backend
- [ ] JavaScript bindings
- [ ] TypeScript definitions

### Phase 5: Flutter/Native Backends
**Status**: PLANNED
**Timeline**: Weeks 21-24

- [ ] FFI with command batching
- [ ] Flutter Texture integration
- [ ] Metal backend (macOS/iOS)
- [ ] Vulkan backend (Android/Linux/Windows)

### Phase 6: Agentic Integration
**Status**: IN PROGRESS (JS implementation first)
**Timeline**: Weeks 25-28

- [x] JSON schemas for parameters/responses/errors
- [ ] OpenTelemetry service
- [ ] MCP server with tool definitions
- [ ] CLI with JSON output mode

---

## Immediate Next Steps (This Session)

1. ~~Create JSON schemas~~ DONE
2. ~~Create telemetry service with OpenTelemetry~~ DONE
3. ~~Create MCP server skeleton~~ DONE
4. ~~Update package.json exports~~ DONE
5. ~~Add CLI with JSON output mode~~ DONE
6. Commit and push

---

## Session 1 Completed Work (2026-01-08)

### Files Created

**Architecture & Documentation:**
- `REFACTORING_PLAN.md` - JavaScript/TypeScript refactoring roadmap
- `CPP_CORE_ARCHITECTURE.md` - C++ core strategy with 6 phases
- `DEVLOG.md` - This ongoing development log

**JSON Schemas (`src/schemas/`):**
- `parameters.schema.json` - Full 6D rotation + visual params with nested structure
- `tool-response.schema.json` - Semantic responses with `suggested_next_actions`
- `error.schema.json` - Actionable errors with `suggestion` field
- `index.js` - AJV-based validator with normalize/flatten helpers

**Telemetry (`src/agent/telemetry/`):**
- `TelemetryService.js` - OpenTelemetry-compatible tracing
- `index.js` - Module exports

**MCP Server (`src/agent/mcp/`):**
- `tools.js` - 12 workflow-oriented tool definitions
- `MCPServer.js` - Full MCP implementation
- `index.js` - Module exports

**Agent Module (`src/agent/`):**
- `index.js` - Unified agent exports

**CLI (`src/cli/`):**
- `index.js` - Agent-friendly CLI with `--json` output

### Package.json Updates

- Renamed to `@vib3/sdk`
- Version bumped to `1.1.0`
- Added `bin.vib3` for CLI
- Added `sideEffects: false` for tree-shaking
- Added 15+ new exports:
  - `./agent` - Telemetry + MCP
  - `./agent/telemetry` - Telemetry only
  - `./agent/mcp` - MCP only
  - `./schemas` - Schema registry
  - `./cli` - CLI (node only)
  - `./quantum`, `./faceted`, `./holographic` - Individual systems

### Key Design Decisions

1. **Nested vs Flat Parameters**: Schemas use nested structure (`rotation.XW`) but engine uses flat (`rot4dXW`). Added bidirectional normalization.

2. **Tool Granularity**: Tools match workflows, not methods. Example: `create_4d_visualization` does full scene setup, not just `new Scene()`.

3. **Error Actionability**: Every error includes `suggestion` field and optional `retry_possible` flag for agent recovery.

4. **Progressive Disclosure**: MCP `listTools(false)` returns names+descriptions only. Full schemas on demand.

---

## Technical Notes

### Rotor vs Quaternion

Quaternions work for 3D rotations (4 components, 3 rotation planes).
4D requires rotors with 8 components:
- 1 scalar
- 6 bivectors (XY, XZ, YZ, XW, YW, ZW)
- 1 pseudoscalar (XYZW)

Never use 6 Euler angles - compose rotations via multiplication.

### GPU Matrix Format

For shaders, use 4x4 matrices per rotation plane:

```glsl
mat4 rotateXW(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat4(
        c, 0, 0, -s,
        0, 1, 0,  0,
        0, 0, 1,  0,
        s, 0, 0,  c
    );
}
```

Compose all 6 rotations: `R = Rxy * Rxz * Ryz * Rxw * Ryw * Rzw`

### Numerical Stability

Renormalize rotors every frame or after 10-100 operations:
```cpp
void Rotor4D::normalize() {
    float len = sqrt(s*s + xy*xy + xz*xz + yz*yz + xw*xw + yw*yw + zw*zw + xyzw*xyzw);
    s /= len; xy /= len; xz /= len; yz /= len;
    xw /= len; yw /= len; zw /= len; xyzw /= len;
}
```

---

## References

- **vib34d-vib3plus**: Quaternion SDK source
- **Manifestaengine-Vib3-1**: Agentic wrapper with telemetry
- **Rive Architecture**: C++ core + WASM + FFI pattern
- **Babylon.js**: Scoped package pattern
- **Three.js**: Tree-shaking exports

---

---

## Session 3: 2026-01-08 (Phase 1 Implementation)

**Objective**: Complete Geometry Core with 24-variant encoding system

### Files Created

**Geometry Generators (`src/geometry/generators/`):**
- `Tesseract.js` - 4D hypercube (16 vertices, 32 edges, 24 faces, 8 cells)
- `Tetrahedron.js` - 5-cell/pentatope and tetrahedron lattice
- `Sphere.js` - Hypersphere with Fibonacci and latitude-based distributions
- `Torus.js` - Clifford torus (on S³) and general 4D torus
- `KleinBottle.js` - Non-orientable surface with Möbius strip variant
- `Fractal.js` - Sierpinski pentatope, Menger hypersponge, 4D tree, Cantor dust
- `Wave.js` - Standing waves, interference, ripples, helices, plane/spherical waves
- `Crystal.js` - 16-cell, 24-cell, cubic/FCC lattices, quasicrystals

**Core Warp Functions (`src/geometry/warp/`):**
- `HypersphereCore.js` - Projects geometry onto 4D hypersphere
  - `projectToHypersphere()` - Radial projection
  - `stereographicToHypersphere()` - Inverse stereographic
  - `hopfFibration()` - Hopf fiber mapping
  - `warpHypersphereCore()` - Main warp function
- `HypertetraCore.js` - Projects geometry onto 5-cell (pentatope)
  - `warpTetrahedral()` - Barycentric interpolation
  - `warpToEdges()` - Edge snapping
  - `warpToCells()` - Cell projection
  - `warpHypertetraCore()` - Main warp function
- `index.js` - Unified exports

**Factory & Buffers:**
- `GeometryFactory.js` - Central factory with 24-variant encoding
  - `decodeGeometry(idx)` - Index to base+core indices
  - `encodeGeometry(base, core)` - Base+core to index
  - `generateGeometry(idx)` - Generate any of 24 variants
  - `GeometryFactory` class with caching
- `buffers/BufferBuilder.js` - WebGL buffer generation
  - `buildVertexBuffer()` - Vec4[] to Float32Array
  - `buildEdgeIndexBuffer()` - Edge pairs to Uint16/32Array
  - `buildFaceIndexBuffer()` - Faces with triangulation
  - `buildNormalBuffer()` - Face normals for lighting
  - `generateWDepthColors()` - W-coordinate based coloring
  - `buildGeometryBuffers()` - Complete buffer set

**Tests (`tests/geometry/`):**
- `GeometryFactory.test.js` - Encoding, naming, generation, factory class
- `generators.test.js` - All 8 base geometry generators
- `warp.test.js` - Both warp functions with all methods

### 24-Variant Encoding System

**Formula**: `geometryIndex = coreIndex * 8 + baseIndex`

| Base (0-7) | Core 0 | Core 1 (Hypersphere) | Core 2 (Hypertetra) |
|------------|--------|----------------------|---------------------|
| 0: tetrahedron | 0 | 8 | 16 |
| 1: hypercube | 1 | 9 | 17 |
| 2: sphere | 2 | 10 | 18 |
| 3: torus | 3 | 11 | 19 |
| 4: klein_bottle | 4 | 12 | 20 |
| 5: fractal | 5 | 13 | 21 |
| 6: wave | 6 | 14 | 22 |
| 7: crystal | 7 | 15 | 23 |

### Package.json Updates

- Version: `1.2.0` → `1.3.0`
- Added 12 new exports:
  - `./geometry` → `./src/geometry/index.js`
  - `./geometry/factory`
  - `./geometry/generators/*` (8 base types)
  - `./geometry/warp`, `./geometry/warp/hypersphere`, `./geometry/warp/hypertetra`
  - `./geometry/buffers`

---

## Session 4: 2026-01-08 (Phase 2 Implementation)

**Objective**: Complete Scene Graph & Resources system

### Files Created

**Scene Graph (`src/scene/`):**
- `Node4D.js` - 4D scene graph node with transform hierarchy
  - Parent-child relationships
  - Local/world transform matrices
  - Position, rotation (Rotor4D), scale
  - Traversal methods (depth-first, breadth-first, visible)
  - Tag and layer filtering
  - Serialization support
- `Scene4D.js` - Scene container
  - Root node management
  - Node lookup (by ID, name, tag, layer)
  - Update loop with callbacks
  - Spatial queries (sphere, box, nearest, raycast)
  - Statistics and serialization

**Resource Management:**
- `ResourceManager.js` - Reference-counted resources
  - Register/acquire/release pattern
  - Hash-based deduplication
  - Memory tracking and limits
  - Automatic garbage collection
  - Type-based queries
- `MemoryPool.js` - Object pooling
  - `ObjectPool` - Generic object pool
  - `TypedArrayPool` - Float32/Uint16/Uint32 pools
  - `Vec4Pool` - Vector pooling
  - `Mat4x4Pool` - Matrix pooling
  - `PoolManager` - Global pool coordinator

**Disposal System:**
- `Disposable.js` - Cascade disposal
  - Dependency tracking
  - Topological sort for disposal order
  - `CompositeDisposable` - Multiple children
  - `SerialDisposable` - Replace previous
  - `SingleAssignmentDisposable` - One-time set
  - `DisposalManager` - Global disposal coordinator

**Tests (`tests/scene/`):**
- `Node4D.test.js` - Transform, hierarchy, traversal, serialization
- `Scene4D.test.js` - Node management, queries, lifecycle
- `ResourceManager.test.js` - Reference counting, GC, memory limits
- `Disposable.test.js` - Dependencies, cascade, composites

### Key Features

**Transform System:**
```javascript
const node = new Node4D('player');
node.setPosition(1, 2, 3, 0);
node.rotateOnPlane('XW', Math.PI / 4);
node.setUniformScale(2);

const worldPos = node.worldPosition;
const localPoint = node.worldToLocal(targetPosition);
```

**Scene Queries:**
```javascript
const scene = new Scene4D('main');
scene.add(node);

// Find by position
const nearby = scene.findNodesInSphere(center, radius);
const nearest = scene.findNearestNode(point);

// Find by attributes
const enemies = scene.getNodesByTag('enemy');
const layer0 = scene.getNodesByLayer(0);
```

**Resource Management:**
```javascript
const resources = new ResourceManager();
resources.memoryLimit = 256 * 1024 * 1024;

const geo = resources.register('geo1', 'geometry', data, { size: 1024 });
resources.acquire('geo1'); // refCount++
resources.release('geo1'); // refCount--, dispose if 0
```

**Object Pooling:**
```javascript
const pool = new ObjectPool(
  () => new Vec4(0, 0, 0, 0),
  (v) => { v.x = v.y = v.z = v.w = 0; }
);

const vec = pool.acquire();
// Use vec...
pool.release(vec);
```

### Package.json Updates

- Version: `1.3.0` → `1.4.0`
- Added 6 new exports:
  - `./scene` - Full scene module
  - `./scene/node4d` - Node4D class
  - `./scene/scene4d` - Scene4D class
  - `./scene/resources` - ResourceManager
  - `./scene/pools` - Memory pools
  - `./scene/disposable` - Disposal system

---

---

## Session 5: 2026-01-09 (Phase 3 Implementation)

**Objective**: Complete Render Abstraction layer for 4D visualization

### Files Created

**Render State (`src/render/`):**
- `RenderState.js` - Complete GPU state management
  - `BlendState` - Alpha, additive, multiply, premultiplied modes
  - `DepthState` - Test, write, comparison functions
  - `StencilState` - Operations and masking
  - `RasterizerState` - Culling, scissor, polygon modes
  - `Viewport` - Viewport configuration
  - Preset states: `opaque()`, `transparent()`, `additive()`, `wireframe()`
  - `getSortKey()` for state-based sorting

**Render Commands (`src/render/`):**
- `RenderCommand.js` - Command hierarchy for deferred rendering
  - `ClearCommand` - Clear color/depth/stencil
  - `SetStateCommand` - Change GPU state
  - `BindShaderCommand` - Bind shader program
  - `BindTextureCommand` - Bind texture to slot
  - `BindVertexArrayCommand` - Bind VAO
  - `BindRenderTargetCommand` - Set render target
  - `SetUniformCommand` - Set shader uniform
  - `DrawCommand` - Non-indexed drawing
  - `DrawIndexedCommand` - Indexed drawing
  - `DrawInstancedCommand` - Instanced drawing
  - `DrawIndexedInstancedCommand` - Indexed instanced
  - `SetViewportCommand` - Set viewport
  - `CustomCommand` - Arbitrary callback

**Command Buffer (`src/render/`):**
- `CommandBuffer.js` - Command batching and sorting
  - Sort modes: `NONE`, `STATE`, `FRONT_TO_BACK`, `BACK_TO_FRONT`, `CUSTOM`
  - Statistics tracking (draw calls, triangles, state changes)
  - Profiled execution with timing
  - `CommandBufferPool` for buffer reuse

**Render Target (`src/render/`):**
- `RenderTarget.js` - Framebuffer abstraction
  - Multiple color attachments (MRT)
  - Depth and depth-stencil attachments
  - Texture and renderbuffer options
  - Auto-resize support
  - Factory methods: `create()`, `createHDR()`, `createGBuffer()`, `createShadowMap()`, `createMSAA()`
  - `RenderTargetPool` for target reuse

**Shader Program (`src/render/`):**
- `ShaderProgram.js` - Shader compilation abstraction
  - `ShaderSource` - Source with preprocessor defines
  - `UniformDescriptor` - Uniform metadata and caching
  - `AttributeDescriptor` - Attribute bindings
  - `ShaderLib` - 4D shader snippets:
    - 6 rotation matrices (XY, XZ, YZ, XW, YW, ZW)
    - `rotate4D()` combined rotation
    - Projection functions (perspective, stereographic, orthographic)
    - Basic 4D vertex/fragment shaders with W-fog
  - `ShaderCache` for compiled shader reuse

**WebGL Backend (`src/render/backends/`):**
- `WebGLBackend.js` - WebGL 2.0 implementation
  - State tracking for minimal redundant calls
  - Shader compilation with error reporting
  - Uniform type inference
  - Framebuffer creation with completeness checking
  - Draw call execution (arrays, indexed, instanced)
  - Buffer management (create, update, delete)
  - Extension detection (color_buffer_float, float_blend, etc.)
  - Statistics tracking

**Module Index:**
- `index.js` - Unified exports with helpers
  - `createRenderContext()` - Full context creation
  - `RenderPresets` - Common state configurations
  - `Shader4D` - 4D shader generation helpers

**Tests (`tests/render/`):**
- `RenderState.test.js` - All state classes and presets
- `RenderCommand.test.js` - All command types
- `CommandBuffer.test.js` - Sorting, execution, pooling
- `RenderTarget.test.js` - Attachments, factory methods, pooling
- `ShaderProgram.test.js` - Sources, uniforms, caching

### Key Features

**GPU State Management:**
```javascript
const state = RenderState.transparent();
state.blend.setMode(BlendMode.ADDITIVE);
state.depth.writeEnabled = false;
state.rasterizer.cullFace = CullFace.NONE;

const sortKey = state.getSortKey(); // For batching
```

**Command Recording:**
```javascript
const buffer = commandBufferPool.acquire({ sortMode: SortMode.BACK_TO_FRONT });
buffer.add(new ClearCommand({ colorValue: [0, 0, 0, 1] }));
buffer.add(new BindShaderCommand(shader4D));
buffer.add(new DrawIndexedCommand({ indexCount: 36, depth: 1.5 }));
buffer.execute(backend);
commandBufferPool.release(buffer);
```

**4D Shader Library:**
```glsl
// In vertex shader
${ShaderLib.rotation4D}
${ShaderLib.projection4D}

vec4 rotated = rotate4D(xy, xz, yz, xw, yw, zw) * a_position;
vec3 projected = projectPerspective(rotated, u_projDistance);
```

**Render Targets:**
```javascript
// G-buffer for deferred rendering
const gbuffer = RenderTarget.createGBuffer(1920, 1080);
// 3 color attachments: position, normal, albedo+specular
// Plus depth-stencil

// Shadow map
const shadow = RenderTarget.createShadowMap(2048);
// Depth-only with texture for sampling
```

### Package.json Updates

- Version: `1.4.0` → `1.5.0`
- Added 7 new exports:
  - `./render` - Full render module
  - `./render/state` - RenderState classes
  - `./render/commands` - RenderCommand hierarchy
  - `./render/buffer` - CommandBuffer
  - `./render/target` - RenderTarget
  - `./render/shader` - ShaderProgram
  - `./render/webgl` - WebGLBackend

---

**Last Updated**: 2026-01-09 12:00 UTC
