// VIB3+ Common Uniform Struct (WGSL)
// Shared across all visualization systems

struct VIB3Uniforms {
    // Time and resolution
    time: f32,
    _pad0: f32,
    resolution: vec2<f32>,

    // Geometry selection (0-23)
    geometry: f32,

    // 6D Rotation (radians)
    rot4dXY: f32,
    rot4dXZ: f32,
    rot4dYZ: f32,
    rot4dXW: f32,
    rot4dYW: f32,
    rot4dZW: f32,

    // Visual parameters
    dimension: f32,
    gridDensity: f32,
    morphFactor: f32,
    chaos: f32,
    speed: f32,
    hue: f32,
    intensity: f32,
    saturation: f32,

    // Reactivity
    mouseIntensity: f32,
    clickIntensity: f32,
    bass: f32,
    mid: f32,
    high: f32,

    // Layer parameters (holographic multi-layer)
    layerScale: f32,
    layerOpacity: f32,
    _pad1: f32,
    layerColor: vec3<f32>,
    densityMult: f32,
    speedMult: f32,
    _pad2: vec3<f32>,
};

@group(0) @binding(0) var<uniform> u: VIB3Uniforms;
