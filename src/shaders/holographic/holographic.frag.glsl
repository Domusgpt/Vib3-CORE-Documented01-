// VIB3+ Holographic System Fragment Shader (GLSL)
// 5-layer glassmorphic audio-reactive effects
// Port of the WGSL HolographicVisualizer shader
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

vec4 apply6DRotation(vec4 pos) {
    pos = rotateXY(u_rot4dXY + u_time * 0.05) * pos;
    pos = rotateXZ(u_rot4dXZ + u_time * 0.06) * pos;
    pos = rotateYZ(u_rot4dYZ + u_time * 0.04) * pos;
    pos = rotateXW(u_rot4dXW + u_time * 0.07) * pos;
    pos = rotateYW(u_rot4dYW + u_time * 0.08) * pos;
    pos = rotateZW(u_rot4dZW + u_time * 0.09) * pos;
    return pos;
}

// ========== 24 Geometry SDFs ==========
float baseGeometry(vec4 p, float type) {
    if (type < 0.5) {
        return max(max(max(abs(p.x + p.y) - p.z, abs(p.x - p.y) - p.z),
                           abs(p.x + p.y) + p.z), abs(p.x - p.y) + p.z) / sqrt(3.0);
    } else if (type < 1.5) {
        vec4 q = abs(p) - 0.8;
        return length(max(q, 0.0)) + min(max(max(max(q.x, q.y), q.z), q.w), 0.0);
    } else if (type < 2.5) {
        return length(p) - 1.0;
    } else if (type < 3.5) {
        vec2 t = vec2(length(p.xy) - 0.8, p.z);
        return length(t) - 0.3;
    } else if (type < 4.5) {
        float r = length(p.xy);
        return abs(r - 0.7) - 0.2 + sin(atan(p.y, p.x) * 3.0 + p.z * 5.0) * 0.1;
    } else if (type < 5.5) {
        return length(p) - 0.8 + sin(p.x * 5.0) * sin(p.y * 5.0) * sin(p.z * 5.0) * 0.2;
    } else if (type < 6.5) {
        return abs(p.z - sin(p.x * 5.0 + u_time) * cos(p.y * 5.0 + u_time) * 0.3) - 0.1;
    } else {
        vec4 q = abs(p);
        return max(max(max(q.x, q.y), q.z), q.w) - 0.8;
    }
}

float geometry(vec4 p, float type) {
    if (type < 8.0) {
        return baseGeometry(p, type);
    } else if (type < 16.0) {
        return max(baseGeometry(p, type - 8.0), length(p) - 1.2);
    } else {
        float tetraField = max(max(max(
            abs(p.x + p.y) - p.z - p.w,
            abs(p.x - p.y) - p.z + p.w),
            abs(p.x + p.y) + p.z - p.w),
            abs(p.x - p.y) + p.z + p.w) / sqrt(4.0);
        return max(baseGeometry(p, type - 16.0), tetraField);
    }
}

// ========== HSL to RGB ==========
float hue2rgb(float p, float q, float t) {
    float tt = t;
    if (tt < 0.0) tt += 1.0;
    if (tt > 1.0) tt -= 1.0;
    if (tt < 1.0 / 6.0) return p + (q - p) * 6.0 * tt;
    if (tt < 1.0 / 2.0) return q;
    if (tt < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - tt) * 6.0;
    return p;
}

vec3 hslToRgb(float h, float s, float l) {
    if (s == 0.0) return vec3(l);
    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;
    return vec3(
        hue2rgb(p, q, h + 1.0 / 3.0),
        hue2rgb(p, q, h),
        hue2rgb(p, q, h - 1.0 / 3.0)
    );
}

// ========== Main Fragment ==========
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    float density = u_densityMult;
    float spd = u_speedMult;

    // Create 4D point
    vec4 pos = vec4(uv * 2.0 * density, sin(u_time * 0.3 * spd) * 0.5, cos(u_time * 0.2 * spd) * 0.5);
    pos = apply6DRotation(pos);
    pos *= u_morphFactor;
    pos += vec4(sin(u_time * 0.1), cos(u_time * 0.15), sin(u_time * 0.12), cos(u_time * 0.18)) * u_chaos;

    // Geometry evaluation
    float dist = geometry(pos, u_geometry);
    float edge = smoothstep(0.02, 0.0, abs(dist));
    float fill = smoothstep(0.1, 0.0, dist) * 0.3;

    // Color from HSL
    float hueVal = u_hue / 360.0;
    float sat = clamp(u_saturation, 0.0, 1.0);
    float lightness = clamp(u_intensity, 0.2, 0.8);
    vec3 color = hslToRgb(hueVal, sat, lightness);

    // Final alpha
    float alpha = (edge + fill) * u_intensity * u_layerOpacity;
    gl_FragColor = vec4(color * alpha, alpha);
}
