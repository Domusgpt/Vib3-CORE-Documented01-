// VIB3+ Common Uniform Declarations (GLSL)
// Shared across all visualization systems

#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_geometry;

// 6D Rotation (radians)
uniform float u_rot4dXY;
uniform float u_rot4dXZ;
uniform float u_rot4dYZ;
uniform float u_rot4dXW;
uniform float u_rot4dYW;
uniform float u_rot4dZW;

// Visual parameters
uniform float u_dimension;
uniform float u_gridDensity;
uniform float u_morphFactor;
uniform float u_chaos;
uniform float u_speed;
uniform float u_hue;
uniform float u_intensity;
uniform float u_saturation;

// Reactivity
uniform float u_mouseIntensity;
uniform float u_clickIntensity;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;

// Layer parameters (holographic multi-layer)
uniform float u_layerScale;
uniform float u_layerOpacity;
uniform vec3 u_layerColor;
uniform float u_densityMult;
uniform float u_speedMult;
