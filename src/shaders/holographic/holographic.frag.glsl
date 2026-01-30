// VIB3+ Holographic System Fragment Shader (GLSL)
// EXACT shader from HolographicVisualizer.js - 5-layer glassmorphic audio-reactive effects
// Enhanced volumetric lattice functions with holographic shimmer, moire, RGB glitch
// Supports 24 geometry variants: 8 base + 8 Hypersphere Core + 8 Hypertetrahedron Core

precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_geometry;
uniform float u_density;
uniform float u_speed;
uniform vec3 u_color;
uniform float u_intensity;
uniform float u_roleDensity;
uniform float u_roleSpeed;
uniform float u_colorShift;
uniform float u_chaosIntensity;
uniform float u_mouseIntensity;
uniform float u_clickIntensity;
uniform float u_densityVariation;
uniform float u_geometryType;
uniform float u_chaos;
uniform float u_morph;
uniform float u_touchMorph;
uniform float u_touchChaos;
uniform float u_scrollParallax;
uniform float u_gridDensityShift;
uniform float u_colorScrollShift;
uniform float u_audioDensityBoost;
uniform float u_audioMorphBoost;
uniform float u_audioSpeedBoost;
uniform float u_audioChaosBoost;
uniform float u_audioColorShift;
uniform float u_rot4dXY;
uniform float u_rot4dXZ;
uniform float u_rot4dYZ;
uniform float u_rot4dXW;
uniform float u_rot4dYW;
uniform float u_rot4dZW;

// 6D rotation matrices - 3D space rotations (XY, XZ, YZ)
mat4 rotateXY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat4(c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
}

mat4 rotateXZ(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat4(c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1);
}

mat4 rotateYZ(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat4(1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1);
}

// 4D hyperspace rotations (XW, YW, ZW)
mat4 rotateXW(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat4(c, 0, 0, -s, 0, 1, 0, 0, 0, 0, 1, 0, s, 0, 0, c);
}

mat4 rotateYW(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat4(1, 0, 0, 0, 0, c, 0, -s, 0, 0, 1, 0, 0, s, 0, c);
}

mat4 rotateZW(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, c, -s, 0, 0, s, c);
}

// 4D to 3D projection
vec3 project4Dto3D(vec4 p) {
    float w = 2.5 / (2.5 + p.w);
    return vec3(p.x * w, p.y * w, p.z * w);
}

// ========================================
// POLYTOPE CORE WARP FUNCTIONS (24 Geometries)
// ========================================
vec3 warpHypersphereCore(vec3 p, int geometryIndex, vec2 mouseDelta) {
    float radius = length(p);
    float morphBlend = clamp(u_morph * 0.6 + 0.3, 0.0, 2.0);
    float w = sin(radius * (1.3 + float(geometryIndex) * 0.12) + u_time * 0.0008 * u_speed);
    w *= (0.4 + morphBlend * 0.45);

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

vec3 warpHypertetraCore(vec3 p, int geometryIndex, vec2 mouseDelta) {
    vec3 c1 = normalize(vec3(1.0, 1.0, 1.0));
    vec3 c2 = normalize(vec3(-1.0, -1.0, 1.0));
    vec3 c3 = normalize(vec3(-1.0, 1.0, -1.0));
    vec3 c4 = normalize(vec3(1.0, -1.0, -1.0));

    float morphBlend = clamp(u_morph * 0.8 + 0.2, 0.0, 2.0);
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

vec3 applyCoreWarp(vec3 p, float geometryType, vec2 mouseDelta) {
    float totalBase = 8.0;
    float coreFloat = floor(geometryType / totalBase);
    int coreIndex = int(clamp(coreFloat, 0.0, 2.0));
    float baseGeomFloat = geometryType - floor(geometryType / totalBase) * totalBase;
    int geometryIndex = int(clamp(floor(baseGeomFloat + 0.5), 0.0, totalBase - 1.0));

    if (coreIndex == 1) {
        return warpHypersphereCore(p, geometryIndex, mouseDelta);
    }
    if (coreIndex == 2) {
        return warpHypertetraCore(p, geometryIndex, mouseDelta);
    }
    return p;
}
// ========================================

// Enhanced VIB3 Geometry Library - Higher Fidelity
float tetrahedronLattice(vec3 p, float gridSize) {
    vec3 q = fract(p * gridSize) - 0.5;

    // Enhanced tetrahedron vertices with holographic shimmer
    float d1 = length(q);
    float d2 = length(q - vec3(0.35, 0.0, 0.0));
    float d3 = length(q - vec3(0.0, 0.35, 0.0));
    float d4 = length(q - vec3(0.0, 0.0, 0.35));
    float d5 = length(q - vec3(0.2, 0.2, 0.0));
    float d6 = length(q - vec3(0.2, 0.0, 0.2));
    float d7 = length(q - vec3(0.0, 0.2, 0.2));

    float vertices = 1.0 - smoothstep(0.0, 0.03, min(min(min(d1, d2), min(d3, d4)), min(min(d5, d6), d7)));

    // Enhanced edge network with interference patterns
    float edges = 0.0;
    float shimmer = sin(u_time * 0.002) * 0.02;
    edges = max(edges, 1.0 - smoothstep(0.0, 0.015, abs(length(q.xy) - (0.18 + shimmer))));
    edges = max(edges, 1.0 - smoothstep(0.0, 0.015, abs(length(q.yz) - (0.18 + shimmer * 0.8))));
    edges = max(edges, 1.0 - smoothstep(0.0, 0.015, abs(length(q.xz) - (0.18 + shimmer * 1.2))));

    // Add interference patterns between vertices
    float interference = sin(d1 * 25.0 + u_time * 0.003) * sin(d2 * 22.0 + u_time * 0.0025) * 0.1;

    // Volumetric density based on distance field
    float volume = exp(-length(q) * 3.0) * 0.15;

    return max(vertices, edges * 0.7) + interference + volume;
}

float hypercubeLattice(vec3 p, float gridSize) {
    vec3 grid = fract(p * gridSize);
    vec3 q = grid - 0.5;

    // Enhanced hypercube with 4D projection effects
    vec3 edges = 1.0 - smoothstep(0.0, 0.025, abs(q));
    float wireframe = max(max(edges.x, edges.y), edges.z);

    // Add 4D hypercube vertices (8 corners + 8 hypervertices)
    float vertices = 0.0;
    for(int i = 0; i < 8; i++) {
        // WebGL 1.0 compatible modulus replacement
        float iFloat = float(i);
        vec3 corner = vec3(
            floor(iFloat - floor(iFloat / 2.0) * 2.0) - 0.5,
            floor((iFloat / 2.0) - floor((iFloat / 2.0) / 2.0) * 2.0) - 0.5,
            float(i / 4) - 0.5
        );
        float dist = length(q - corner * 0.4);
        vertices = max(vertices, 1.0 - smoothstep(0.0, 0.04, dist));
    }

    // Holographic interference patterns
    float interference = sin(length(q) * 20.0 + u_time * 0.002) * 0.08;

    // Cross-dimensional glow
    float glow = exp(-length(q) * 2.5) * 0.12;

    return wireframe * 0.8 + vertices + interference + glow;
}

float sphereLattice(vec3 p, float gridSize) {
    vec3 q = fract(p * gridSize) - 0.5;
    float r = length(q);
    return 1.0 - smoothstep(0.2, 0.5, r);
}

float torusLattice(vec3 p, float gridSize) {
    vec3 q = fract(p * gridSize) - 0.5;
    float r1 = sqrt(q.x*q.x + q.y*q.y);
    float r2 = sqrt((r1 - 0.3)*(r1 - 0.3) + q.z*q.z);
    return 1.0 - smoothstep(0.0, 0.1, r2);
}

float kleinLattice(vec3 p, float gridSize) {
    vec3 q = fract(p * gridSize);
    float ku = q.x * 2.0 * 3.14159;
    float kv = q.y * 2.0 * 3.14159;
    float kx = cos(ku) * (3.0 + cos(ku/2.0) * sin(kv) - sin(ku/2.0) * sin(2.0*kv));
    float klein = length(vec2(kx, q.z)) - 0.1;
    return 1.0 - smoothstep(0.0, 0.05, abs(klein));
}

float fractalLattice(vec3 p, float gridSize) {
    vec3 q = p * gridSize;
    float scale = 1.0;
    float fractal = 0.0;
    for(int i = 0; i < 4; i++) {
      q = fract(q) - 0.5;
      fractal += abs(length(q)) / scale;
      scale *= 2.0;
      q *= 2.0;
    }
    return 1.0 - smoothstep(0.0, 1.0, fractal);
}

float waveLattice(vec3 p, float gridSize) {
    vec3 q = p * gridSize;
    float wave = sin(q.x * 2.0) * sin(q.y * 2.0) * sin(q.z * 2.0 + u_time);
    return smoothstep(-0.5, 0.5, wave);
}

float crystalLattice(vec3 p, float gridSize) {
    vec3 q = fract(p * gridSize) - 0.5;
    float d = max(max(abs(q.x), abs(q.y)), abs(q.z));
    return 1.0 - smoothstep(0.3, 0.5, d);
}

float getDynamicGeometry(vec3 p, float gridSize, float geometryType) {
    // Apply polytope core warp transformation (24-geometry system)
    vec3 warped = applyCoreWarp(p, geometryType, vec2(0.0, 0.0));

    // WebGL 1.0 compatible modulus replacement - decode base geometry
    float baseGeomFloat = geometryType - floor(geometryType / 8.0) * 8.0;
    int baseGeom = int(baseGeomFloat);
    float variation = floor(geometryType / 8.0) / 4.0;
    float variedGridSize = gridSize * (0.5 + variation * 1.5);

    // Call lattice functions with warped point (enables 24 geometry variants)
    if (baseGeom == 0) return tetrahedronLattice(warped, variedGridSize);
    else if (baseGeom == 1) return hypercubeLattice(warped, variedGridSize);
    else if (baseGeom == 2) return sphereLattice(warped, variedGridSize);
    else if (baseGeom == 3) return torusLattice(warped, variedGridSize);
    else if (baseGeom == 4) return kleinLattice(warped, variedGridSize);
    else if (baseGeom == 5) return fractalLattice(warped, variedGridSize);
    else if (baseGeom == 6) return waveLattice(warped, variedGridSize);
    else return crystalLattice(warped, variedGridSize);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgbGlitch(vec3 color, vec2 uv, float intensity) {
    vec2 offset = vec2(intensity * 0.005, 0.0);
    float r = color.r + sin(uv.y * 30.0 + u_time * 0.001) * intensity * 0.06;
    float g = color.g + sin(uv.y * 28.0 + u_time * 0.0012) * intensity * 0.06;
    float b = color.b + sin(uv.y * 32.0 + u_time * 0.0008) * intensity * 0.06;
    return vec3(r, g, b);
}

float moirePattern(vec2 uv, float intensity) {
    float freq1 = 12.0 + intensity * 6.0 + u_densityVariation * 3.0;
    float freq2 = 14.0 + intensity * 8.0 + u_densityVariation * 4.0;
    float pattern1 = sin(uv.x * freq1) * sin(uv.y * freq1);
    float pattern2 = sin(uv.x * freq2) * sin(uv.y * freq2);
    return (pattern1 * pattern2) * intensity * 0.15;
}

float gridOverlay(vec2 uv, float intensity) {
    vec2 grid = fract(uv * (8.0 + u_densityVariation * 4.0));
    float lines = 0.0;
    lines = max(lines, 1.0 - smoothstep(0.0, 0.02, abs(grid.x - 0.5)));
    lines = max(lines, 1.0 - smoothstep(0.0, 0.02, abs(grid.y - 0.5)));
    return lines * intensity * 0.1;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float aspectRatio = u_resolution.x / u_resolution.y;
    uv.x *= aspectRatio;
    uv -= 0.5;

    float time = u_time * 0.0004 * u_speed * u_roleSpeed;

    float mouseInfluence = u_mouseIntensity * 0.25;
    vec2 mouseOffset = (u_mouse - 0.5) * mouseInfluence;

    float parallaxOffset = u_scrollParallax * 0.2;
    vec2 scrollOffset = vec2(parallaxOffset * 0.1, parallaxOffset * 0.05);

    float morphOffset = u_touchMorph * 0.3;

    vec4 p4d = vec4(uv + mouseOffset * 0.1 + scrollOffset,
                   sin(time * 0.1 + morphOffset) * 0.15,
                   cos(time * 0.08 + morphOffset * 0.5) * 0.15);

    float scrollRotation = u_scrollParallax * 0.1;
    float touchRotation = u_touchMorph * 0.2;

    // Combine manual rotation with automatic/interactive rotation - 6D full rotation
    p4d = rotateXY(u_rot4dXY + time * 0.1) * p4d;
    p4d = rotateXZ(u_rot4dXZ + time * 0.12) * p4d;
    p4d = rotateYZ(u_rot4dYZ + time * 0.08) * p4d;
    p4d = rotateXW(u_rot4dXW + time * 0.2 + mouseOffset.y * 0.5 + scrollRotation) * p4d;
    p4d = rotateYW(u_rot4dYW + time * 0.15 + mouseOffset.x * 0.5 + touchRotation) * p4d;
    p4d = rotateZW(u_rot4dZW + time * 0.25 + u_clickIntensity * 0.3 + u_touchChaos * 0.4) * p4d;

    vec3 p = project4Dto3D(p4d);

    float scrollDensityMod = 1.0 + u_gridDensityShift * 0.3;
    float audioDensityMod = 1.0 + u_audioDensityBoost * 0.5;
    // Controlled density calculation
    float baseDensity = u_density * u_roleDensity;
    float densityVariations = (u_densityVariation * 0.3 + (scrollDensityMod - 1.0) * 0.4 + (audioDensityMod - 1.0) * 0.2);
    float roleDensity = baseDensity + densityVariations;

    float morphedGeometry = u_geometryType + u_morph * 3.0 + u_touchMorph * 2.0 + u_audioMorphBoost * 1.5;
    float lattice = getDynamicGeometry(p, roleDensity, morphedGeometry);

    // Enhanced holographic color processing
    vec3 baseColor = u_color;
    float latticeIntensity = lattice * u_intensity;

    // Multi-layer color composition for higher fidelity
    vec3 color = baseColor * (0.2 + latticeIntensity * 0.8);

    // Holographic shimmer layers
    vec3 shimmer1 = baseColor * lattice * 0.5;
    vec3 shimmer2 = baseColor * sin(lattice * 8.0 + u_time * 0.001) * 0.2;
    vec3 shimmer3 = baseColor * cos(lattice * 12.0 + u_time * 0.0008) * 0.15;

    color += shimmer1 + shimmer2 + shimmer3;

    // Enhanced brightness variations with interference
    color += vec3(lattice * 0.6) * baseColor;
    color += vec3(sin(lattice * 15.0) * 0.1) * baseColor;

    // Depth-based coloring for 3D effect
    float depth = 1.0 - length(p) * 0.3;
    color *= (0.7 + depth * 0.3);

    float enhancedChaos = u_chaos + u_chaosIntensity + u_touchChaos * 0.3 + u_audioChaosBoost * 0.4;
    color += vec3(moirePattern(uv + scrollOffset, enhancedChaos));
    color += vec3(gridOverlay(uv, u_mouseIntensity + u_scrollParallax * 0.1));
    color = rgbGlitch(color, uv, enhancedChaos);

    // Apply morph distortion to position
    vec2 morphDistortion = vec2(sin(uv.y * 10.0 + u_time * 0.001) * u_morph * 0.1,
                               cos(uv.x * 10.0 + u_time * 0.001) * u_morph * 0.1);
    color = mix(color, color * (1.0 + length(morphDistortion)), u_morph * 0.5);

    // Enhanced holographic interaction effects
    float mouseDist = length(uv - (u_mouse - 0.5) * vec2(aspectRatio, 1.0));

    // Multi-layer mouse glow with holographic ripples
    float mouseGlow = exp(-mouseDist * 1.2) * u_mouseIntensity * 0.25;
    float mouseRipple = sin(mouseDist * 15.0 - u_time * 0.003) * exp(-mouseDist * 2.0) * u_mouseIntensity * 0.1;
    color += vec3(mouseGlow + mouseRipple) * baseColor * 0.8;

    // Enhanced click pulse with interference
    float clickPulse = u_clickIntensity * exp(-mouseDist * 1.8) * 0.4;
    float clickRing = sin(mouseDist * 20.0 - u_clickIntensity * 5.0) * u_clickIntensity * 0.15;
    color += vec3(clickPulse + clickRing, (clickPulse + clickRing) * 0.6, (clickPulse + clickRing) * 1.2);

    // Holographic interference from interactions
    float interference = sin(mouseDist * 25.0 + u_time * 0.002) * u_mouseIntensity * 0.05;
    color += vec3(interference) * baseColor;

    gl_FragColor = vec4(color, 0.95);
}
