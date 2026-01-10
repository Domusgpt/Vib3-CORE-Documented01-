# VIB3+ SDK Strategic Refactoring Plan

**Goal**: Unify the WebGL engine, agentic wrapper, and SDK scaffolding into a coherent, agentic-native SDK following best practices from Three.js, Babylon.js, and emerging MCP patterns.

---

## Current State Analysis

The codebase has:
- **WebGL Engine**: 3 visualization systems (Quantum, Faceted, Holographic) with 24 geometries each and 6D rotation
- **Parameter System**: ParameterManager with validation and UI binding
- **LLM Interface**: Gemini-based natural language to parameters
- **Gallery/Collection**: 100 variation slots with save/load
- **Partial SDK exports**: `./geometry`, `./quaternion`, `./sensors`, etc.

**Missing**:
- Telemetry/event system
- JSON schemas for API validation
- MCP server for agentic integration
- CLI with JSON output
- Proper tree-shaking exports

---

## Target Architecture

```
@vib3/core          -> Scene graph, resource management, abstract renderer
@vib3/math          -> 4D vectors, rotors, matrices, projections
@vib3/geometry      -> Polychora, tesseracts, 24-geometry encoding
@vib3/materials     -> Shaders, holographic/quantum rendering modes
@vib3/webgl         -> WebGL 2.0 backend implementation
@vib3/agent         -> MCP server, tool definitions, telemetry
@vib3/cli           -> Agent-friendly command-line interface
```

### Current Package Mapping (Monorepo in single package)

```
src/
├── core/           -> @vib3/core (VIB3Engine, Parameters, CanvasManager)
├── math/           -> @vib3/math (NEW: Rotor4D, Vec4, projections)
├── geometry/       -> @vib3/geometry (GeometryLibrary, 24-variant encoding)
├── quantum/        -> @vib3/materials (QuantumEngine, shaders)
├── faceted/        -> @vib3/materials (FacetedSystem)
├── holograms/      -> @vib3/materials (HolographicSystem)
├── agent/          -> @vib3/agent (NEW: MCP server, telemetry)
├── cli/            -> @vib3/cli (NEW: JSON-output CLI)
└── schemas/        -> Shared JSON schemas
```

---

## Implementation Phases

### Phase 1: JSON Schemas & Validation (This Sprint)

Create JSON schemas for:
1. **Parameter schema** - All 6D rotation + visual parameters
2. **Tool response schema** - Semantic return values for agents
3. **Error schema** - Actionable errors with suggestions

Files to create:
- `src/schemas/parameters.schema.json`
- `src/schemas/tool-response.schema.json`
- `src/schemas/error.schema.json`
- `src/schemas/index.js` (schema loader with AJV)

### Phase 2: Telemetry Service

OpenTelemetry-based event system:
1. Tool invocation tracing
2. Render performance metrics
3. GPU memory tracking
4. Parameter change events

Files to create:
- `src/agent/telemetry/TelemetryService.js`
- `src/agent/telemetry/events.js`
- `src/agent/telemetry/index.js`

### Phase 3: MCP Server

Model Context Protocol server exposing:
1. `create_visualization` - Create scene with geometry
2. `set_parameters` - Update rotation/visual params
3. `get_state` - Export current state
4. `render_preview` - Generate preview image
5. `search_geometries` - Query available geometries

Files to create:
- `src/agent/mcp/MCPServer.js`
- `src/agent/mcp/tools.js`
- `src/agent/mcp/resources.js`

### Phase 4: CLI

Agent-friendly CLI:
- `--json` output mode
- `--no-interactive` for automation
- Streaming progress events
- Structured exit codes

Files to create:
- `src/cli/index.js`
- `src/cli/commands/render.js`
- `src/cli/commands/params.js`

### Phase 5: Package Exports

Update package.json with:
- Conditional exports (browser vs node)
- Side-effect declarations
- Type exports

---

## 6-Plane Rotation Matrix Reference

For GPU implementation, each rotation plane has a simple 4x4 matrix:

```glsl
// XW plane rotation (4D "inside-out" effect)
mat4 rotateXW(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat4(
        c, 0, 0, -s,
        0, 1, 0,  0,
        0, 0, 1,  0,
        s, 0, 0,  c
    );
}

// YW plane rotation
mat4 rotateYW(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat4(
        1, 0, 0,  0,
        0, c, 0, -s,
        0, 0, 1,  0,
        0, s, 0,  c
    );
}

// ZW plane rotation
mat4 rotateZW(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat4(
        1, 0, 0,  0,
        0, 1, 0,  0,
        0, 0, c, -s,
        0, 0, s,  c
    );
}
```

---

## Agentic API Design Patterns

### Tool Response Format

```json
{
  "scene_id": "scene_4d_abc123",
  "geometry_type": "tesseract",
  "geometry_index": 1,
  "core_type": "hypersphere",
  "vertex_count": 16,
  "edge_count": 32,
  "rotation_state": {
    "XY": 0.0, "XZ": 0.0, "YZ": 0.0,
    "XW": 0.5, "YW": 0.3, "ZW": 0.2
  },
  "estimated_render_complexity": "medium",
  "suggested_next_actions": ["apply_rotation", "set_material", "render_preview"]
}
```

### Error Format

```json
{
  "error": {
    "type": "ValidationError",
    "code": "INVALID_GEOMETRY_INDEX",
    "message": "Geometry index 25 is out of range",
    "valid_range": [0, 23],
    "suggestion": "Use geometry index 0-7 for base, 8-15 for hypersphere core, 16-23 for hypertetrahedron core"
  }
}
```

---

## Integration with External Repos

### From vib34d-vib3plus SDK
- Quaternion algebra implementations
- Sensor schema normalization
- 24-geometry encoding formula: `geometry = coreIndex * 8 + baseIndex`

### From Manifestaengine-Vib3-1
- Telemetry service patterns
- JSON schema definitions
- Gemini agentic orchestration layer

---

## Next Steps

1. Create `src/schemas/` directory with JSON schemas
2. Create `src/agent/telemetry/` with OpenTelemetry service
3. Create `src/agent/mcp/` with MCP server
4. Update package.json exports
5. Add CLI scaffolding

---

**Author**: Claude Code Refactoring Agent
**Date**: 2026-01-08
**Branch**: claude/refactor-swarm-agent-2Bx4M
