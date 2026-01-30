// VIB3+ Quantum System Fragment Shader (GLSL)
// Complex 3D lattice functions with holographic effects
// Supports 24 geometry variants: 8 base + 8 Hypersphere Core + 8 Hypertetrahedron Core
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_geometry;  // 0-23

// 6D Rotation uniforms
uniform float u_rot4dXY;
uniform float u_rot4dXZ;
uniform float u_rot4dYZ;
uniform float u_rot4dXW;
uniform float u_rot4dYW;
uniform float u_rot4dZW;

uniform float u_dimension;
uniform float u_gridDensity;
uniform float u_morphFactor;
uniform float u_chaos;
uniform float u_speed;
uniform float u_hue;
uniform float u_intensity;
uniform float u_saturation;
uniform float u_mouseIntensity;
uniform float u_clickIntensity;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;

// Layer uniforms
uniform float u_layerScale;
uniform float u_layerOpacity;
uniform vec3 u_layerColor;
uniform float u_densityMult;
uniform float u_speedMult;

// ========== 6D Rotation ==========
mat4 rotateXY(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat4(c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
}
mat4 rotateXZ(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat4(c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1);
}
mat4 rotateYZ(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat4(1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1);
}
mat4 rotateXW(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat4(c, 0, 0, -s, 0, 1, 0, 0, 0, 0, 1, 0, s, 0, 0, c);
}
mat4 rotateYW(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat4(1, 0, 0, 0, 0, c, 0, -s, 0, 0, 1, 0, 0, s, 0, c);
}
mat4 rotateZW(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, c, -s, 0, 0, s, c);
}

vec3 project4Dto3D(vec4 p) {
    float w = 2.5 / (2.5 + p.w);
    return vec3(p.x * w, p.y * w, p.z * w);
}

// ========== Polytope Core Warp Functions ==========
vec3 warpHypersphereCore(vec3 p, int geometryIndex) {
    float radius = length(p);
    float morphBlend = clamp(u_morphFactor * 0.6 + (u_dimension - 3.0) * 0.25, 0.0, 2.0);
    float w = sin(radius * (1.3 + float(geometryIndex) * 0.12) + u_time * 0.0008 * u_speed)
              * (0.4 + morphBlend * 0.45);

    vec4 p4d = vec4(p * (1.0 + morphBlend * 0.2), w);
    p4d = rotateXY(u_rot4dXY) * p4d;
    p4d = rotateXZ(u_rot4dXZ) * p4d;
    p4d = rotateYZ(u_rot4dYZ) * p4d;
    p4d = rotateXW(u_rot4dXW) * p4d;
    p4d = rotateYW(u_rot4dYW) * p4d;
    p4d = rotateZW(u_rot4dZW) * p4d;

    vec3 projected = project4Dto3D(p4d);
    return mix(p, projected, clamp(0.45 + morphBlend * 0.35, 0.0, 1.0));
}

vec3 warpHypertetraCore(vec3 p, int geometryIndex) {
    vec3 c1 = normalize(vec3(1.0, 1.0, 1.0));
    vec3 c2 = normalize(vec3(-1.0, -1.0, 1.0));
    vec3 c3 = normalize(vec3(-1.0, 1.0, -1.0));
    vec3 c4 = normalize(vec3(1.0, -1.0, -1.0));

    float morphBlend = clamp(u_morphFactor * 0.8 + (u_dimension - 3.0) * 0.2, 0.0, 2.0);
    float basisMix = dot(p, c1) * 0.14 + dot(p, c2) * 0.1 + dot(p, c3) * 0.08;
    float w = sin(basisMix * 5.5 + u_time * 0.0009 * u_speed);
    w *= cos(dot(p, c4) * 4.2 - u_time * 0.0007 * u_speed);
    w *= (0.5 + morphBlend * 0.4);

    vec3 offset = vec3(dot(p, c1), dot(p, c2), dot(p, c3)) * 0.1 * morphBlend;
    vec4 p4d = vec4(p + offset, w);
    p4d = rotateXY(u_rot4dXY) * p4d;
    p4d = rotateXZ(u_rot4dXZ) * p4d;
    p4d = rotateYZ(u_rot4dYZ) * p4d;
    p4d = rotateXW(u_rot4dXW) * p4d;
    p4d = rotateYW(u_rot4dYW) * p4d;
    p4d = rotateZW(u_rot4dZW) * p4d;

    vec3 projected = project4Dto3D(p4d);
    float planeInfluence = min(min(abs(dot(p, c1)), abs(dot(p, c2))), min(abs(dot(p, c3)), abs(dot(p, c4))));
    vec3 blended = mix(p, projected, clamp(0.45 + morphBlend * 0.35, 0.0, 1.0));
    return mix(blended, blended * (1.0 - planeInfluence * 0.55), 0.2 + morphBlend * 0.2);
}

vec3 applyCoreWarp(vec3 p, float geometryType) {
    float totalBase = 8.0;
    int coreIndex = int(clamp(floor(geometryType / totalBase), 0.0, 2.0));
    int geometryIndex = int(clamp(floor(mod(geometryType, totalBase) + 0.5), 0.0, totalBase - 1.0));

    if (coreIndex == 1) { return warpHypersphereCore(p, geometryIndex); }
    if (coreIndex == 2) { return warpHypertetraCore(p, geometryIndex); }
    return p;
}

// ========== Complex 3D Lattice Functions ==========
float tetrahedronLattice(vec3 p, float gridSize) {
    vec3 q = fract(p * gridSize) - 0.5;
    float d1 = length(q);
    float d2 = length(q - vec3(0.4, 0.0, 0.0));
    float d3 = length(q - vec3(0.0, 0.4, 0.0));
    float d4 = length(q - vec3(0.0, 0.0, 0.4));
    float vertices = 1.0 - smoothstep(0.0, 0.04, min(min(d1, d2), min(d3, d4)));
    float edges = 0.0;
    edges = max(edges, 1.0 - smoothstep(0.0, 0.02, abs(length(q.xy) - 0.2)));
    edges = max(edges, 1.0 - smoothstep(0.0, 0.02, abs(length(q.yz) - 0.2)));
    edges = max(edges, 1.0 - smoothstep(0.0, 0.02, abs(length(vec2(q.x, q.z)) - 0.2)));
    return max(vertices, edges * 0.5);
}

float hypercubeLattice(vec3 p, float gridSize) {
    vec3 grid = fract(p * gridSize);
    vec3 edgesV = min(grid, 1.0 - grid);
    float minEdge = min(min(edgesV.x, edgesV.y), edgesV.z);
    float lattice = 1.0 - smoothstep(0.0, 0.03, minEdge);
    vec3 centers = abs(grid - 0.5);
    float maxCenter = max(max(centers.x, centers.y), centers.z);
    float verts = 1.0 - smoothstep(0.45, 0.5, maxCenter);
    return max(lattice * 0.7, verts);
}

float sphereLattice(vec3 p, float gridSize) {
    vec3 cell = fract(p * gridSize) - 0.5;
    float sphere = 1.0 - smoothstep(0.15, 0.25, length(cell));
    float ringRadius = length(cell.xy);
    float rings = 1.0 - smoothstep(0.0, 0.02, abs(ringRadius - 0.3));
    rings = max(rings, 1.0 - smoothstep(0.0, 0.02, abs(ringRadius - 0.2)));
    return max(sphere, rings * 0.6);
}

float torusLattice(vec3 p, float gridSize) {
    vec3 cell = fract(p * gridSize) - 0.5;
    float majorRadius = 0.3;
    float minorRadius = 0.1;
    float toroidalDist = length(vec2(length(cell.xy) - majorRadius, cell.z));
    float torus = 1.0 - smoothstep(minorRadius - 0.02, minorRadius + 0.02, toroidalDist);
    float angle = atan(cell.y, cell.x);
    float ringsMod = sin(angle * 8.0) * 0.02;
    return max(torus, 0.0) + ringsMod;
}

float kleinLattice(vec3 p, float gridSize) {
    vec3 cell = fract(p * gridSize) - 0.5;
    float ku = atan(cell.y, cell.x) / 3.14159 + 1.0;
    float kv = cell.z + 0.5;
    float kx = (2.0 + cos(ku * 0.5)) * cos(ku);
    float ky = (2.0 + cos(ku * 0.5)) * sin(ku);
    float kz = sin(ku * 0.5) + kv;
    vec3 kleinPoint = vec3(kx, ky, kz) * 0.1;
    float dist = length(cell - kleinPoint);
    return 1.0 - smoothstep(0.1, 0.15, dist);
}

float fractalLattice(vec3 p, float gridSize) {
    vec3 cell = fract(p * gridSize);
    cell = abs(cell * 2.0 - 1.0);
    float dist = length(max(abs(cell) - 0.3, vec3(0.0)));
    for (int i = 0; i < 3; i++) {
        cell = abs(cell * 2.0 - 1.0);
        float subdist = length(max(abs(cell) - 0.3, vec3(0.0))) / pow(2.0, float(i + 1));
        dist = min(dist, subdist);
    }
    return 1.0 - smoothstep(0.0, 0.05, dist);
}

float waveLattice(vec3 p, float gridSize) {
    float timeVal = u_time * 0.001 * u_speed;
    vec3 cell = fract(p * gridSize) - 0.5;
    float wave1 = sin(p.x * gridSize * 2.0 + timeVal * 2.0);
    float wave2 = sin(p.y * gridSize * 1.8 + timeVal * 1.5);
    float wave3 = sin(p.z * gridSize * 2.2 + timeVal * 1.8);
    float interference = (wave1 + wave2 + wave3) / 3.0;
    float amplitude = 1.0 - length(cell) * 2.0;
    return max(0.0, interference * amplitude);
}

float crystalLattice(vec3 p, float gridSize) {
    vec3 cell = fract(p * gridSize) - 0.5;
    float crystal = max(max(abs(cell.x) + abs(cell.y), abs(cell.y) + abs(cell.z)), abs(cell.x) + abs(cell.z));
    float crystalShape = 1.0 - smoothstep(0.3, 0.4, crystal);
    float faces = 1.0 - smoothstep(0.0, 0.02, abs(abs(cell.x) - 0.35));
    faces = max(faces, 1.0 - smoothstep(0.0, 0.02, abs(abs(cell.y) - 0.35)));
    faces = max(faces, 1.0 - smoothstep(0.0, 0.02, abs(abs(cell.z) - 0.35)));
    return max(crystalShape, faces * 0.5);
}

// ========== Geometry Dispatcher ==========
float geometryFunction(vec4 p) {
    float totalBase = 8.0;
    float baseGeomFloat = mod(u_geometry, totalBase);
    int geomType = int(clamp(floor(baseGeomFloat + 0.5), 0.0, totalBase - 1.0));

    vec3 p3d = project4Dto3D(p);
    vec3 warped = applyCoreWarp(p3d, u_geometry);
    float gridSize = u_gridDensity * 0.08;

    if (geomType == 0) { return tetrahedronLattice(warped, gridSize) * u_morphFactor; }
    else if (geomType == 1) { return hypercubeLattice(warped, gridSize) * u_morphFactor; }
    else if (geomType == 2) { return sphereLattice(warped, gridSize) * u_morphFactor; }
    else if (geomType == 3) { return torusLattice(warped, gridSize) * u_morphFactor; }
    else if (geomType == 4) { return kleinLattice(warped, gridSize) * u_morphFactor; }
    else if (geomType == 5) { return fractalLattice(warped, gridSize) * u_morphFactor; }
    else if (geomType == 6) { return waveLattice(warped, gridSize) * u_morphFactor; }
    else { return crystalLattice(warped, gridSize) * u_morphFactor; }
}

// ========== Layer Color System ==========
vec3 getLayerColorPalette(int layerIndex, float t) {
    if (layerIndex == 0) {
        vec3 c1 = vec3(0.05, 0.0, 0.2);
        vec3 c2 = vec3(0.0, 0.0, 0.1);
        vec3 c3 = vec3(0.0, 0.05, 0.3);
        return mix(mix(c1, c2, sin(t * 3.0) * 0.5 + 0.5), c3, cos(t * 2.0) * 0.5 + 0.5);
    } else if (layerIndex == 1) {
        vec3 c1 = vec3(0.0, 1.0, 0.0);
        vec3 c2 = vec3(0.8, 1.0, 0.0);
        vec3 c3 = vec3(0.0, 0.8, 0.3);
        return mix(mix(c1, c2, sin(t * 7.0) * 0.5 + 0.5), c3, cos(t * 5.0) * 0.5 + 0.5);
    } else if (layerIndex == 2) {
        vec3 c1 = vec3(1.0, 0.0, 0.0);
        vec3 c2 = vec3(1.0, 0.5, 0.0);
        vec3 c3 = vec3(1.0, 1.0, 1.0);
        return mix(mix(c1, c2, sin(t * 11.0) * 0.5 + 0.5), c3, cos(t * 8.0) * 0.5 + 0.5);
    } else if (layerIndex == 3) {
        vec3 c1 = vec3(0.0, 1.0, 1.0);
        vec3 c2 = vec3(0.0, 0.5, 1.0);
        vec3 c3 = vec3(0.5, 1.0, 1.0);
        return mix(mix(c1, c2, sin(t * 13.0) * 0.5 + 0.5), c3, cos(t * 9.0) * 0.5 + 0.5);
    } else {
        vec3 c1 = vec3(1.0, 0.0, 1.0);
        vec3 c2 = vec3(0.8, 0.0, 1.0);
        vec3 c3 = vec3(1.0, 0.3, 1.0);
        return mix(mix(c1, c2, sin(t * 17.0) * 0.5 + 0.5), c3, cos(t * 12.0) * 0.5 + 0.5);
    }
}

// ========== Main Fragment Shader ==========
void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);

    float timeSpeed = u_time * 0.0001 * u_speed;
    vec4 pos = vec4(uv * 3.0, sin(timeSpeed * 3.0), cos(timeSpeed * 2.0));

    // Apply 6D rotations
    pos = rotateXY(u_rot4dXY) * pos;
    pos = rotateXZ(u_rot4dXZ) * pos;
    pos = rotateYZ(u_rot4dYZ) * pos;
    pos = rotateXW(u_rot4dXW) * pos;
    pos = rotateYW(u_rot4dYW) * pos;
    pos = rotateZW(u_rot4dZW) * pos;

    // Geometry evaluation
    float value = geometryFunction(pos);

    // Chaos noise
    float noise = sin(pos.x * 7.0) * cos(pos.y * 11.0) * sin(pos.z * 13.0);
    float valueFinal = value + noise * u_chaos;

    // Intensity with holographic glow
    float geometryIntensity = 1.0 - clamp(abs(valueFinal * 0.8), 0.0, 1.0);
    geometryIntensity = pow(geometryIntensity, 1.5);
    geometryIntensity += u_clickIntensity * 0.3;

    // Holographic shimmer
    float shimmer = sin(uv.x * 20.0 + timeSpeed * 5.0) * cos(uv.y * 15.0 + timeSpeed * 3.0) * 0.1;
    geometryIntensity += shimmer * geometryIntensity;

    float finalIntensity = geometryIntensity * u_intensity;

    // Layer detection from layerOpacity
    int layerIndex = 0;
    if (u_layerOpacity > 0.69 && u_layerOpacity < 0.71) { layerIndex = 1; }
    else if (u_layerOpacity > 0.99) { layerIndex = 2; }
    else if (u_layerOpacity > 0.84 && u_layerOpacity < 0.86) { layerIndex = 3; }
    else if (u_layerOpacity > 0.59 && u_layerOpacity < 0.61) { layerIndex = 4; }

    // Layer color
    float globalIntensity = u_hue;
    float colorTime = timeSpeed * 2.0 + valueFinal * 3.0 + globalIntensity * 5.0;
    vec3 layerColor = getLayerColorPalette(layerIndex, colorTime) * (0.5 + globalIntensity * 1.5);

    // Per-layer intensity modulation
    vec3 finalColor;
    if (layerIndex == 0) {
        finalColor = layerColor * (0.3 + geometryIntensity * 0.4);
    } else if (layerIndex == 1) {
        float shadowIntensity = pow(1.0 - geometryIntensity, 2.0);
        finalColor = layerColor * (shadowIntensity * 0.8 + 0.1);
    } else if (layerIndex == 2) {
        finalColor = layerColor * (geometryIntensity * 1.2 + 0.2);
    } else if (layerIndex == 3) {
        float peakIntensity = pow(geometryIntensity, 3.0);
        finalColor = layerColor * (peakIntensity * 1.5 + 0.1);
    } else {
        float randomBurst = sin(valueFinal * 50.0 + timeSpeed * 10.0) * 0.5 + 0.5;
        finalColor = layerColor * (randomBurst * geometryIntensity * 2.0 + 0.05);
    }

    // Layer alpha
    float layerAlpha;
    if (layerIndex == 0) { layerAlpha = 0.6; }
    else if (layerIndex == 1) { layerAlpha = 0.4; }
    else if (layerIndex == 2) { layerAlpha = 1.0; }
    else if (layerIndex == 3) { layerAlpha = 0.8; }
    else { layerAlpha = 0.3; }

    gl_FragColor = vec4(finalColor, finalIntensity * layerAlpha);
}
