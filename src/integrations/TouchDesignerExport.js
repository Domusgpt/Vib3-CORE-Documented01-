/**
 * VIB3+ TouchDesigner GLSL TOP Export
 *
 * Generates TouchDesigner-compatible GLSL TOP (Texture Operator) code from
 * VIB3+ shader systems. Adapts WebGL GLSL to TouchDesigner's GLSL environment,
 * handling uniform naming conventions, texture I/O, and TD-specific headers.
 *
 * TouchDesigner uses GLSL 3.30+ with specific built-in uniforms and
 * output conventions. This module translates VIB3+ shaders accordingly.
 *
 * Usage:
 *   const glslTop = Vib3TouchDesignerExport.exportGLSLTOP('quantum');
 *   // Paste into a GLSL TOP in TouchDesigner
 *
 *   const tox = Vib3TouchDesignerExport.exportTOX();
 *   // Save as .tox component file
 *
 * @module Vib3TouchDesignerExport
 * @version 1.0.0
 * @license All Rights Reserved - Clear Seas Solutions LLC
 */

/**
 * TouchDesigner uniform mapping from VIB3 parameter names.
 * TD custom uniforms are prefixed with 'u' by convention in Custom Parameters.
 * @constant {Object}
 */
const TD_UNIFORM_MAP = {
    u_time: { tdName: 'uTime', tdType: 'float', source: 'absTime.seconds', description: 'Time in seconds (auto from TD timeline)' },
    u_resolution: { tdName: 'uResolution', tdType: 'vec2', source: 'uTDOutputInfo.res.zw', description: 'Output resolution (auto from TD)' },
    u_geometry: { tdName: 'uGeometry', tdType: 'float', customPar: true, range: [0, 23], default: 0, description: 'Geometry variant (0-23)' },
    u_gridDensity: { tdName: 'uGriddensity', tdType: 'float', customPar: true, range: [4, 100], default: 15, description: 'Pattern density' },
    u_morphFactor: { tdName: 'uMorphfactor', tdType: 'float', customPar: true, range: [0, 2], default: 1.0, description: 'Shape interpolation' },
    u_chaos: { tdName: 'uChaos', tdType: 'float', customPar: true, range: [0, 1], default: 0.2, description: 'Randomness level' },
    u_speed: { tdName: 'uSpeed', tdType: 'float', customPar: true, range: [0.1, 3], default: 1.0, description: 'Animation speed' },
    u_hue: { tdName: 'uHue', tdType: 'float', customPar: true, range: [0, 1], default: 0.556, description: 'Color hue (0-1, normalized)' },
    u_intensity: { tdName: 'uIntensity', tdType: 'float', customPar: true, range: [0, 1], default: 0.5, description: 'Visual intensity' },
    u_saturation: { tdName: 'uSaturation', tdType: 'float', customPar: true, range: [0, 1], default: 0.8, description: 'Color saturation' },
    u_dimension: { tdName: 'uDimension', tdType: 'float', customPar: true, range: [3.0, 4.5], default: 3.5, description: '4D projection distance' },
    u_rot4dXY: { tdName: 'uRot4dxy', tdType: 'float', customPar: true, range: [-6.28, 6.28], default: 0, description: 'XY plane rotation (radians)' },
    u_rot4dXZ: { tdName: 'uRot4dxz', tdType: 'float', customPar: true, range: [-6.28, 6.28], default: 0, description: 'XZ plane rotation (radians)' },
    u_rot4dYZ: { tdName: 'uRot4dyz', tdType: 'float', customPar: true, range: [-6.28, 6.28], default: 0, description: 'YZ plane rotation (radians)' },
    u_rot4dXW: { tdName: 'uRot4dxw', tdType: 'float', customPar: true, range: [-2, 2], default: 0, description: 'XW hyperplane rotation (radians)' },
    u_rot4dYW: { tdName: 'uRot4dyw', tdType: 'float', customPar: true, range: [-2, 2], default: 0, description: 'YW hyperplane rotation (radians)' },
    u_rot4dZW: { tdName: 'uRot4dzw', tdType: 'float', customPar: true, range: [-2, 2], default: 0, description: 'ZW hyperplane rotation (radians)' },
    u_bass: { tdName: 'uBass', tdType: 'float', customPar: true, range: [0, 1], default: 0, description: 'Audio bass level (0-1)' },
    u_mid: { tdName: 'uMid', tdType: 'float', customPar: true, range: [0, 1], default: 0, description: 'Audio mid level (0-1)' },
    u_high: { tdName: 'uHigh', tdType: 'float', customPar: true, range: [0, 1], default: 0, description: 'Audio high level (0-1)' }
};

/**
 * Available VIB3 systems for export.
 * @constant {string[]}
 */
const EXPORTABLE_SYSTEMS = ['quantum', 'faceted', 'holographic'];

/**
 * TouchDesigner export for VIB3+ visualization shaders.
 *
 * Translates VIB3+ WebGL shaders into TouchDesigner GLSL TOP format,
 * handling differences in GLSL version, uniform conventions, and output.
 *
 * @class
 */
export class Vib3TouchDesignerExport {
    /**
     * Exports a VIB3+ system shader as TouchDesigner GLSL TOP code.
     *
     * The generated code:
     * - Uses GLSL 3.30 (TD standard) with proper layout qualifiers
     * - Maps VIB3 uniforms to TD Custom Parameter conventions
     * - Uses TD's built-in absTime.seconds for time
     * - Uses uTDOutputInfo.res for resolution
     * - Outputs to fragColor with layout(location = 0) qualifier
     * - Includes all 6D rotation matrices and 24 geometry functions
     * - Includes audio reactivity uniforms for CHOP-driven input
     *
     * @param {string} [system='faceted'] - VIB3 system: 'quantum' | 'faceted' | 'holographic'
     * @param {object} [options={}] - Export options
     * @param {boolean} [options.includeComments=true] - Include descriptive comments
     * @param {boolean} [options.includeAudio=true] - Include audio reactivity uniforms
     * @param {boolean} [options.useCustomParams=true] - Use TD Custom Parameters (vs. hardcoded values)
     * @returns {string} Complete GLSL TOP source code for TouchDesigner
     * @example
     * const glsl = Vib3TouchDesignerExport.exportGLSLTOP('quantum', { includeAudio: true });
     * // Paste into GLSL TOP's pixel shader in TouchDesigner
     */
    static exportGLSLTOP(system = 'faceted', options = {}) {
        const includeComments = options.includeComments !== false;
        const includeAudio = options.includeAudio !== false;
        const useCustomParams = options.useCustomParams !== false;

        let code = '';

        // ---- TD Header ----
        if (includeComments) {
            code += `// ============================================================
// VIB3+ 4D Visualization - TouchDesigner GLSL TOP
// System: ${system}
// Generated by VIB3+ Engine - Clear Seas Solutions LLC
//
// Setup:
//   1. Create a GLSL TOP
//   2. Paste this code into the Pixel Shader
//   3. Add Custom Parameters (Ctrl+P on the GLSL TOP):
//      - See parameter list below for names and ranges
//   4. For audio reactivity, connect an Audio Device In CHOP
//      to the Custom Parameters via CHOP Execute or Export
// ============================================================
`;
        }

        // ---- Uniforms ----
        code += `
// TouchDesigner built-in uniforms (automatically available)
// uniform float absTime.seconds;
// uniform vec4 uTDOutputInfo.res; // .zw = width, height

`;

        if (useCustomParams) {
            code += `// Custom Parameter uniforms (add these as Custom Parameters on the GLSL TOP)\n`;
            for (const [vib3Name, td] of Object.entries(TD_UNIFORM_MAP)) {
                if (td.customPar) {
                    const comment = includeComments ? ` // ${td.description} [${td.range[0]} - ${td.range[1]}]` : '';
                    code += `uniform ${td.tdType} ${td.tdName};${comment}\n`;
                }
            }
        } else {
            code += `// Hardcoded defaults (replace with Custom Parameters for interactive control)\n`;
            for (const [vib3Name, td] of Object.entries(TD_UNIFORM_MAP)) {
                if (td.customPar) {
                    code += `#define ${td.tdName} ${typeof td.default === 'number' ? td.default.toFixed(4) : td.default}\n`;
                }
            }
        }

        // ---- Output declaration ----
        code += `
// Output
layout(location = 0) out vec4 fragColor;

`;

        // ---- Rotation matrices ----
        code += `// ---- 6D Rotation Matrices ----
mat4 rotateXY(float a) { float c=cos(a),s=sin(a); return mat4(c,-s,0,0, s,c,0,0, 0,0,1,0, 0,0,0,1); }
mat4 rotateXZ(float a) { float c=cos(a),s=sin(a); return mat4(c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1); }
mat4 rotateYZ(float a) { float c=cos(a),s=sin(a); return mat4(1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1); }
mat4 rotateXW(float a) { float c=cos(a),s=sin(a); return mat4(c,0,0,-s, 0,1,0,0, 0,0,1,0, s,0,0,c); }
mat4 rotateYW(float a) { float c=cos(a),s=sin(a); return mat4(1,0,0,0, 0,c,0,-s, 0,0,1,0, 0,s,0,c); }
mat4 rotateZW(float a) { float c=cos(a),s=sin(a); return mat4(1,0,0,0, 0,1,0,0, 0,0,c,-s, 0,0,s,c); }

`;

        // ---- Projection ----
        code += `// ---- 4D Projection ----
vec3 project4Dto3D(vec4 p, float dim) {
    float w = 1.0 / (dim - p.w);
    return p.xyz * w;
}

`;

        // ---- HSL to RGB ----
        code += `// ---- HSL to RGB ----
vec3 hsl2rgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float hp = h * 6.0;
    float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
    float m = l - c * 0.5;
    vec3 rgb;
    if (hp < 1.0) rgb = vec3(c, x, 0);
    else if (hp < 2.0) rgb = vec3(x, c, 0);
    else if (hp < 3.0) rgb = vec3(0, c, x);
    else if (hp < 4.0) rgb = vec3(0, x, c);
    else if (hp < 5.0) rgb = vec3(x, 0, c);
    else rgb = vec3(c, 0, x);
    return rgb + m;
}

`;

        // ---- Core warp functions ----
        code += `// ---- Core Warp Functions (24 Geometry Support) ----
vec3 warpHypersphere(vec3 p, float geomIdx, float t, float spd, float morph, float dim) {
    float radius = length(p);
    float mb = clamp(morph * 0.6 + (dim - 3.0) * 0.25, 0.0, 2.0);
    float w = sin(radius * (1.3 + geomIdx * 0.12) + t * 0.8 * spd) * (0.4 + mb * 0.45);
    vec4 p4 = vec4(p * (1.0 + mb * 0.2), w);
    p4 = rotateXY(uRot4dxy) * rotateXZ(uRot4dxz) * rotateYZ(uRot4dyz) *
         rotateXW(uRot4dxw) * rotateYW(uRot4dyw) * rotateZW(uRot4dzw) * p4;
    return mix(p, project4Dto3D(p4, dim), clamp(0.45 + mb * 0.35, 0.0, 1.0));
}

vec3 warpHypertetra(vec3 p, float geomIdx, float t, float spd, float morph, float dim) {
    vec3 c1 = normalize(vec3(1,1,1)), c2 = normalize(vec3(-1,-1,1));
    vec3 c3 = normalize(vec3(-1,1,-1)), c4 = normalize(vec3(1,-1,-1));
    float mb = clamp(morph * 0.8 + (dim - 3.0) * 0.2, 0.0, 2.0);
    float basis = dot(p, c1) * 0.14 + dot(p, c2) * 0.1 + dot(p, c3) * 0.08;
    float w = sin(basis * 5.5 + t * 0.9 * spd) * cos(dot(p, c4) * 4.2 - t * 0.7 * spd) * (0.5 + mb * 0.4);
    vec3 ofs = vec3(dot(p, c1), dot(p, c2), dot(p, c3)) * 0.1 * mb;
    vec4 p4 = vec4(p + ofs, w);
    p4 = rotateXY(uRot4dxy) * rotateXZ(uRot4dxz) * rotateYZ(uRot4dyz) *
         rotateXW(uRot4dxw) * rotateYW(uRot4dyw) * rotateZW(uRot4dzw) * p4;
    vec3 proj = project4Dto3D(p4, dim);
    float plane = min(min(abs(dot(p, c1)), abs(dot(p, c2))), min(abs(dot(p, c3)), abs(dot(p, c4))));
    vec3 blended = mix(p, proj, clamp(0.45 + mb * 0.35, 0.0, 1.0));
    return mix(blended, blended * (1.0 - plane * 0.55), 0.2 + mb * 0.2);
}

vec3 applyCoreWarp(vec3 p, float geomType, float t, float spd, float morph, float dim) {
    float coreF = floor(geomType / 8.0);
    int core = int(clamp(coreF, 0.0, 2.0));
    float baseF = mod(geomType, 8.0);
    if (core == 1) return warpHypersphere(p, baseF, t, spd, morph, dim);
    if (core == 2) return warpHypertetra(p, baseF, t, spd, morph, dim);
    return p;
}

`;

        // ---- Geometry functions ----
        code += `// ---- 8 Base Geometry Lattice Functions ----
float tetraLattice(vec3 p, float gs) { vec3 q=fract(p*gs)-0.5; float d1=length(q); float d2=length(q-vec3(0.4,0,0)); float d3=length(q-vec3(0,0.4,0)); float d4=length(q-vec3(0,0,0.4)); return max(1.0-smoothstep(0.0,0.04,min(min(d1,d2),min(d3,d4))), (1.0-smoothstep(0.0,0.02,abs(length(q.xy)-0.2)))*0.5); }
float cubeLattice(vec3 p, float gs) { vec3 g=fract(p*gs); vec3 e=min(g,1.0-g); return max((1.0-smoothstep(0.0,0.03,min(min(e.x,e.y),e.z)))*0.7, 1.0-smoothstep(0.45,0.5,max(max(abs(g.x-0.5),abs(g.y-0.5)),abs(g.z-0.5)))); }
float sphereLattice(vec3 p, float gs) { vec3 c=fract(p*gs)-0.5; return max(1.0-smoothstep(0.15,0.25,length(c)), (1.0-smoothstep(0.0,0.02,abs(length(c.xy)-0.3)))*0.6); }
float torusLattice(vec3 p, float gs) { vec3 c=fract(p*gs)-0.5; float td=length(vec2(length(c.xy)-0.3,c.z)); return 1.0-smoothstep(0.08,0.12,td); }
float kleinLattice(vec3 p, float gs) { vec3 c=fract(p*gs)-0.5; float u2=atan(c.y,c.x)/3.14159+1.0; float v2=c.z+0.5; vec3 kp=vec3((2.0+cos(u2*0.5))*cos(u2),(2.0+cos(u2*0.5))*sin(u2),sin(u2*0.5)+v2)*0.1; return 1.0-smoothstep(0.1,0.15,length(c-kp)); }
float fractalLattice(vec3 p, float gs) { vec3 c=abs(fract(p*gs)*2.0-1.0); float d=length(max(abs(c)-0.3,0.0)); for(int i=0;i<3;i++){c=abs(c*2.0-1.0);d=min(d,length(max(abs(c)-0.3,0.0))/pow(2.0,float(i+1)));} return 1.0-smoothstep(0.0,0.05,d); }
float waveLattice(vec3 p, float gs, float t, float spd) { return (sin(p.x*gs*2.0+t*2.0*spd)+sin(p.y*gs*1.8+t*1.5*spd)+sin(p.z*gs*2.2+t*1.8*spd))/6.0+0.5; }
float crystalLattice(vec3 p, float gs) { vec3 c=fract(p*gs)-0.5; float cr=max(max(abs(c.x)+abs(c.y),abs(c.y)+abs(c.z)),abs(c.x)+abs(c.z)); return max(1.0-smoothstep(0.3,0.4,cr), max(max(1.0-smoothstep(0.0,0.02,abs(abs(c.x)-0.35)), 1.0-smoothstep(0.0,0.02,abs(abs(c.y)-0.35))), 1.0-smoothstep(0.0,0.02,abs(abs(c.z)-0.35)))*0.5); }

float geometryFunc(vec3 wp, float gs, float geom, float t, float spd) {
    float base = mod(geom, 8.0);
    int gt = int(clamp(floor(base + 0.5), 0.0, 7.0));
    if (gt == 0) return tetraLattice(wp, gs);
    if (gt == 1) return cubeLattice(wp, gs);
    if (gt == 2) return sphereLattice(wp, gs);
    if (gt == 3) return torusLattice(wp, gs);
    if (gt == 4) return kleinLattice(wp, gs);
    if (gt == 5) return fractalLattice(wp, gs);
    if (gt == 6) return waveLattice(wp, gs, t, spd);
    if (gt == 7) return crystalLattice(wp, gs);
    return cubeLattice(wp, gs);
}

`;

        // ---- Main function (system-specific) ----
        const mainFunctions = {
            faceted: `// ---- Main (Faceted System) ----
void main() {
    // TouchDesigner: gl_FragCoord is pixel coordinates
    vec2 res = uTDOutputInfo.res.zw;
    vec2 uv = (gl_FragCoord.xy - res * 0.5) / min(res.x, res.y);

    float t = absTime.seconds * uSpeed;
    vec4 p = vec4(uv * 3.0, sin(t * 3.0), cos(t * 2.0));

    // Apply 6D rotation
    p = rotateXY(uRot4dxy) * rotateXZ(uRot4dxz) * rotateYZ(uRot4dyz) *
        rotateXW(uRot4dxw) * rotateYW(uRot4dyw) * rotateZW(uRot4dzw) * p;

    vec3 proj = project4Dto3D(p, uDimension);
    vec3 warped = applyCoreWarp(proj, uGeometry, t, uSpeed, uMorphfactor, uDimension);
    float gs = uGriddensity * 0.08;

    float value = geometryFunc(warped, gs, uGeometry, t, uSpeed) * uMorphfactor;
    value += sin(proj.x * 7.0) * cos(proj.y * 11.0) * sin(proj.z * 13.0) * uChaos;
${includeAudio ? `
    // Audio reactivity
    value += uBass * 0.3 + uMid * 0.2 + uHigh * 0.1;
` : ''}
    float gi = pow(1.0 - clamp(abs(value * 0.8), 0.0, 1.0), 1.5) * uIntensity;
    vec3 color = hsl2rgb(uHue, uSaturation, 0.3 + gi * 0.5) * gi * 2.0;

    fragColor = TDOutputSwizzle(vec4(color, gi));
}`,

            quantum: `// ---- Main (Quantum System) ----
void main() {
    vec2 res = uTDOutputInfo.res.zw;
    vec2 uv = (gl_FragCoord.xy - res * 0.5) / min(res.x, res.y);

    float t = absTime.seconds * uSpeed;
    vec4 p = vec4(uv * 3.0, sin(t * 3.0), cos(t * 2.0));

    p = rotateXY(uRot4dxy) * rotateXZ(uRot4dxz) * rotateYZ(uRot4dyz) *
        rotateXW(uRot4dxw) * rotateYW(uRot4dyw) * rotateZW(uRot4dzw) * p;

    vec3 proj = project4Dto3D(p, uDimension);
    vec3 warped = applyCoreWarp(proj, uGeometry, t, uSpeed, uMorphfactor, uDimension);
    float gs = uGriddensity * 0.08;

    float value = geometryFunc(warped, gs, uGeometry, t, uSpeed) * uMorphfactor;
    float noise = sin(proj.x * 7.0) * cos(proj.y * 11.0) * sin(proj.z * 13.0);
    value += noise * uChaos;
${includeAudio ? `
    // Audio reactivity (quantum-enhanced)
    value += uBass * 0.4 + uMid * 0.3;
` : ''}
    float gi = pow(1.0 - clamp(abs(value * 0.8), 0.0, 1.0), 1.5);

    // Holographic shimmer
    float shimmer = sin(uv.x * 20.0 + t * 5.0) * cos(uv.y * 15.0 + t * 3.0) * 0.1;
    gi += shimmer * gi;
    gi *= uIntensity;

    vec3 color = hsl2rgb(uHue, uSaturation, 0.3 + gi * 0.5);

    // RGB separation
    float sep = gi * 0.05;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    color.r += sin(dist * 30.0 + angle * 10.0 + t * 4.0) * sep;
    color.g += cos(dist * 25.0 + angle * 8.0 + t * 3.5) * sep * 0.9;
    color.b += sin(dist * 35.0 + angle * 12.0 + t * 4.5) * sep * 1.1;

    fragColor = TDOutputSwizzle(vec4(color * gi * 2.0, gi));
}`,

            holographic: `// ---- Main (Holographic System) ----
void main() {
    vec2 res = uTDOutputInfo.res.zw;
    vec2 uv = (gl_FragCoord.xy - res * 0.5) / min(res.x, res.y);

    float t = absTime.seconds * uSpeed;
    vec4 p = vec4(uv * 3.0, sin(t * 3.0), cos(t * 2.0));

    p = rotateXY(uRot4dxy) * rotateXZ(uRot4dxz) * rotateYZ(uRot4dyz) *
        rotateXW(uRot4dxw) * rotateYW(uRot4dyw) * rotateZW(uRot4dzw) * p;

    vec3 proj = project4Dto3D(p, uDimension);
    vec3 warped = applyCoreWarp(proj, uGeometry, t, uSpeed, uMorphfactor, uDimension);
    float gs = uGriddensity * 0.08;

    float value = geometryFunc(warped, gs, uGeometry, t, uSpeed) * uMorphfactor;
    value += sin(proj.x * 7.0) * cos(proj.y * 11.0) * uChaos * 0.3;
${includeAudio ? `
    value += uBass * 0.5 + uMid * 0.3;
` : ''}
    float gi = pow(clamp(value, 0.0, 1.0), 1.5) * uIntensity;

    // 5-layer holographic blend
    vec3 bgColor = hsl2rgb(uHue, uSaturation * 0.7, 0.15) * (0.3 + gi * 0.4);
    vec3 contentColor = hsl2rgb(uHue, uSaturation, 0.55) * (gi * 1.2 + 0.2);
    vec3 highlightColor = hsl2rgb(fract(uHue + 0.15), uSaturation, 0.6) * pow(gi, 3.0) * 1.5;
    vec3 accentColor = hsl2rgb(fract(uHue + 0.67), uSaturation, 0.5) * (sin(value * 50.0 + t * 10.0) * 0.5 + 0.5) * gi;

    // Glassmorphic blend
    float fresnel = pow(1.0 - abs(dot(normalize(vec3(uv, 1.0)), vec3(0, 0, 1))), 2.0);
    vec3 color = bgColor * 0.4 + contentColor * 0.5 + highlightColor * 0.3 + accentColor * 0.15;
    color += fresnel * hsl2rgb(fract(uHue + 0.33), uSaturation * 0.9, 0.3) * 0.2;

    // Particles
    vec2 puv = uv * 12.0;
    vec2 pid = floor(puv);
    float pdist = length(fract(puv) - 0.5);
    float palpha = sin(t * 3.0 + dot(pid, vec2(127.1, 311.7))) * 0.5 + 0.5;
    float particles = (1.0 - smoothstep(0.05, 0.2, pdist)) * palpha * 0.3;
    color += particles * hsl2rgb(fract(uHue + 0.15), uSaturation * 0.5, 0.85);

    fragColor = TDOutputSwizzle(vec4(color, gi * 0.8 + 0.1));
}`
        };

        code += mainFunctions[system] || mainFunctions.faceted;
        code += '\n';

        return code;
    }

    /**
     * Exports a TouchDesigner .tox component structure (XML-based).
     *
     * The returned object represents the XML structure of a .tox file
     * containing a GLSL TOP with all VIB3 Custom Parameters pre-configured.
     *
     * Note: TouchDesigner .tox files are binary containers. This method
     * returns the component definition as structured data. For a true .tox,
     * you would need to use TouchDesigner's Python scripting to create the
     * component programmatically.
     *
     * @param {object} [options={}] - TOX generation options
     * @param {string} [options.system='faceted'] - VIB3 system to include
     * @param {string} [options.name='vib3_visualizer'] - Component name
     * @returns {object} TOX component definition structure
     */
    static exportTOX(options = {}) {
        const system = options.system || 'faceted';
        const name = options.name || 'vib3_visualizer';

        const customParams = [];
        for (const [vib3Name, td] of Object.entries(TD_UNIFORM_MAP)) {
            if (td.customPar) {
                customParams.push({
                    name: td.tdName,
                    label: td.description,
                    type: 'Float',
                    default: td.default,
                    min: td.range[0],
                    max: td.range[1],
                    clampMin: true,
                    clampMax: true
                });
            }
        }

        return {
            type: 'COMP',
            name,
            description: `VIB3+ ${system} 4D Visualization Component`,
            version: '1.0.0',
            operators: [
                {
                    type: 'glslTOP',
                    name: `${name}_glsl`,
                    parameters: {
                        pixelshader: Vib3TouchDesignerExport.exportGLSLTOP(system),
                        outputresolution: 'Custom',
                        resolutionw: 1920,
                        resolutionh: 1080,
                        format: 'RGBA 8-bit',
                        npasses: 1
                    },
                    customParameters: customParams
                }
            ],
            pythonSetupScript: `
# VIB3+ TouchDesigner Component Setup Script
# Run this in a Script CHOP or textport to create the component

def create_vib3_comp(parent_op, name='${name}'):
    """Create a VIB3+ GLSL TOP with all Custom Parameters."""
    comp = parent_op.create(baseCOMP, name)

    # Create GLSL TOP
    glsl = comp.create(glslTOP, '${name}_glsl')
    glsl.par.resolutionw = 1920
    glsl.par.resolutionh = 1080
    glsl.par.outputresolution = 'Custom'

    # Add Custom Parameters
    page = comp.appendCustomPage('VIB3')
${customParams.map(p => `    page.appendFloat('${p.name}', label='${p.label}')[0].default = ${p.default}
    page.appendFloat('${p.name}', label='${p.label}')[0].min = ${p.min}
    page.appendFloat('${p.name}', label='${p.label}')[0].max = ${p.max}`).join('\n')}

    # Set pixel shader
    # (paste exported GLSL code into glsl.par.pixelshader)

    # Wire custom params to GLSL uniforms
    for par in comp.customPars:
        glsl.par[par.name].expr = f"parent().par.{par.name}"

    # Output
    out = comp.create(outTOP, 'out1')
    out.inputConnectors[0].connect(glsl)

    return comp
`
        };
    }

    /**
     * Returns usage documentation for the TouchDesigner export.
     *
     * @param {string} [system='faceted'] - System the docs are for
     * @returns {string} Formatted usage instructions
     */
    static getReadme(system = 'faceted') {
        const customParamList = Object.entries(TD_UNIFORM_MAP)
            .filter(([_, td]) => td.customPar)
            .map(([_, td]) => `  - ${td.tdName}: ${td.description} [${td.range[0]} to ${td.range[1]}] (default: ${td.default})`)
            .join('\n');

        return `# VIB3+ TouchDesigner Integration
## System: ${system}

### Quick Setup

1. **Create a GLSL TOP**
   - Right-click in the network editor > TOP > GLSL
   - Set Output Resolution to your desired size (e.g. 1920x1080)

2. **Paste the Shader**
   - Open the GLSL TOP's parameters
   - Click the "Pixel" tab
   - Paste the exported GLSL code into the pixel shader field

3. **Add Custom Parameters**
   - Select the GLSL TOP
   - Press Ctrl+P to open Custom Parameters
   - Add the following Float parameters:

${customParamList}

4. **Wire Custom Parameters**
   - In the GLSL TOP's "Vectors 1" page, reference custom params:
     e.g., me.par.uGeometry for the geometry parameter

### Audio Reactivity

1. Create an **Audio Device In CHOP**
2. Add an **Audio Spectrum CHOP** (optional, for frequency bands)
3. Use **CHOP Execute** or **Export CHOP** to map:
   - Low frequency band -> uBass parameter
   - Mid frequency band -> uMid parameter
   - High frequency band -> uHigh parameter

### LFO Animation

Use **LFO CHOPs** to animate rotation parameters:
- Connect LFO output to uRot4dxw, uRot4dyw, uRot4dzw for smooth 4D rotation
- Recommended: sine wave, 0.1-0.5 Hz, amplitude matching parameter range

### Performance Tips

- Start with 1080p resolution; scale up as GPU allows
- Reduce uGriddensity for better performance on complex geometries
- The fractal geometry (5) is most GPU-intensive
- Use TOP > Resolution to downsample if needed

### Geometry Guide

| Index | Base | Core |
|-------|------|------|
| 0-7 | Tet/Cube/Sph/Tor/Kln/Frc/Wav/Cry | Base |
| 8-15 | Same | Hypersphere |
| 16-23 | Same | Hypertetrahedron |

### Generated by VIB3+ Engine - Clear Seas Solutions LLC
`;
    }

    /**
     * Returns the TouchDesigner uniform mapping table.
     * @returns {Object} Map of VIB3 uniform names to TD definitions
     */
    static getUniformMap() {
        return { ...TD_UNIFORM_MAP };
    }

    /**
     * Returns the list of exportable system names.
     * @returns {string[]}
     */
    static getExportableSystems() {
        return [...EXPORTABLE_SYSTEMS];
    }
}
