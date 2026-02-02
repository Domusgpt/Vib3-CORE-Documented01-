/**
 * VIB3+ Three.js ShaderMaterial Integration
 *
 * Generates Three.js-compatible ShaderMaterial configuration objects that bring
 * VIB3+ 4D visualization shaders into any Three.js scene. Supports all three
 * rendering systems (Quantum, Faceted, Holographic) with full 6D rotation,
 * 24 geometry variants, and animation update methods.
 *
 * Usage:
 *   import { Vib3ThreeJsPackage } from '@vib3/integrations';
 *   const materialConfig = Vib3ThreeJsPackage.getShaderMaterial({ system: 'faceted' });
 *   const material = new THREE.ShaderMaterial(materialConfig);
 *   const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
 *   scene.add(mesh);
 *
 *   // In your animation loop:
 *   materialConfig.update(clock.getElapsedTime() * 1000);
 *
 * @module Vib3ThreeJsPackage
 * @version 1.0.0
 * @license All Rights Reserved - Clear Seas Solutions LLC
 */

/**
 * Standard VIB3+ uniform definitions with Three.js-compatible structure.
 * Each uniform is defined with { value: defaultValue }.
 * @constant {Object}
 */
const UNIFORM_DEFAULTS = {
    u_time: 0.0,
    u_resolution: [1024.0, 1024.0],
    u_geometry: 0.0,
    u_gridDensity: 15.0,
    u_morphFactor: 1.0,
    u_chaos: 0.2,
    u_speed: 1.0,
    u_hue: 200.0 / 360.0,
    u_intensity: 0.5,
    u_saturation: 0.8,
    u_dimension: 3.5,
    u_rot4dXY: 0.0,
    u_rot4dXZ: 0.0,
    u_rot4dYZ: 0.0,
    u_rot4dXW: 0.0,
    u_rot4dYW: 0.0,
    u_rot4dZW: 0.0,
    u_mouseIntensity: 0.0,
    u_clickIntensity: 0.0,
    u_bass: 0.0,
    u_mid: 0.0,
    u_high: 0.0
};

/**
 * Three.js ShaderMaterial integration for VIB3+ visualization engine.
 *
 * Generates complete vertex and fragment shader source code along with
 * uniform definitions compatible with THREE.ShaderMaterial.
 *
 * @class
 */
export class Vib3ThreeJsPackage {
    /**
     * Returns a complete Three.js ShaderMaterial configuration object.
     *
     * The returned object can be passed directly to `new THREE.ShaderMaterial(config)`.
     * It includes:
     * - vertexShader: Full-screen quad or mesh-compatible vertex shader
     * - fragmentShader: VIB3+ procedural fragment shader for the selected system
     * - uniforms: All VIB3 parameters as THREE.Uniform-compatible objects
     * - transparent: true (for compositing with scene)
     * - update(timeMs): Method to call each frame for animation
     * - setParameter(name, value): Method to update a single parameter
     * - setParameters(params): Method to update multiple parameters
     *
     * @param {object} [options={}] - Material configuration options
     * @param {string} [options.system='faceted'] - VIB3 system: 'quantum' | 'faceted' | 'holographic'
     * @param {boolean} [options.transparent=true] - Enable transparency
     * @param {boolean} [options.depthWrite=false] - Write to depth buffer
     * @param {boolean} [options.depthTest=true] - Test against depth buffer
     * @param {number} [options.width=1024] - Initial resolution width
     * @param {number} [options.height=1024] - Initial resolution height
     * @param {object} [options.initialParams={}] - Initial parameter overrides
     * @returns {object} Three.js ShaderMaterial configuration
     * @example
     * const config = Vib3ThreeJsPackage.getShaderMaterial({ system: 'quantum', width: 800, height: 600 });
     * const material = new THREE.ShaderMaterial(config);
     * // In animation loop:
     * config.update(performance.now());
     */
    static getShaderMaterial(options = {}) {
        const system = options.system || 'faceted';
        const width = options.width || 1024;
        const height = options.height || 1024;
        const initialParams = options.initialParams || {};

        // Build uniforms object
        const uniforms = {};
        for (const [key, defaultValue] of Object.entries(UNIFORM_DEFAULTS)) {
            if (key === 'u_resolution') {
                uniforms[key] = { value: [width, height] };
            } else {
                uniforms[key] = { value: defaultValue };
            }
        }

        // Apply initial parameter overrides
        const paramToUniform = {
            geometry: 'u_geometry', gridDensity: 'u_gridDensity',
            morphFactor: 'u_morphFactor', chaos: 'u_chaos', speed: 'u_speed',
            intensity: 'u_intensity', saturation: 'u_saturation',
            dimension: 'u_dimension',
            rot4dXY: 'u_rot4dXY', rot4dXZ: 'u_rot4dXZ', rot4dYZ: 'u_rot4dYZ',
            rot4dXW: 'u_rot4dXW', rot4dYW: 'u_rot4dYW', rot4dZW: 'u_rot4dZW',
            mouseIntensity: 'u_mouseIntensity', clickIntensity: 'u_clickIntensity',
            bass: 'u_bass', mid: 'u_mid', high: 'u_high'
        };

        // Hue is special: stored as 0-360 externally, 0-1 internally
        if ('hue' in initialParams) {
            uniforms.u_hue.value = initialParams.hue / 360.0;
        }

        for (const [param, uniform] of Object.entries(paramToUniform)) {
            if (param in initialParams && typeof initialParams[param] === 'number') {
                uniforms[uniform].value = initialParams[param];
            }
        }

        const vertexShader = Vib3ThreeJsPackage.getVertexShader();
        const fragmentShader = Vib3ThreeJsPackage.getFragmentShader(system);

        const config = {
            vertexShader,
            fragmentShader,
            uniforms,
            transparent: options.transparent !== false,
            depthWrite: options.depthWrite || false,
            depthTest: options.depthTest !== false,
            side: 2, // THREE.DoubleSide

            /**
             * Update the time uniform. Call this each frame in your animation loop.
             * @param {number} timeMs - Current time in milliseconds (e.g. performance.now())
             */
            update(timeMs) {
                uniforms.u_time.value = timeMs;
            },

            /**
             * Set a single VIB3 parameter on the material.
             * @param {string} name - Parameter name (e.g. 'hue', 'geometry', 'rot4dXW')
             * @param {number} value - Parameter value
             */
            setParameter(name, value) {
                if (name === 'hue') {
                    uniforms.u_hue.value = value / 360.0;
                    return;
                }
                const uniformName = paramToUniform[name] || ('u_' + name);
                if (uniforms[uniformName]) {
                    uniforms[uniformName].value = value;
                }
            },

            /**
             * Set multiple VIB3 parameters at once.
             * @param {object} params - Object of name/value parameter pairs
             */
            setParameters(params) {
                for (const [name, value] of Object.entries(params)) {
                    if (typeof value === 'number' && Number.isFinite(value)) {
                        config.setParameter(name, value);
                    }
                }
            },

            /**
             * Update the resolution uniform (call on window resize).
             * @param {number} w - Width in pixels
             * @param {number} h - Height in pixels
             */
            setResolution(w, h) {
                uniforms.u_resolution.value = [w, h];
            },

            /**
             * Set audio reactivity levels.
             * @param {number} bass - Bass level (0-1)
             * @param {number} mid - Mid level (0-1)
             * @param {number} high - High level (0-1)
             */
            setAudio(bass, mid, high) {
                uniforms.u_bass.value = bass;
                uniforms.u_mid.value = mid;
                uniforms.u_high.value = high;
            }
        };

        return config;
    }

    /**
     * Returns the Three.js-compatible vertex shader source code.
     *
     * This vertex shader passes through UV coordinates and position data
     * for a full-screen quad or arbitrary mesh geometry.
     *
     * @returns {string} GLSL vertex shader source
     */
    static getVertexShader() {
        return `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
    }

    /**
     * Returns the VIB3+ fragment shader source for the specified system.
     *
     * Supports all three systems:
     * - 'faceted': Clean geometric patterns with 4D rotation
     * - 'quantum': Complex lattice with holographic effects
     * - 'holographic': 5-layer glassmorphic rendering (single-layer variant)
     *
     * All shaders include:
     * - Full 6D rotation matrices (XY, XZ, YZ, XW, YW, ZW)
     * - 4D perspective projection
     * - 24 geometry variants (8 base x 3 core types)
     * - HSL color control with user hue/saturation
     * - Audio reactivity uniforms
     *
     * @param {string} [system='faceted'] - VIB3 system name
     * @returns {string} GLSL fragment shader source
     */
    static getFragmentShader(system = 'faceted') {
        // Common shader preamble: precision, uniforms, rotation matrices
        const preamble = `
precision highp float;

varying vec2 vUv;
varying vec3 vPosition;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_geometry;
uniform float u_gridDensity;
uniform float u_morphFactor;
uniform float u_chaos;
uniform float u_speed;
uniform float u_hue;
uniform float u_intensity;
uniform float u_saturation;
uniform float u_dimension;
uniform float u_rot4dXY;
uniform float u_rot4dXZ;
uniform float u_rot4dYZ;
uniform float u_rot4dXW;
uniform float u_rot4dYW;
uniform float u_rot4dZW;
uniform float u_mouseIntensity;
uniform float u_clickIntensity;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;

// ---- 6D Rotation Matrices ----
mat4 rotateXY(float a) { float c=cos(a),s=sin(a); return mat4(c,-s,0,0, s,c,0,0, 0,0,1,0, 0,0,0,1); }
mat4 rotateXZ(float a) { float c=cos(a),s=sin(a); return mat4(c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1); }
mat4 rotateYZ(float a) { float c=cos(a),s=sin(a); return mat4(1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1); }
mat4 rotateXW(float a) { float c=cos(a),s=sin(a); return mat4(c,0,0,-s, 0,1,0,0, 0,0,1,0, s,0,0,c); }
mat4 rotateYW(float a) { float c=cos(a),s=sin(a); return mat4(1,0,0,0, 0,c,0,-s, 0,0,1,0, 0,s,0,c); }
mat4 rotateZW(float a) { float c=cos(a),s=sin(a); return mat4(1,0,0,0, 0,1,0,0, 0,0,c,-s, 0,0,s,c); }

// ---- 4D Projection ----
vec3 project4Dto3D(vec4 p) {
    float w = 1.0 / (u_dimension - p.w);
    return p.xyz * w;
}

// ---- HSL to RGB ----
vec3 hsl2rgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float hp = h * 6.0;
    float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
    float m = l - c * 0.5;
    vec3 rgb;
    if (hp < 1.0) rgb = vec3(c, x, 0.0);
    else if (hp < 2.0) rgb = vec3(x, c, 0.0);
    else if (hp < 3.0) rgb = vec3(0.0, c, x);
    else if (hp < 4.0) rgb = vec3(0.0, x, c);
    else if (hp < 5.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
}

// ---- Core Warp Functions ----
vec3 warpHypersphere(vec3 p, float geomIdx) {
    float radius = length(p);
    float morph = clamp(u_morphFactor * 0.6 + (u_dimension - 3.0) * 0.25, 0.0, 2.0);
    float w = sin(radius * (1.3 + geomIdx * 0.12) + u_time * 0.0008 * u_speed) * (0.4 + morph * 0.45);
    vec4 p4 = vec4(p * (1.0 + morph * 0.2), w);
    p4 = rotateXY(u_rot4dXY) * rotateXZ(u_rot4dXZ) * rotateYZ(u_rot4dYZ) *
         rotateXW(u_rot4dXW) * rotateYW(u_rot4dYW) * rotateZW(u_rot4dZW) * p4;
    return mix(p, project4Dto3D(p4), clamp(0.45 + morph * 0.35, 0.0, 1.0));
}

vec3 warpHypertetra(vec3 p, float geomIdx) {
    vec3 c1 = normalize(vec3(1,1,1)), c2 = normalize(vec3(-1,-1,1));
    vec3 c3 = normalize(vec3(-1,1,-1)), c4 = normalize(vec3(1,-1,-1));
    float morph = clamp(u_morphFactor * 0.8 + (u_dimension - 3.0) * 0.2, 0.0, 2.0);
    float basis = dot(p, c1) * 0.14 + dot(p, c2) * 0.1 + dot(p, c3) * 0.08;
    float w = sin(basis * 5.5 + u_time * 0.0009 * u_speed) *
              cos(dot(p, c4) * 4.2 - u_time * 0.0007 * u_speed) * (0.5 + morph * 0.4);
    vec3 offset = vec3(dot(p, c1), dot(p, c2), dot(p, c3)) * 0.1 * morph;
    vec4 p4 = vec4(p + offset, w);
    p4 = rotateXY(u_rot4dXY) * rotateXZ(u_rot4dXZ) * rotateYZ(u_rot4dYZ) *
         rotateXW(u_rot4dXW) * rotateYW(u_rot4dYW) * rotateZW(u_rot4dZW) * p4;
    vec3 proj = project4Dto3D(p4);
    float plane = min(min(abs(dot(p, c1)), abs(dot(p, c2))), min(abs(dot(p, c3)), abs(dot(p, c4))));
    vec3 blended = mix(p, proj, clamp(0.45 + morph * 0.35, 0.0, 1.0));
    return mix(blended, blended * (1.0 - plane * 0.55), 0.2 + morph * 0.2);
}

vec3 applyCoreWarp(vec3 p, float geomType) {
    float coreF = floor(geomType / 8.0);
    int core = int(clamp(coreF, 0.0, 2.0));
    float baseF = mod(geomType, 8.0);
    if (core == 1) return warpHypersphere(p, baseF);
    if (core == 2) return warpHypertetra(p, baseF);
    return p;
}

// ---- Geometry Functions ----
float tetraLattice(vec3 p, float gs) { vec3 q = fract(p*gs)-0.5; float d1=length(q); float d2=length(q-vec3(0.4,0,0)); float d3=length(q-vec3(0,0.4,0)); float d4=length(q-vec3(0,0,0.4)); return max(1.0-smoothstep(0.0,0.04,min(min(d1,d2),min(d3,d4))), (1.0-smoothstep(0.0,0.02,abs(length(q.xy)-0.2)))*0.5); }
float cubeLattice(vec3 p, float gs) { vec3 g=fract(p*gs); vec3 e=min(g,1.0-g); return max((1.0-smoothstep(0.0,0.03,min(min(e.x,e.y),e.z)))*0.7, 1.0-smoothstep(0.45,0.5,max(max(abs(g.x-0.5),abs(g.y-0.5)),abs(g.z-0.5)))); }
float sphereLattice(vec3 p, float gs) { vec3 c=fract(p*gs)-0.5; return max(1.0-smoothstep(0.15,0.25,length(c)), (1.0-smoothstep(0.0,0.02,abs(length(c.xy)-0.3)))*0.6); }
float torusLattice(vec3 p, float gs) { vec3 c=fract(p*gs)-0.5; float td=length(vec2(length(c.xy)-0.3,c.z)); return 1.0-smoothstep(0.08,0.12,td); }
float kleinLattice(vec3 p, float gs) { vec3 c=fract(p*gs)-0.5; float u2=atan(c.y,c.x)/3.14159+1.0; float v2=c.z+0.5; vec3 kp=vec3((2.0+cos(u2*0.5))*cos(u2),(2.0+cos(u2*0.5))*sin(u2),sin(u2*0.5)+v2)*0.1; return 1.0-smoothstep(0.1,0.15,length(c-kp)); }
float fractalLattice(vec3 p, float gs) { vec3 c=abs(fract(p*gs)*2.0-1.0); float d=length(max(abs(c)-0.3,0.0)); for(int i=0;i<3;i++){c=abs(c*2.0-1.0);d=min(d,length(max(abs(c)-0.3,0.0))/pow(2.0,float(i+1)));} return 1.0-smoothstep(0.0,0.05,d); }
float waveLattice(vec3 p, float gs) { float t=u_time*0.001*u_speed; return (sin(p.x*gs*2.0+t*2.0)+sin(p.y*gs*1.8+t*1.5)+sin(p.z*gs*2.2+t*1.8))/6.0+0.5; }
float crystalLattice(vec3 p, float gs) { vec3 c=fract(p*gs)-0.5; float cr=max(max(abs(c.x)+abs(c.y),abs(c.y)+abs(c.z)),abs(c.x)+abs(c.z)); return max(1.0-smoothstep(0.3,0.4,cr), max(1.0-smoothstep(0.0,0.02,abs(abs(c.x)-0.35)), max(1.0-smoothstep(0.0,0.02,abs(abs(c.y)-0.35)), (1.0-smoothstep(0.0,0.02,abs(abs(c.z)-0.35)))))*0.5); }

float geometryFunc(vec3 wp, float gs) {
    float base = mod(u_geometry, 8.0);
    int gt = int(clamp(floor(base + 0.5), 0.0, 7.0));
    if (gt == 0) return tetraLattice(wp, gs);
    if (gt == 1) return cubeLattice(wp, gs);
    if (gt == 2) return sphereLattice(wp, gs);
    if (gt == 3) return torusLattice(wp, gs);
    if (gt == 4) return kleinLattice(wp, gs);
    if (gt == 5) return fractalLattice(wp, gs);
    if (gt == 6) return waveLattice(wp, gs);
    if (gt == 7) return crystalLattice(wp, gs);
    return cubeLattice(wp, gs);
}
`;

        // System-specific main() functions
        const systemMain = {
            faceted: `
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;

    float t = u_time * 0.0001 * u_speed;
    vec4 p = vec4(uv * 3.0, sin(t * 3.0), cos(t * 2.0));

    // Apply 6D rotation
    p = rotateXY(u_rot4dXY) * rotateXZ(u_rot4dXZ) * rotateYZ(u_rot4dYZ) *
        rotateXW(u_rot4dXW) * rotateYW(u_rot4dYW) * rotateZW(u_rot4dZW) * p;

    vec3 proj = project4Dto3D(p);
    vec3 warped = applyCoreWarp(proj, u_geometry);
    float gs = u_gridDensity * 0.08;

    float value = geometryFunc(warped, gs) * u_morphFactor;
    value += sin(proj.x * 7.0) * cos(proj.y * 11.0) * sin(proj.z * 13.0) * u_chaos;

    // Audio reactivity
    float audioBoost = u_bass * 0.3 + u_mid * 0.2 + u_high * 0.1;
    value += audioBoost;

    float gi = pow(1.0 - clamp(abs(value * 0.8), 0.0, 1.0), 1.5) * u_intensity;
    vec3 color = hsl2rgb(u_hue, u_saturation, 0.3 + gi * 0.5) * gi * 2.0;

    gl_FragColor = vec4(color, gi);
}
`,
            quantum: `
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;

    float t = u_time * 0.0001 * u_speed;
    vec4 p = vec4(uv * 3.0, sin(t * 3.0), cos(t * 2.0));

    // Apply 6D rotation
    p = rotateXY(u_rot4dXY) * rotateXZ(u_rot4dXZ) * rotateYZ(u_rot4dYZ) *
        rotateXW(u_rot4dXW) * rotateYW(u_rot4dYW) * rotateZW(u_rot4dZW) * p;

    vec3 proj = project4Dto3D(p);
    vec3 warped = applyCoreWarp(proj, u_geometry);
    float gs = u_gridDensity * 0.08;

    float value = geometryFunc(warped, gs) * u_morphFactor;
    float noise = sin(proj.x * 7.0) * cos(proj.y * 11.0) * sin(proj.z * 13.0);
    value += noise * u_chaos;

    // Audio reactivity (quantum-enhanced)
    float audioGrid = u_bass * 40.0;
    float audioMorph = u_mid * 1.2;
    value += u_bass * 0.4;

    float gi = pow(1.0 - clamp(abs(value * 0.8), 0.0, 1.0), 1.5);
    gi += u_clickIntensity * 0.3;

    // Holographic shimmer
    float shimmer = sin(uv.x * 20.0 + t * 50.0) * cos(uv.y * 15.0 + t * 30.0) * 0.1;
    gi += shimmer * gi;
    gi *= u_intensity;

    vec3 color = hsl2rgb(u_hue, u_saturation, 0.3 + gi * 0.5);

    // RGB separation for quantum effect
    float sep = gi * 0.05;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    color.r += sin(dist * 30.0 + angle * 10.0 + u_time * 0.004) * sep;
    color.g += cos(dist * 25.0 + angle * 8.0 + u_time * 0.0035) * sep * 0.9;
    color.b += sin(dist * 35.0 + angle * 12.0 + u_time * 0.0045) * sep * 1.1;

    gl_FragColor = vec4(color * gi * 2.0, gi);
}
`,
            holographic: `
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;

    float t = u_time * 0.0001 * u_speed;
    vec4 p = vec4(uv * 3.0, sin(t * 3.0), cos(t * 2.0));

    p = rotateXY(u_rot4dXY) * rotateXZ(u_rot4dXZ) * rotateYZ(u_rot4dYZ) *
        rotateXW(u_rot4dXW) * rotateYW(u_rot4dYW) * rotateZW(u_rot4dZW) * p;

    vec3 proj = project4Dto3D(p);
    vec3 warped = applyCoreWarp(proj, u_geometry);
    float gs = u_gridDensity * 0.08;

    float value = geometryFunc(warped, gs) * u_morphFactor;
    value += sin(proj.x * 7.0) * cos(proj.y * 11.0) * u_chaos * 0.3;

    // Audio reactivity
    value += u_bass * 0.5 + u_mid * 0.3;

    float gi = pow(clamp(value, 0.0, 1.0), 1.5) * u_intensity;

    // 5-layer holographic simulation (blended single pass)
    vec3 bgColor = hsl2rgb(u_hue, u_saturation * 0.7, 0.15) * (0.3 + gi * 0.4);
    vec3 contentColor = hsl2rgb(u_hue, u_saturation, 0.55) * (gi * 1.2 + 0.2);
    vec3 highlightColor = hsl2rgb(fract(u_hue + 0.15), u_saturation, 0.6) * pow(gi, 3.0) * 1.5;
    vec3 accentColor = hsl2rgb(fract(u_hue + 0.67), u_saturation, 0.5) * (sin(value * 50.0 + t * 100.0) * 0.5 + 0.5) * gi;

    // Glassmorphic blend
    float glassFresnelLike = pow(1.0 - abs(dot(normalize(vec3(uv, 1.0)), vec3(0.0, 0.0, 1.0))), 2.0);
    vec3 color = bgColor * 0.4 + contentColor * 0.5 + highlightColor * 0.3 + accentColor * 0.15;
    color += glassFresnelLike * hsl2rgb(fract(u_hue + 0.33), u_saturation * 0.9, 0.3) * 0.2;

    // Particle overlay
    vec2 particleUV = uv * 12.0;
    vec2 pid = floor(particleUV);
    float pDist = length(fract(particleUV) - 0.5);
    float pAlpha = sin(t * 30.0 + dot(pid, vec2(127.1, 311.7))) * 0.5 + 0.5;
    float particles = (1.0 - smoothstep(0.05, 0.2, pDist)) * pAlpha * 0.3;
    color += particles * hsl2rgb(fract(u_hue + 0.15), u_saturation * 0.5, 0.85);

    gl_FragColor = vec4(color, gi * 0.8 + 0.1);
}
`
        };

        const mainCode = systemMain[system] || systemMain.faceted;
        return preamble + mainCode;
    }

    /**
     * Returns the uniform definitions as a plain object.
     *
     * Keys are GLSL uniform names (e.g. 'u_time'), values are
     * objects with { value: defaultValue } suitable for Three.js.
     *
     * @returns {Object} Uniform definitions map
     */
    static getUniformsDefinition() {
        const uniforms = {};
        for (const [key, defaultValue] of Object.entries(UNIFORM_DEFAULTS)) {
            if (key === 'u_resolution') {
                uniforms[key] = { value: [...defaultValue] };
            } else {
                uniforms[key] = { value: defaultValue };
            }
        }
        return uniforms;
    }

    /**
     * Returns the list of available system names for fragment shaders.
     * @returns {string[]}
     */
    static getAvailableSystems() {
        return ['quantum', 'faceted', 'holographic'];
    }

    /**
     * Generates a complete NPM package structure for @vib3/three.
     *
     * @returns {Object.<string, string|object>} Map of file path to file content
     */
    static generatePackage() {
        return {
            'package.json': {
                name: '@vib3/three',
                version: '1.0.0',
                description: 'Three.js ShaderMaterial integration for VIB3+ 4D Visualization Engine',
                main: 'dist/index.js',
                module: 'src/index.js',
                types: 'dist/index.d.ts',
                files: ['dist/', 'src/'],
                exports: {
                    '.': {
                        import: './src/index.js',
                        require: './dist/index.cjs'
                    }
                },
                scripts: {
                    build: 'rollup -c',
                    dev: 'rollup -c -w',
                    prepublishOnly: 'npm run build'
                },
                peerDependencies: {
                    three: '>=0.150.0'
                },
                devDependencies: {
                    '@rollup/plugin-node-resolve': '^15.0.0',
                    rollup: '^4.0.0',
                    three: '^0.170.0'
                },
                keywords: ['vib3', 'three', 'threejs', '4d', 'shader', 'webgl', 'visualization', 'glsl'],
                license: 'MIT',
                repository: {
                    type: 'git',
                    url: 'https://github.com/clear-seas/vib3-three'
                },
                author: 'Clear Seas Solutions LLC'
            },

            'src/index.js': `/**
 * @vib3/three - Three.js ShaderMaterial integration for VIB3+ 4D Visualization Engine
 * @module @vib3/three
 */
export { Vib3ThreeJsPackage } from './Vib3ThreeJsPackage.js';
`,

            'src/Vib3ThreeJsPackage.js': `// Re-export from the main integration module
// In a standalone package, the full class would be inlined here.
export { Vib3ThreeJsPackage } from '../../integrations/ThreeJsPackage.js';
`,

            'README.md': `# @vib3/three

Three.js ShaderMaterial integration for the VIB3+ 4D Visualization Engine.

## Installation

\`\`\`bash
npm install @vib3/three three
\`\`\`

## Quick Start

\`\`\`javascript
import * as THREE from 'three';
import { Vib3ThreeJsPackage } from '@vib3/three';

// Create scene
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create VIB3 material
const config = Vib3ThreeJsPackage.getShaderMaterial({
    system: 'quantum',
    width: window.innerWidth,
    height: window.innerHeight,
    initialParams: { hue: 270, geometry: 12, intensity: 0.7 }
});

const material = new THREE.ShaderMaterial(config);
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(mesh);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    config.update(performance.now());
    renderer.render(scene, camera);
}
animate();

// Update parameters dynamically
config.setParameter('hue', 180);
config.setParameter('geometry', 5);
config.setParameters({ chaos: 0.5, speed: 2.0 });
\`\`\`

## API

### Vib3ThreeJsPackage.getShaderMaterial(options)

Returns a Three.js ShaderMaterial configuration object.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| system | string | 'faceted' | VIB3 system: quantum, faceted, holographic |
| transparent | boolean | true | Enable transparency |
| width | number | 1024 | Resolution width |
| height | number | 1024 | Resolution height |
| initialParams | object | {} | Initial parameter overrides |

### Material Methods

| Method | Description |
|--------|-------------|
| update(timeMs) | Update time uniform (call each frame) |
| setParameter(name, value) | Set a single VIB3 parameter |
| setParameters(params) | Set multiple parameters at once |
| setResolution(w, h) | Update resolution on resize |
| setAudio(bass, mid, high) | Feed audio levels for reactivity |

## License

MIT - Clear Seas Solutions LLC
`
        };
    }
}
