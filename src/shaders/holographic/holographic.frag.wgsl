// VIB3+ Holographic System Fragment Shader (WGSL)
// 5-layer glassmorphic audio-reactive effects
// Port of the GLSL HolographicVisualizer shader

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

fn apply6DRot(pos: vec4<f32>) -> vec4<f32> {
    var p = pos;
    p = rotateXY(u.rot4dXY + u.time * 0.05) * p;
    p = rotateXZ(u.rot4dXZ + u.time * 0.06) * p;
    p = rotateYZ(u.rot4dYZ + u.time * 0.04) * p;
    p = rotateXW(u.rot4dXW + u.time * 0.07) * p;
    p = rotateYW(u.rot4dYW + u.time * 0.08) * p;
    p = rotateZW(u.rot4dZW + u.time * 0.09) * p;
    return p;
}

// ========== 24 Geometry SDFs ==========
fn baseGeometry(p: vec4<f32>, t: f32) -> f32 {
    if (t < 0.5) {
        return max(max(max(abs(p.x + p.y) - p.z, abs(p.x - p.y) - p.z),
                       abs(p.x + p.y) + p.z), abs(p.x - p.y) + p.z) / sqrt(3.0);
    } else if (t < 1.5) {
        let q = abs(p) - vec4<f32>(0.8);
        return length(max(q, vec4<f32>(0.0))) + min(max(max(max(q.x, q.y), q.z), q.w), 0.0);
    } else if (t < 2.5) {
        return length(p) - 1.0;
    } else if (t < 3.5) {
        let t2 = vec2<f32>(length(p.xy) - 0.8, p.z);
        return length(t2) - 0.3;
    } else if (t < 4.5) {
        let r = length(p.xy);
        return abs(r - 0.7) - 0.2 + sin(atan2(p.y, p.x) * 3.0 + p.z * 5.0) * 0.1;
    } else if (t < 5.5) {
        return length(p) - 0.8 + sin(p.x * 5.0) * sin(p.y * 5.0) * sin(p.z * 5.0) * 0.2;
    } else if (t < 6.5) {
        return abs(p.z - sin(p.x * 5.0 + u.time) * cos(p.y * 5.0 + u.time) * 0.3) - 0.1;
    } else {
        let q = abs(p);
        return max(max(max(q.x, q.y), q.z), q.w) - 0.8;
    }
}

fn geom(p: vec4<f32>, t: f32) -> f32 {
    if (t < 8.0) { return baseGeometry(p, t); }
    else if (t < 16.0) { return max(baseGeometry(p, t - 8.0), length(p) - 1.2); }
    else {
        let tf = max(max(max(
            abs(p.x + p.y) - p.z - p.w,
            abs(p.x - p.y) - p.z + p.w),
            abs(p.x + p.y) + p.z - p.w),
            abs(p.x - p.y) + p.z + p.w) / sqrt(4.0);
        return max(baseGeometry(p, t - 16.0), tf);
    }
}

// ========== HSL to RGB ==========
fn hue2rgb(p: f32, q: f32, tin: f32) -> f32 {
    var t = tin;
    if (t < 0.0) { t += 1.0; }
    if (t > 1.0) { t -= 1.0; }
    if (t < 1.0 / 6.0) { return p + (q - p) * 6.0 * t; }
    if (t < 1.0 / 2.0) { return q; }
    if (t < 2.0 / 3.0) { return p + (q - p) * (2.0 / 3.0 - t) * 6.0; }
    return p;
}

fn hslToRgb(h: f32, s: f32, l: f32) -> vec3<f32> {
    if (s == 0.0) { return vec3<f32>(l); }
    let q = select(l + s - l * s, l * (1.0 + s), l < 0.5);
    let p = 2.0 * l - q;
    return vec3<f32>(
        hue2rgb(p, q, h + 1.0 / 3.0),
        hue2rgb(p, q, h),
        hue2rgb(p, q, h - 1.0 / 3.0)
    );
}

// ========== Main Fragment ==========
@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    let fragCoord = input.position.xy;
    let uv = (fragCoord - 0.5 * u.resolution) / min(u.resolution.x, u.resolution.y);

    let density = u.densityMult;
    let spd = u.speedMult;

    // Create 4D point
    var pos = vec4<f32>(uv * 2.0 * density, sin(u.time * 0.3 * spd) * 0.5, cos(u.time * 0.2 * spd) * 0.5);
    pos = apply6DRot(pos);
    pos *= u.morphFactor;
    pos += vec4<f32>(sin(u.time * 0.1), cos(u.time * 0.15), sin(u.time * 0.12), cos(u.time * 0.18)) * u.chaos;

    // Geometry evaluation
    let dist = geom(pos, u.geometry);
    let edge = smoothstep(0.02, 0.0, abs(dist));
    let fill = smoothstep(0.1, 0.0, dist) * 0.3;

    // Color from HSL
    // colorShift is baked into layerColor; use hue directly
    let hueVal = u.hue / 360.0;
    let sat = clamp(u.saturation, 0.0, 1.0);
    let lightness = clamp(u.intensity, 0.2, 0.8);
    let color = hslToRgb(hueVal, sat, lightness);

    // Final alpha
    let alpha = (edge + fill) * u.intensity * u.layerOpacity;
    return vec4<f32>(color * alpha, alpha);
}
