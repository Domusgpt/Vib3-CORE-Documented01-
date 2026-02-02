// VIB3+ Quantum System Fragment Shader (WGSL)
// Complex 3D lattice functions with holographic effects
// Supports 24 geometry variants: 8 base + 8 Hypersphere Core + 8 Hypertetrahedron Core

struct VIB3Uniforms {
    time: f32,
    _pad0: f32,
    resolution: vec2<f32>,
    geometry: f32,
    rot4dXY: f32,
    rot4dXZ: f32,
    rot4dYZ: f32,
    rot4dXW: f32,
    rot4dYW: f32,
    rot4dZW: f32,
    dimension: f32,
    gridDensity: f32,
    morphFactor: f32,
    chaos: f32,
    speed: f32,
    hue: f32,
    intensity: f32,
    saturation: f32,
    mouseIntensity: f32,
    clickIntensity: f32,
    bass: f32,
    mid: f32,
    high: f32,
    layerScale: f32,
    layerOpacity: f32,
    _pad1: f32,
    layerColor: vec3<f32>,
    densityMult: f32,
    speedMult: f32,
    _pad2: vec3<f32>,
};

@group(0) @binding(0) var<uniform> u: VIB3Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

// ========== 6D Rotation ==========
fn rotateXY(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, -s, 0.0, 0.0), vec4<f32>(s, c, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 1.0, 0.0), vec4<f32>(0.0, 0.0, 0.0, 1.0));
}
fn rotateXZ(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, 0.0, -s, 0.0), vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(s, 0.0, c, 0.0), vec4<f32>(0.0, 0.0, 0.0, 1.0));
}
fn rotateYZ(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0), vec4<f32>(0.0, c, -s, 0.0),
        vec4<f32>(0.0, s, c, 0.0), vec4<f32>(0.0, 0.0, 0.0, 1.0));
}
fn rotateXW(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, 0.0, 0.0, -s), vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 1.0, 0.0), vec4<f32>(s, 0.0, 0.0, c));
}
fn rotateYW(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0), vec4<f32>(0.0, c, 0.0, -s),
        vec4<f32>(0.0, 0.0, 1.0, 0.0), vec4<f32>(0.0, s, 0.0, c));
}
fn rotateZW(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0), vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, c, -s), vec4<f32>(0.0, 0.0, s, c));
}

fn project4Dto3D(p: vec4<f32>) -> vec3<f32> {
    let w = 2.5 / (2.5 + p.w);
    return vec3<f32>(p.x * w, p.y * w, p.z * w);
}

// ========== Polytope Core Warp Functions ==========
fn warpHypersphereCore(p: vec3<f32>, geometryIndex: i32) -> vec3<f32> {
    let radius = length(p);
    let morphBlend = clamp(u.morphFactor * 0.6 + (u.dimension - 3.0) * 0.25, 0.0, 2.0);
    let w = sin(radius * (1.3 + f32(geometryIndex) * 0.12) + u.time * 0.0008 * u.speed)
          * (0.4 + morphBlend * 0.45);

    var p4d = vec4<f32>(p * (1.0 + morphBlend * 0.2), w);
    p4d = rotateXY(u.rot4dXY) * p4d;
    p4d = rotateXZ(u.rot4dXZ) * p4d;
    p4d = rotateYZ(u.rot4dYZ) * p4d;
    p4d = rotateXW(u.rot4dXW) * p4d;
    p4d = rotateYW(u.rot4dYW) * p4d;
    p4d = rotateZW(u.rot4dZW) * p4d;

    let projected = project4Dto3D(p4d);
    return mix(p, projected, clamp(0.45 + morphBlend * 0.35, 0.0, 1.0));
}

fn warpHypertetraCore(p: vec3<f32>, geometryIndex: i32) -> vec3<f32> {
    let c1 = normalize(vec3<f32>(1.0, 1.0, 1.0));
    let c2 = normalize(vec3<f32>(-1.0, -1.0, 1.0));
    let c3 = normalize(vec3<f32>(-1.0, 1.0, -1.0));
    let c4 = normalize(vec3<f32>(1.0, -1.0, -1.0));

    let morphBlend = clamp(u.morphFactor * 0.8 + (u.dimension - 3.0) * 0.2, 0.0, 2.0);
    let basisMix = dot(p, c1) * 0.14 + dot(p, c2) * 0.1 + dot(p, c3) * 0.08;
    var w = sin(basisMix * 5.5 + u.time * 0.0009 * u.speed);
    w *= cos(dot(p, c4) * 4.2 - u.time * 0.0007 * u.speed);
    w *= (0.5 + morphBlend * 0.4);

    let offset = vec3<f32>(dot(p, c1), dot(p, c2), dot(p, c3)) * 0.1 * morphBlend;
    var p4d = vec4<f32>(p + offset, w);
    p4d = rotateXY(u.rot4dXY) * p4d;
    p4d = rotateXZ(u.rot4dXZ) * p4d;
    p4d = rotateYZ(u.rot4dYZ) * p4d;
    p4d = rotateXW(u.rot4dXW) * p4d;
    p4d = rotateYW(u.rot4dYW) * p4d;
    p4d = rotateZW(u.rot4dZW) * p4d;

    let projected = project4Dto3D(p4d);
    let planeInfluence = min(min(abs(dot(p, c1)), abs(dot(p, c2))), min(abs(dot(p, c3)), abs(dot(p, c4))));
    let blended = mix(p, projected, clamp(0.45 + morphBlend * 0.35, 0.0, 1.0));
    return mix(blended, blended * (1.0 - planeInfluence * 0.55), 0.2 + morphBlend * 0.2);
}

fn applyCoreWarp(p: vec3<f32>, geometryType: f32) -> vec3<f32> {
    let totalBase = 8.0;
    let coreIndex = i32(clamp(floor(geometryType / totalBase), 0.0, 2.0));
    let geometryIndex = i32(clamp(floor(geometryType % totalBase + 0.5), 0.0, totalBase - 1.0));

    if (coreIndex == 1) { return warpHypersphereCore(p, geometryIndex); }
    if (coreIndex == 2) { return warpHypertetraCore(p, geometryIndex); }
    return p;
}

// ========== Complex 3D Lattice Functions ==========
fn tetrahedronLattice(p: vec3<f32>, gridSize: f32) -> f32 {
    let q = fract(p * gridSize) - 0.5;
    let d1 = length(q);
    let d2 = length(q - vec3<f32>(0.4, 0.0, 0.0));
    let d3 = length(q - vec3<f32>(0.0, 0.4, 0.0));
    let d4 = length(q - vec3<f32>(0.0, 0.0, 0.4));
    let vertices = 1.0 - smoothstep(0.0, 0.04, min(min(d1, d2), min(d3, d4)));
    var edges = 0.0;
    edges = max(edges, 1.0 - smoothstep(0.0, 0.02, abs(length(q.xy) - 0.2)));
    edges = max(edges, 1.0 - smoothstep(0.0, 0.02, abs(length(q.yz) - 0.2)));
    edges = max(edges, 1.0 - smoothstep(0.0, 0.02, abs(length(vec2<f32>(q.x, q.z)) - 0.2)));
    return max(vertices, edges * 0.5);
}

fn hypercubeLattice(p: vec3<f32>, gridSize: f32) -> f32 {
    let grid = fract(p * gridSize);
    let edges = min(grid, 1.0 - grid);
    let minEdge = min(min(edges.x, edges.y), edges.z);
    let lattice = 1.0 - smoothstep(0.0, 0.03, minEdge);
    let centers = abs(grid - 0.5);
    let maxCenter = max(max(centers.x, centers.y), centers.z);
    let vertices = 1.0 - smoothstep(0.45, 0.5, maxCenter);
    return max(lattice * 0.7, vertices);
}

fn sphereLattice(p: vec3<f32>, gridSize: f32) -> f32 {
    let cell = fract(p * gridSize) - 0.5;
    let sphere = 1.0 - smoothstep(0.15, 0.25, length(cell));
    let ringRadius = length(cell.xy);
    var rings = 1.0 - smoothstep(0.0, 0.02, abs(ringRadius - 0.3));
    rings = max(rings, 1.0 - smoothstep(0.0, 0.02, abs(ringRadius - 0.2)));
    return max(sphere, rings * 0.6);
}

fn torusLattice(p: vec3<f32>, gridSize: f32) -> f32 {
    let cell = fract(p * gridSize) - 0.5;
    let majorRadius = 0.3;
    let minorRadius = 0.1;
    let toroidalDist = length(vec2<f32>(length(cell.xy) - majorRadius, cell.z));
    let torus = 1.0 - smoothstep(minorRadius - 0.02, minorRadius + 0.02, toroidalDist);
    let angle = atan2(cell.y, cell.x);
    let rings = sin(angle * 8.0) * 0.02;
    return max(torus, 0.0) + rings;
}

fn kleinLattice(p: vec3<f32>, gridSize: f32) -> f32 {
    let cell = fract(p * gridSize) - 0.5;
    let ku = atan2(cell.y, cell.x) / 3.14159 + 1.0;
    let kv = cell.z + 0.5;
    let kx = (2.0 + cos(ku * 0.5)) * cos(ku);
    let ky = (2.0 + cos(ku * 0.5)) * sin(ku);
    let kz = sin(ku * 0.5) + kv;
    let kleinPoint = vec3<f32>(kx, ky, kz) * 0.1;
    let dist = length(cell - kleinPoint);
    return 1.0 - smoothstep(0.1, 0.15, dist);
}

fn fractalLattice(p: vec3<f32>, gridSize: f32) -> f32 {
    var cell = fract(p * gridSize);
    cell = abs(cell * 2.0 - 1.0);
    var dist = length(max(abs(cell) - 0.3, vec3<f32>(0.0)));
    for (var i = 0; i < 3; i++) {
        cell = abs(cell * 2.0 - 1.0);
        let subdist = length(max(abs(cell) - 0.3, vec3<f32>(0.0))) / pow(2.0, f32(i + 1));
        dist = min(dist, subdist);
    }
    return 1.0 - smoothstep(0.0, 0.05, dist);
}

fn waveLattice(p: vec3<f32>, gridSize: f32) -> f32 {
    let time = u.time * 0.001 * u.speed;
    let cell = fract(p * gridSize) - 0.5;
    let wave1 = sin(p.x * gridSize * 2.0 + time * 2.0);
    let wave2 = sin(p.y * gridSize * 1.8 + time * 1.5);
    let wave3 = sin(p.z * gridSize * 2.2 + time * 1.8);
    let interference = (wave1 + wave2 + wave3) / 3.0;
    let amplitude = 1.0 - length(cell) * 2.0;
    return max(0.0, interference * amplitude);
}

fn crystalLattice(p: vec3<f32>, gridSize: f32) -> f32 {
    let cell = fract(p * gridSize) - 0.5;
    let crystal = max(max(abs(cell.x) + abs(cell.y), abs(cell.y) + abs(cell.z)), abs(cell.x) + abs(cell.z));
    let crystalShape = 1.0 - smoothstep(0.3, 0.4, crystal);
    var faces = 1.0 - smoothstep(0.0, 0.02, abs(abs(cell.x) - 0.35));
    faces = max(faces, 1.0 - smoothstep(0.0, 0.02, abs(abs(cell.y) - 0.35)));
    faces = max(faces, 1.0 - smoothstep(0.0, 0.02, abs(abs(cell.z) - 0.35)));
    return max(crystalShape, faces * 0.5);
}

// ========== Geometry Dispatcher ==========
fn geometryFunction(p: vec4<f32>) -> f32 {
    let totalBase = 8.0;
    let baseGeomFloat = u.geometry % totalBase;
    let geomType = i32(clamp(floor(baseGeomFloat + 0.5), 0.0, totalBase - 1.0));

    let p3d = project4Dto3D(p);
    let warped = applyCoreWarp(p3d, u.geometry);
    let gridSize = u.gridDensity * 0.08;

    switch geomType {
        case 0: { return tetrahedronLattice(warped, gridSize) * u.morphFactor; }
        case 1: { return hypercubeLattice(warped, gridSize) * u.morphFactor; }
        case 2: { return sphereLattice(warped, gridSize) * u.morphFactor; }
        case 3: { return torusLattice(warped, gridSize) * u.morphFactor; }
        case 4: { return kleinLattice(warped, gridSize) * u.morphFactor; }
        case 5: { return fractalLattice(warped, gridSize) * u.morphFactor; }
        case 6: { return waveLattice(warped, gridSize) * u.morphFactor; }
        case 7: { return crystalLattice(warped, gridSize) * u.morphFactor; }
        default: { return hypercubeLattice(warped, gridSize) * u.morphFactor; }
    }
}

// ========== Layer Color System ==========
fn getLayerColorPalette(layerIndex: i32, t: f32) -> vec3<f32> {
    if (layerIndex == 0) {
        let c1 = vec3<f32>(0.05, 0.0, 0.2);
        let c2 = vec3<f32>(0.0, 0.0, 0.1);
        let c3 = vec3<f32>(0.0, 0.05, 0.3);
        return mix(mix(c1, c2, sin(t * 3.0) * 0.5 + 0.5), c3, cos(t * 2.0) * 0.5 + 0.5);
    } else if (layerIndex == 1) {
        let c1 = vec3<f32>(0.0, 1.0, 0.0);
        let c2 = vec3<f32>(0.8, 1.0, 0.0);
        let c3 = vec3<f32>(0.0, 0.8, 0.3);
        return mix(mix(c1, c2, sin(t * 7.0) * 0.5 + 0.5), c3, cos(t * 5.0) * 0.5 + 0.5);
    } else if (layerIndex == 2) {
        let c1 = vec3<f32>(1.0, 0.0, 0.0);
        let c2 = vec3<f32>(1.0, 0.5, 0.0);
        let c3 = vec3<f32>(1.0, 1.0, 1.0);
        return mix(mix(c1, c2, sin(t * 11.0) * 0.5 + 0.5), c3, cos(t * 8.0) * 0.5 + 0.5);
    } else if (layerIndex == 3) {
        let c1 = vec3<f32>(0.0, 1.0, 1.0);
        let c2 = vec3<f32>(0.0, 0.5, 1.0);
        let c3 = vec3<f32>(0.5, 1.0, 1.0);
        return mix(mix(c1, c2, sin(t * 13.0) * 0.5 + 0.5), c3, cos(t * 9.0) * 0.5 + 0.5);
    } else {
        let c1 = vec3<f32>(1.0, 0.0, 1.0);
        let c2 = vec3<f32>(0.8, 0.0, 1.0);
        let c3 = vec3<f32>(1.0, 0.3, 1.0);
        return mix(mix(c1, c2, sin(t * 17.0) * 0.5 + 0.5), c3, cos(t * 12.0) * 0.5 + 0.5);
    }
}

// ========== Main Fragment Shader ==========
@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    let fragCoord = input.position.xy;
    let uv = (fragCoord - u.resolution * 0.5) / min(u.resolution.x, u.resolution.y);

    let timeSpeed = u.time * 0.0001 * u.speed;
    var pos = vec4<f32>(uv * 3.0, sin(timeSpeed * 3.0), cos(timeSpeed * 2.0));

    // Apply 6D rotations
    pos = rotateXY(u.rot4dXY) * pos;
    pos = rotateXZ(u.rot4dXZ) * pos;
    pos = rotateYZ(u.rot4dYZ) * pos;
    pos = rotateXW(u.rot4dXW) * pos;
    pos = rotateYW(u.rot4dYW) * pos;
    pos = rotateZW(u.rot4dZW) * pos;

    // Geometry evaluation
    let value = geometryFunction(pos);

    // Chaos noise
    let noise = sin(pos.x * 7.0) * cos(pos.y * 11.0) * sin(pos.z * 13.0);
    let valueFinal = value + noise * u.chaos;

    // Intensity with holographic glow
    var geometryIntensity = 1.0 - clamp(abs(valueFinal * 0.8), 0.0, 1.0);
    geometryIntensity = pow(geometryIntensity, 1.5);
    geometryIntensity += u.clickIntensity * 0.3;

    // Holographic shimmer
    let shimmer = sin(uv.x * 20.0 + timeSpeed * 5.0) * cos(uv.y * 15.0 + timeSpeed * 3.0) * 0.1;
    geometryIntensity += shimmer * geometryIntensity;

    let finalIntensity = geometryIntensity * u.intensity;

    // Layer detection from layerOpacity
    var layerIndex: i32 = 0;
    if (u.layerOpacity > 0.69 && u.layerOpacity < 0.71) { layerIndex = 1; }
    else if (u.layerOpacity > 0.99) { layerIndex = 2; }
    else if (u.layerOpacity > 0.84 && u.layerOpacity < 0.86) { layerIndex = 3; }
    else if (u.layerOpacity > 0.59 && u.layerOpacity < 0.61) { layerIndex = 4; }

    // Layer color
    let globalIntensity = u.hue;
    let colorTime = timeSpeed * 2.0 + valueFinal * 3.0 + globalIntensity * 5.0;
    let layerColor = getLayerColorPalette(layerIndex, colorTime) * (0.5 + globalIntensity * 1.5);

    // Per-layer intensity modulation
    var finalColor: vec3<f32>;
    if (layerIndex == 0) {
        finalColor = layerColor * (0.3 + geometryIntensity * 0.4);
    } else if (layerIndex == 1) {
        let shadowIntensity = pow(1.0 - geometryIntensity, 2.0);
        finalColor = layerColor * (shadowIntensity * 0.8 + 0.1);
    } else if (layerIndex == 2) {
        finalColor = layerColor * (geometryIntensity * 1.2 + 0.2);
    } else if (layerIndex == 3) {
        let peakIntensity = pow(geometryIntensity, 3.0);
        finalColor = layerColor * (peakIntensity * 1.5 + 0.1);
    } else {
        let randomBurst = sin(valueFinal * 50.0 + timeSpeed * 10.0) * 0.5 + 0.5;
        finalColor = layerColor * (randomBurst * geometryIntensity * 2.0 + 0.05);
    }

    // Layer alpha
    var layerAlpha: f32;
    if (layerIndex == 0) { layerAlpha = 0.6; }
    else if (layerIndex == 1) { layerAlpha = 0.4; }
    else if (layerIndex == 2) { layerAlpha = 1.0; }
    else if (layerIndex == 3) { layerAlpha = 0.8; }
    else { layerAlpha = 0.3; }

    return vec4<f32>(finalColor, finalIntensity * layerAlpha);
}
