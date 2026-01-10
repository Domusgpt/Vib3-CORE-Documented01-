# VIB3+ C++ Core Architecture Plan

**Strategic Goal**: Build a high-performance C++ core engine that compiles to native libraries for mobile/desktop and WebAssembly for web, with thin platform-specific bindings following Rive's architecture pattern.

---

## Architecture Overview

```
sdk/
├── core/                    # C++ (or Rust alternative)
│   ├── math/               # 4D rotors, vectors, matrices, projections
│   │   ├── Vec4.hpp
│   │   ├── Rotor4D.hpp
│   │   ├── Mat4x4.hpp
│   │   └── Projection.hpp
│   ├── geometry/           # Polychora generation, 24-geometry encoding
│   │   ├── Tesseract.hpp
│   │   ├── Cell24.hpp
│   │   ├── GeometryEncoder.hpp
│   │   └── SlicingAlgorithms.hpp
│   ├── scene/              # Scene graph, resource management
│   │   ├── Scene4D.hpp
│   │   ├── Node4D.hpp
│   │   └── ResourceManager.hpp
│   └── render/             # Platform-agnostic render commands
│       ├── RenderCommand.hpp
│       ├── CommandBuffer.hpp
│       └── RenderTarget.hpp
│
├── platforms/
│   ├── web/                # Emscripten -> WebAssembly + WebGL bindings
│   │   ├── wasm_bindings.cpp
│   │   ├── webgl_backend.cpp
│   │   └── CMakeLists.txt
│   ├── flutter/            # FFI bindings + Texture widget
│   │   ├── ffi_bindings.cpp
│   │   ├── flutter_texture.cpp
│   │   └── CMakeLists.txt
│   └── native/             # Vulkan/Metal/D3D12 backends
│       ├── vulkan_backend.cpp
│       ├── metal_backend.mm
│       └── d3d12_backend.cpp
│
├── schemas/                # Protobuf definitions for cross-language types
│   ├── geometry.proto      # Vec4, Transform4D, Polychoron
│   ├── parameters.proto    # All visualization parameters
│   └── commands.proto      # Render command protocol
│
└── packages/
    ├── vib3_flutter/       # Dart API wrapping FFI
    ├── vib3_js/            # TypeScript API wrapping WASM
    └── vib3_python/        # Python bindings (optional)
```

---

## Phase Breakdown

### Phase 0: Mathematical Foundation (Weeks 1-4)

**Objective**: Implement bulletproof 4D mathematics in C++

#### Deliverables
- [ ] `Vec4` class with SIMD optimization
- [ ] `Rotor4D` class for 6-plane rotations (not quaternions!)
- [ ] `Mat4x4` class with GPU-friendly layout
- [ ] Stereographic and perspective projection functions
- [ ] Unit tests with numerical stability validation

#### Key Implementation Notes

```cpp
// Rotor4D: 8 components for proper 4D rotation
// - 1 scalar
// - 6 bivector components (one per rotation plane)
// - 1 pseudoscalar
struct Rotor4D {
    float s;           // scalar
    float xy, xz, yz;  // 3D bivectors
    float xw, yw, zw;  // 4D bivectors
    float xyzw;        // pseudoscalar

    Rotor4D operator*(const Rotor4D& other) const;
    Vec4 rotate(const Vec4& v) const;
    void normalize();  // Critical: call every frame or after 10-100 rotations
};

// 6-plane rotation matrix construction
Mat4x4 rotationXW(float angle) {
    float c = cos(angle), s = sin(angle);
    return Mat4x4{
        c, 0, 0, -s,
        0, 1, 0,  0,
        0, 0, 1,  0,
        s, 0, 0,  c
    };
}
```

### Phase 1: Geometry Core (Weeks 5-8)

**Objective**: Port 24-geometry system to C++

#### Deliverables
- [ ] Base geometry generators (8 types)
- [ ] Hypersphere core warp function
- [ ] Hypertetrahedron core warp function
- [ ] 24-geometry encoding/decoding
- [ ] Vertex/edge/face buffer generation

#### Geometry Encoding Formula
```cpp
// geometry = coreIndex * 8 + baseIndex
// coreIndex: 0=base, 1=hypersphere, 2=hypertetrahedron
// baseIndex: 0-7 (tetrahedron, hypercube, sphere, torus, klein, fractal, wave, crystal)

int encodeGeometry(int coreIndex, int baseIndex) {
    return coreIndex * 8 + baseIndex;
}

void decodeGeometry(int geometry, int& coreIndex, int& baseIndex) {
    coreIndex = geometry / 8;
    baseIndex = geometry % 8;
}
```

### Phase 2: Scene Graph & Resources (Weeks 9-12)

**Objective**: Build scene management with proper resource lifecycle

#### Deliverables
- [ ] `Scene4D` container class
- [ ] `Node4D` with parent-child hierarchy
- [ ] `ResourceManager` with reference counting
- [ ] Memory pool allocators for geometry buffers
- [ ] Cascade disposal implementation

### Phase 3: Render Abstraction (Weeks 13-16)

**Objective**: Platform-agnostic render command system

#### Deliverables
- [ ] `RenderCommand` sealed class hierarchy
- [ ] `CommandBuffer` batching for FFI efficiency
- [ ] `RenderTarget` abstraction (Canvas, OffscreenCanvas, Texture)
- [ ] State sorting and draw call optimization

### Phase 4: WebAssembly Backend (Weeks 17-20)

**Objective**: Compile to WASM with WebGL 2.0 backend

#### Deliverables
- [ ] Emscripten build configuration
- [ ] WebGL 2.0 backend implementation
- [ ] JavaScript binding layer
- [ ] Memory management bridge (WASM heap <-> JS)
- [ ] TypeScript type definitions

### Phase 5: Flutter/Native Backends (Weeks 21-24)

**Objective**: Cross-platform native support

#### Deliverables
- [ ] FFI bindings with command batching
- [ ] Flutter Texture widget integration
- [ ] Metal backend (macOS/iOS)
- [ ] Vulkan backend (Android/Linux/Windows)
- [ ] Performance parity validation

### Phase 6: Agentic Integration (Weeks 25-28)

**Objective**: MCP server and telemetry in C++

#### Deliverables
- [ ] OpenTelemetry C++ integration
- [ ] MCP tool definitions
- [ ] JSON-RPC handler
- [ ] CLI with JSON output mode

---

## Build System

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(vib3_core VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# SIMD optimization
if(CMAKE_SYSTEM_PROCESSOR MATCHES "x86_64|AMD64")
    add_compile_options(-mavx2 -mfma)
elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "arm64|aarch64")
    add_compile_options(-march=armv8-a+simd)
endif()

# Core library
add_library(vib3_core STATIC
    src/math/Vec4.cpp
    src/math/Rotor4D.cpp
    src/math/Mat4x4.cpp
    src/math/Projection.cpp
    src/geometry/Tesseract.cpp
    src/geometry/GeometryEncoder.cpp
    src/scene/Scene4D.cpp
    src/render/CommandBuffer.cpp
)

# WASM target
if(EMSCRIPTEN)
    add_executable(vib3_wasm src/platforms/web/wasm_bindings.cpp)
    target_link_libraries(vib3_wasm vib3_core)
    set_target_properties(vib3_wasm PROPERTIES
        LINK_FLAGS "-s WASM=1 -s MODULARIZE=1 -s EXPORT_ES6=1"
    )
endif()
```

---

## Protobuf Schema Example

```protobuf
// schemas/geometry.proto
syntax = "proto3";
package vib3;

message Vec4 {
    float x = 1;
    float y = 2;
    float z = 3;
    float w = 4;
}

message Rotor4D {
    float s = 1;
    float xy = 2;
    float xz = 3;
    float yz = 4;
    float xw = 5;
    float yw = 6;
    float zw = 7;
    float xyzw = 8;
}

message Transform4D {
    Rotor4D rotation = 1;
    Vec4 translation = 2;
    float scale = 3;
}

message GeometryDescriptor {
    int32 geometry_index = 1;  // 0-23
    int32 base_type = 2;       // 0-7
    int32 core_type = 3;       // 0-2
    int32 vertex_count = 4;
    int32 edge_count = 5;
    bytes vertex_buffer = 6;   // Packed Vec4 array
    bytes index_buffer = 7;    // Packed uint16 array
}
```

---

## Migration Strategy

### Incremental Adoption

1. **Phase A**: Build C++ math library, validate against JS implementation
2. **Phase B**: Replace JS math with WASM bindings in hot paths
3. **Phase C**: Move geometry generation to C++
4. **Phase D**: Move rendering to C++ with WebGL backend
5. **Phase E**: Full C++ engine with JS orchestration layer

### Compatibility Layer

Keep existing JS API surface, swap implementation:

```javascript
// Before: Pure JS
import { Rotor4D } from '@vib3/math';
const rotor = new Rotor4D();

// After: WASM-backed
import { Rotor4D } from '@vib3/math'; // Same API
const rotor = new Rotor4D(); // Internally uses WASM module
```

---

## Performance Targets

| Metric | JS Baseline | C++/WASM Target | Native Target |
|--------|-------------|-----------------|---------------|
| Rotor multiply | 100ns | 20ns | 5ns |
| 1000 vertex transform | 2ms | 0.3ms | 0.1ms |
| Tesseract generation | 5ms | 0.5ms | 0.2ms |
| 60fps geometry count | 5 | 50 | 200 |

---

## Risk Mitigation

1. **WASM/JS interop overhead**: Batch operations into CommandBuffer
2. **Memory management**: Use linear allocators, minimize GC pressure
3. **Shader portability**: Single GLSL source, cross-compile via SPIRV-Cross
4. **Platform parity**: Extensive test suite run on all platforms

---

## Next Steps

1. Set up C++ project structure with CMake
2. Implement Vec4 and Rotor4D with tests
3. Validate math against existing JS implementation
4. Create Emscripten build configuration
5. Build minimal WASM proof-of-concept

---

**Author**: VIB3+ Architecture Team
**Created**: 2026-01-08
**Last Updated**: 2026-01-08
