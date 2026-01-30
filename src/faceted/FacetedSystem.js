/**
 * Faceted System - Clean 2D Geometric Patterns with 4D Rotation
 * Supports 24 geometry variants: 8 base + 8 Hypersphere Core + 8 Hypertetrahedron Core
 * Full 6D rotation mathematics (XY, XZ, YZ, XW, YW, ZW)
 *
 * Supports both WebGL (direct) and WebGPU (via UnifiedRenderBridge).
 */

import { UnifiedRenderBridge } from '../render/UnifiedRenderBridge.js';
import { shaderLoader } from '../render/ShaderLoader.js';

// ============================================================================
// Shader Sources
// ============================================================================

const VERTEX_SHADER_GLSL = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const FRAGMENT_SHADER_GLSL = `
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
    uniform float u_hue;
    uniform float u_intensity;
    uniform float u_saturation;
    uniform float u_speed;
    uniform float u_mouseIntensity;
    uniform float u_clickIntensity;
    uniform float u_bass;
    uniform float u_mid;
    uniform float u_high;

    // 6 Rotation matrices for complete 4D rotation
    mat4 rotateXY(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            c, -s, 0, 0,
            s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );
    }

    mat4 rotateXZ(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1
        );
    }

    mat4 rotateYZ(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            1, 0, 0, 0,
            0, c, -s, 0,
            0, s, c, 0,
            0, 0, 0, 1
        );
    }

    mat4 rotateXW(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            c, 0, 0, -s,
            0, 1, 0, 0,
            0, 0, 1, 0,
            s, 0, 0, c
        );
    }

    mat4 rotateYW(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            1, 0, 0, 0,
            0, c, 0, -s,
            0, 0, 1, 0,
            0, s, 0, c
        );
    }

    mat4 rotateZW(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat4(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, c, -s,
            0, 0, s, c
        );
    }

    // Apply all 6 rotations
    vec4 apply6DRotation(vec4 pos) {
        pos = rotateXY(u_rot4dXY + u_time * 0.05) * pos;
        pos = rotateXZ(u_rot4dXZ + u_time * 0.06) * pos;
        pos = rotateYZ(u_rot4dYZ + u_time * 0.04) * pos;
        pos = rotateXW(u_rot4dXW + u_time * 0.07) * pos;
        pos = rotateYW(u_rot4dYW + u_time * 0.08) * pos;
        pos = rotateZW(u_rot4dZW + u_time * 0.09) * pos;
        return pos;
    }

    // Base geometry SDFs (0-7)
    float baseGeometry(vec4 p, float type) {
        if (type < 0.5) {
            // Tetrahedron
            return max(max(max(abs(p.x + p.y) - p.z, abs(p.x - p.y) - p.z),
                               abs(p.x + p.y) + p.z), abs(p.x - p.y) + p.z) / sqrt(3.0);
        } else if (type < 1.5) {
            // Hypercube
            vec4 q = abs(p) - 0.8;
            return length(max(q, 0.0)) + min(max(max(max(q.x, q.y), q.z), q.w), 0.0);
        } else if (type < 2.5) {
            // Sphere
            return length(p) - 1.0;
        } else if (type < 3.5) {
            // Torus
            vec2 t = vec2(length(p.xy) - 0.8, p.z);
            return length(t) - 0.3;
        } else if (type < 4.5) {
            // Klein Bottle (simplified)
            float r = length(p.xy);
            return abs(r - 0.7) - 0.2 + sin(atan(p.y, p.x) * 3.0 + p.z * 5.0) * 0.1;
        } else if (type < 5.5) {
            // Fractal (Mandelbulb approximation)
            return length(p) - 0.8 + sin(p.x * 5.0) * sin(p.y * 5.0) * sin(p.z * 5.0) * 0.2;
        } else if (type < 6.5) {
            // Wave
            return abs(p.z - sin(p.x * 5.0 + u_time) * cos(p.y * 5.0 + u_time) * 0.3) - 0.1;
        } else {
            // Crystal
            vec4 q = abs(p);
            return max(max(max(q.x, q.y), q.z), q.w) - 0.8;
        }
    }

    // Hypersphere Core wrapper (8-15)
    float hypersphereCore(vec4 p, float baseType) {
        float baseShape = baseGeometry(p, baseType);
        float sphereField = length(p) - 1.2;
        return max(baseShape, sphereField);  // Intersection
    }

    // Hypertetrahedron Core wrapper (16-23)
    float hypertetrahedronCore(vec4 p, float baseType) {
        float baseShape = baseGeometry(p, baseType);
        float tetraField = max(max(max(
            abs(p.x + p.y) - p.z - p.w,
            abs(p.x - p.y) - p.z + p.w),
            abs(p.x + p.y) + p.z - p.w),
            abs(p.x - p.y) + p.z + p.w) / sqrt(4.0);
        return max(baseShape, tetraField);  // Intersection
    }

    // Main geometry dispatcher (0-23)
    float geometry(vec4 p, float type) {
        if (type < 8.0) {
            // Base geometries (0-7)
            return baseGeometry(p, type);
        } else if (type < 16.0) {
            // Hypersphere Core (8-15)
            return hypersphereCore(p, type - 8.0);
        } else {
            // Hypertetrahedron Core (16-23)
            return hypertetrahedronCore(p, type - 16.0);
        }
    }

    vec3 hsl2rgb(float h, float s, float l) {
        float c = (1.0 - abs(2.0 * l - 1.0)) * s;
        float hp = h * 6.0;
        float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
        float m = l - c * 0.5;
        vec3 rgb;
        if (hp < 1.0)      rgb = vec3(c, x, 0.0);
        else if (hp < 2.0) rgb = vec3(x, c, 0.0);
        else if (hp < 3.0) rgb = vec3(0.0, c, x);
        else if (hp < 4.0) rgb = vec3(0.0, x, c);
        else if (hp < 5.0) rgb = vec3(x, 0.0, c);
        else               rgb = vec3(c, 0.0, x);
        return rgb + m;
    }

    void main() {
        // Audio-reactive modifications
        float audioDensity = u_gridDensity + u_bass * 3.0;
        float audioMorph = u_morphFactor + u_mid * 0.8;

        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        uv *= 2.0 / audioDensity;

        // Create 4D point
        vec4 pos = vec4(uv, sin(u_time * 0.3) * 0.5, cos(u_time * 0.2) * 0.5);

        // Apply full 6D rotation
        pos = apply6DRotation(pos);

        // Apply morphing (audio-reactive)
        pos *= audioMorph;
        pos += vec4(sin(u_time * 0.1), cos(u_time * 0.15), sin(u_time * 0.12), cos(u_time * 0.18)) * u_chaos;

        // Get distance
        float dist = geometry(pos, u_geometry);

        // Faceted rendering (sharp edges)
        float edge = smoothstep(0.02, 0.0, abs(dist));
        float fill = smoothstep(0.1, 0.0, dist) * 0.3;

        // Color based on hue, saturation, and distance
        float hueVal = u_hue / 360.0 + dist * 0.2 + u_time * 0.05 + u_high * 0.3;
        vec3 color = hsl2rgb(fract(hueVal), u_saturation, 0.5 + edge * 0.2);

        // Click intensity boost
        float clickBoost = 1.0 + u_clickIntensity * 0.5;
        float alpha = (edge + fill) * u_intensity * clickBoost;
        gl_FragColor = vec4(color * alpha, alpha);
    }
`;

// WGSL version of the faceted fragment shader for WebGPU
const FRAGMENT_SHADER_WGSL = `
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

fn rotateXY_w(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, -s, 0.0, 0.0), vec4<f32>(s, c, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 1.0, 0.0), vec4<f32>(0.0, 0.0, 0.0, 1.0));
}
fn rotateXZ_w(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, 0.0, -s, 0.0), vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(s, 0.0, c, 0.0), vec4<f32>(0.0, 0.0, 0.0, 1.0));
}
fn rotateYZ_w(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0), vec4<f32>(0.0, c, -s, 0.0),
        vec4<f32>(0.0, s, c, 0.0), vec4<f32>(0.0, 0.0, 0.0, 1.0));
}
fn rotateXW_w(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, 0.0, 0.0, -s), vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 1.0, 0.0), vec4<f32>(s, 0.0, 0.0, c));
}
fn rotateYW_w(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0), vec4<f32>(0.0, c, 0.0, -s),
        vec4<f32>(0.0, 0.0, 1.0, 0.0), vec4<f32>(0.0, s, 0.0, c));
}
fn rotateZW_w(angle: f32) -> mat4x4<f32> {
    let c = cos(angle); let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0), vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, c, -s), vec4<f32>(0.0, 0.0, s, c));
}

fn apply6DRot(pos: vec4<f32>) -> vec4<f32> {
    var p = pos;
    p = rotateXY_w(u.rot4dXY + u.time * 0.05) * p;
    p = rotateXZ_w(u.rot4dXZ + u.time * 0.06) * p;
    p = rotateYZ_w(u.rot4dYZ + u.time * 0.04) * p;
    p = rotateXW_w(u.rot4dXW + u.time * 0.07) * p;
    p = rotateYW_w(u.rot4dYW + u.time * 0.08) * p;
    p = rotateZW_w(u.rot4dZW + u.time * 0.09) * p;
    return p;
}

fn baseGeom(p: vec4<f32>, t: f32) -> f32 {
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

fn hypersphereCore(p: vec4<f32>, bt: f32) -> f32 {
    return max(baseGeom(p, bt), length(p) - 1.2);
}

fn hypertetraCore(p: vec4<f32>, bt: f32) -> f32 {
    let tf = max(max(max(
        abs(p.x + p.y) - p.z - p.w,
        abs(p.x - p.y) - p.z + p.w),
        abs(p.x + p.y) + p.z - p.w),
        abs(p.x - p.y) + p.z + p.w) / sqrt(4.0);
    return max(baseGeom(p, bt), tf);
}

fn geom(p: vec4<f32>, t: f32) -> f32 {
    if (t < 8.0) { return baseGeom(p, t); }
    else if (t < 16.0) { return hypersphereCore(p, t - 8.0); }
    else { return hypertetraCore(p, t - 16.0); }
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

fn hsl2rgb_w(h: f32, s: f32, l: f32) -> vec3<f32> {
    let c = (1.0 - abs(2.0 * l - 1.0)) * s;
    let hp = h * 6.0;
    let x = c * (1.0 - abs(hp % 2.0 - 1.0));
    let m = l - c * 0.5;
    var rgb: vec3<f32>;
    if (hp < 1.0)      { rgb = vec3<f32>(c, x, 0.0); }
    else if (hp < 2.0) { rgb = vec3<f32>(x, c, 0.0); }
    else if (hp < 3.0) { rgb = vec3<f32>(0.0, c, x); }
    else if (hp < 4.0) { rgb = vec3<f32>(0.0, x, c); }
    else if (hp < 5.0) { rgb = vec3<f32>(x, 0.0, c); }
    else               { rgb = vec3<f32>(c, 0.0, x); }
    return rgb + m;
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    // Audio-reactive modifications
    let audioDensity = u.gridDensity + u.bass * 3.0;
    let audioMorph = u.morphFactor + u.mid * 0.8;

    let fragCoord = input.position.xy;
    var uv2 = (fragCoord - 0.5 * u.resolution) / min(u.resolution.x, u.resolution.y);
    uv2 *= 2.0 / audioDensity;

    var pos = vec4<f32>(uv2, sin(u.time * 0.3) * 0.5, cos(u.time * 0.2) * 0.5);
    pos = apply6DRot(pos);
    pos *= audioMorph;
    pos += vec4<f32>(sin(u.time * 0.1), cos(u.time * 0.15), sin(u.time * 0.12), cos(u.time * 0.18)) * u.chaos;

    let dist = geom(pos, u.geometry);
    let edge = smoothstep(0.02, 0.0, abs(dist));
    let fill = smoothstep(0.1, 0.0, dist) * 0.3;

    // Color based on hue, saturation, and distance
    let hueVal = u.hue / 360.0 + dist * 0.2 + u.time * 0.05 + u.high * 0.3;
    let color = hsl2rgb_w(fract(hueVal), u.saturation, 0.5 + edge * 0.2);

    // Click intensity boost
    let clickBoost = 1.0 + u.clickIntensity * 0.5;
    let alpha = (edge + fill) * u.intensity * clickBoost;
    return vec4<f32>(color * alpha, alpha);
}
`;

// ============================================================================
// FacetedSystem Class
// ============================================================================

export class FacetedSystem {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.isActive = false;
        this.time = 0;
        this.parameters = {
            geometry: 0,
            rot4dXY: 0, rot4dXZ: 0, rot4dYZ: 0,
            rot4dXW: 0, rot4dYW: 0, rot4dZW: 0,
            gridDensity: 15,
            morphFactor: 1.0,
            chaos: 0.2,
            speed: 1.0,
            hue: 200,
            intensity: 0.7,
            saturation: 0.8,
            dimension: 3.5,
            mouseIntensity: 0.0,
            clickIntensity: 0.0,
            bass: 0.0,
            mid: 0.0,
            high: 0.0
        };

        /** @type {UnifiedRenderBridge|null} */
        this._bridge = null;

        /** @type {'direct'|'bridge'} Rendering mode */
        this._renderMode = 'direct';
    }

    /**
     * Initialize with UnifiedRenderBridge for WebGL/WebGPU abstraction.
     * @param {HTMLCanvasElement} canvas
     * @param {object} [options]
     * @param {boolean} [options.preferWebGPU=true]
     * @param {boolean} [options.debug=false]
     * @returns {Promise<boolean>}
     */
    async initWithBridge(canvas, options = {}) {
        this.canvas = canvas;
        try {
            this._bridge = await UnifiedRenderBridge.create(canvas, options);

            // Try loading external shader files first, fall back to inline
            let sources = {
                glslVertex: VERTEX_SHADER_GLSL,
                glslFragment: FRAGMENT_SHADER_GLSL,
                wgslFragment: FRAGMENT_SHADER_WGSL
            };

            try {
                const external = await shaderLoader.loadShaderPair('faceted', 'faceted/faceted.frag');
                if (external.glslFragment) {
                    sources.glslFragment = external.glslFragment;
                }
                if (external.wgslFragment) {
                    sources.wgslFragment = external.wgslFragment;
                }
                if (external.glslVertex) {
                    sources.glslVertex = external.glslVertex;
                }
            } catch (loadErr) {
                // External load failed — use inline shaders (already set above)
            }

            const compiled = this._bridge.compileShader('faceted', sources);

            if (!compiled) {
                console.error('Failed to compile faceted shaders via bridge');
                return false;
            }

            this._renderMode = 'bridge';
            console.log(`Faceted System initialized via ${this._bridge.getBackendType()} bridge`);
            return true;
        } catch (e) {
            console.error('Faceted bridge init failed, falling back to direct:', e);
            return this.initialize(canvas);
        }
    }

    /**
     * Initialize faceted system (direct WebGL mode)
     * Finds canvas by ID in DOM (matches reference architecture)
     */
    initialize(canvasOverride = null) {
        this.canvas = canvasOverride ?? document.getElementById('content-canvas');
        if (!this.canvas) {
            console.error('Faceted canvas (content-canvas) not found in DOM');
            console.log('Looking for canvas IDs:', ['background-canvas', 'shadow-canvas', 'content-canvas', 'highlight-canvas', 'accent-canvas']);
            return false;
        }

        this.gl = this.canvas.getContext('webgl');
        if (!this.gl) {
            console.error('WebGL not available for Faceted System');
            return false;
        }

        this._contextLost = false;

        // WebGL context loss/restore handlers
        this._onContextLost = (e) => {
            e.preventDefault();
            this._contextLost = true;
            console.warn('Faceted: WebGL context lost');
        };
        this._onContextRestored = () => {
            console.log('Faceted: WebGL context restored');
            this._contextLost = false;
            this.createShaderProgram();
        };
        this.canvas.addEventListener('webglcontextlost', this._onContextLost);
        this.canvas.addEventListener('webglcontextrestored', this._onContextRestored);

        if (!this.createShaderProgram()) {
            console.error('Failed to create faceted shader program');
            return false;
        }

        this.setupCanvasSize();
        this._renderMode = 'direct';
        console.log('Faceted System initialized on content-canvas');
        return true;
    }

    /**
     * Create shader program with 6D rotation and 24 geometry support
     */
    createShaderProgram() {
        this.program = this.compileProgram(VERTEX_SHADER_GLSL, FRAGMENT_SHADER_GLSL);
        if (!this.program) return false;

        // Create fullscreen quad
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        return true;
    }

    /**
     * Compile shader program
     */
    compileProgram(vertexSource, fragmentSource) {
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        if (!vertexShader || !fragmentShader) return null;

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Shader program link error:', this.gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    /**
     * Compile individual shader
     */
    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    /**
     * Setup canvas size
     */
    setupCanvasSize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width || 800;
        this.canvas.height = rect.height || 600;
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Start rendering
     */
    start() {
        this.isActive = true;
        this.render();
        console.log('Faceted System started');
    }

    /**
     * Stop rendering
     */
    stop() {
        this.isActive = false;
        console.log('Faceted System stopped');
    }

    /**
     * Set active state
     */
    setActive(active) {
        if (active) {
            this.start();
        } else {
            this.stop();
        }
    }

    /**
     * Get the current rendering backend type
     * @returns {'webgl'|'webgpu'|'direct-webgl'}
     */
    getBackendType() {
        if (this._renderMode === 'bridge' && this._bridge) {
            return this._bridge.getBackendType();
        }
        return 'direct-webgl';
    }

    /**
     * Build uniform object for current parameters
     * @private
     */
    _buildUniforms() {
        return {
            u_time: this.time,
            u_resolution: [this.canvas.width, this.canvas.height],
            u_geometry: this.parameters.geometry,
            u_rot4dXY: this.parameters.rot4dXY,
            u_rot4dXZ: this.parameters.rot4dXZ,
            u_rot4dYZ: this.parameters.rot4dYZ,
            u_rot4dXW: this.parameters.rot4dXW,
            u_rot4dYW: this.parameters.rot4dYW,
            u_rot4dZW: this.parameters.rot4dZW,
            u_dimension: this.parameters.dimension,
            u_gridDensity: this.parameters.gridDensity * 0.1,
            u_morphFactor: this.parameters.morphFactor,
            u_chaos: this.parameters.chaos,
            u_hue: this.parameters.hue,
            u_intensity: this.parameters.intensity,
            u_saturation: this.parameters.saturation,
            u_speed: this.parameters.speed,
            u_mouseIntensity: this.parameters.mouseIntensity || 0,
            u_clickIntensity: this.parameters.clickIntensity || 0,
            u_bass: this.parameters.bass || 0,
            u_mid: this.parameters.mid || 0,
            u_high: this.parameters.high || 0
        };
    }

    /**
     * Render a single frame (bridge mode)
     * @private
     */
    _renderBridgeFrame() {
        if (!this._bridge) return;
        this._bridge.setUniforms(this._buildUniforms());
        this._bridge.render('faceted');
    }

    /**
     * Render a single frame (direct WebGL mode)
     * @private
     */
    _renderDirectFrame() {
        if (!this.gl || !this.program || this._contextLost) return;
        if (this.gl.isContextLost()) {
            this._contextLost = true;
            return;
        }

        this.gl.useProgram(this.program);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        const uniforms = this._buildUniforms();

        Object.entries(uniforms).forEach(([name, value]) => {
            const location = this.gl.getUniformLocation(this.program, name);
            if (location !== null) {
                if (Array.isArray(value)) {
                    this.gl.uniform2fv(location, value);
                } else {
                    this.gl.uniform1f(location, value);
                }
            }
        });

        // Draw fullscreen quad
        const posLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(posLocation);
        this.gl.vertexAttribPointer(posLocation, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    /**
     * Render a single frame
     */
    renderFrame() {
        if (!this.isActive) return;

        // Apply audio reactivity
        if (window.audioEnabled && window.audioReactive) {
            this.parameters.bass = window.audioReactive.bass || 0;
            this.parameters.mid = window.audioReactive.mid || 0;
            this.parameters.high = window.audioReactive.high || 0;
        }

        this.time += 0.016 * this.parameters.speed;

        if (this._renderMode === 'bridge') {
            this._renderBridgeFrame();
        } else {
            this._renderDirectFrame();
        }
    }

    /**
     * Render loop
     */
    render(frameState = {}) {
        // Apply frameState parameters if provided
        if (frameState.params) {
            Object.assign(this.parameters, frameState.params);
        }
        if (typeof frameState.time === 'number') {
            this.time = frameState.time;
        }

        this.renderFrame();

        if (this.isActive) {
            requestAnimationFrame(() => this.render());
        }
    }

    /**
     * Update parameters with validation
     */
    updateParameters(params) {
        if (!params || typeof params !== 'object') return;
        for (const [key, value] of Object.entries(params)) {
            // Only accept finite numbers to prevent NaN/Infinity reaching shaders
            if (typeof value === 'number' && Number.isFinite(value)) {
                this.parameters[key] = value;
            }
        }
    }

    // ============================================
    // RendererContract Compliance Methods
    // ============================================

    /**
     * Initialize the renderer (RendererContract.init)
     * @param {Object} [context] - Optional context with canvas or canvasId
     * @returns {boolean|Promise<boolean>} Success status
     */
    init(context = {}) {
        const canvasOverride = context.canvas ||
            (context.canvasId ? document.getElementById(context.canvasId) : null);

        // If preferWebGPU is set and canvas is provided, use bridge mode
        if (context.preferWebGPU && canvasOverride) {
            return this.initWithBridge(canvasOverride, {
                preferWebGPU: true,
                debug: context.debug
            });
        }

        return this.initialize(canvasOverride);
    }

    /**
     * Handle canvas resize (RendererContract.resize)
     * @param {number} width
     * @param {number} height
     * @param {number} [pixelRatio=1]
     */
    resize(width, height, pixelRatio = 1) {
        if (!this.canvas) return;

        if (this._renderMode === 'bridge' && this._bridge) {
            this._bridge.resize(width, height, pixelRatio);
        } else if (this.gl) {
            this.canvas.width = width * pixelRatio;
            this.canvas.height = height * pixelRatio;
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Clean up all resources (RendererContract.dispose)
     */
    dispose() {
        this.isActive = false;

        // Remove context loss listeners
        if (this.canvas) {
            if (this._onContextLost) {
                this.canvas.removeEventListener('webglcontextlost', this._onContextLost);
            }
            if (this._onContextRestored) {
                this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored);
            }
        }

        if (this._bridge) {
            this._bridge.dispose();
            this._bridge = null;
        }

        if (this.gl && !this.gl.isContextLost()) {
            if (this.program) {
                this.gl.deleteProgram(this.program);
            }
        }
        this.program = null;

        if (this.gl) {
            const loseContext = this.gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
                loseContext.loseContext();
            }
            this.gl = null;
        }

        this.canvas = null;
        this._renderMode = 'direct';
        this._contextLost = true;
        console.log('Faceted System disposed');
    }

    /**
     * Alias for dispose (for backward compatibility)
     */
    destroy() {
        this.dispose();
    }
}
