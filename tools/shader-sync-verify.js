/**
 * VIB3+ Shader Sync Verification Tool
 * Ensures uniform consistency across all visualization systems
 *
 * Usage:
 *   Node.js (static analysis):
 *     node tools/shader-sync-verify.js
 *
 *   Browser console (runtime):
 *     import { ShaderSyncVerifier } from './tools/shader-sync-verify.js';
 *     const verifier = new ShaderSyncVerifier();
 *     verifier.runFullAudit();
 *
 * This tool parses GLSL and WGSL shader source to extract uniform declarations,
 * then compares across the Quantum, Faceted, and Holographic systems to flag
 * missing, mismatched, or extra uniforms relative to the VIB3+ standard set.
 */

// ---------------------------------------------------------------------------
// ShaderSyncVerifier
// ---------------------------------------------------------------------------

export class ShaderSyncVerifier {
    constructor() {
        /**
         * The canonical VIB3+ uniform contract.
         * Every system MUST declare the "required" set.
         * "recommended" uniforms enable full audio/interaction reactivity.
         * "optional" uniforms are system-specific extensions.
         */
        this.STANDARD_UNIFORMS = {
            required: [
                'u_time', 'u_resolution', 'u_geometry',
                'u_rot4dXY', 'u_rot4dXZ', 'u_rot4dYZ',
                'u_rot4dXW', 'u_rot4dYW', 'u_rot4dZW',
                'u_gridDensity', 'u_morphFactor', 'u_chaos',
                'u_speed', 'u_hue', 'u_intensity', 'u_dimension'
            ],
            recommended: [
                'u_saturation', 'u_mouseIntensity', 'u_clickIntensity',
                'u_bass', 'u_mid', 'u_high'
            ],
            optional: [
                'u_mouse', 'u_roleIntensity', 'u_layerScale',
                'u_layerOpacity', 'u_layerColor', 'u_densityMult', 'u_speedMult'
            ]
        };

        /** Map of system name -> { glslUniforms, wgslUniforms, sources } */
        this.systems = new Map();
    }

    // -----------------------------------------------------------------------
    // GLSL uniform parser
    // -----------------------------------------------------------------------

    /**
     * Parse GLSL source code and extract all uniform declarations.
     * Handles `uniform float u_foo;`, `uniform vec2 u_bar;`, etc.
     * Returns an array of { name, type, qualifiers } objects.
     *
     * @param {string} source - GLSL shader source code
     * @returns {{ name: string, type: string, qualifiers: string }[]}
     */
    parseGLSLUniforms(source) {
        if (!source || typeof source !== 'string') return [];

        const uniforms = [];
        // Match:  uniform <optional qualifiers> <type> <name> ;
        // Handles optional precision qualifiers like `uniform highp float u_time;`
        const uniformRegex = /uniform\s+((?:(?:lowp|mediump|highp)\s+)?)(float|int|bool|[ui]?vec[234]|mat[234](?:x[234])?|sampler(?:2D|3D|Cube))\s+(\w+)\s*;/g;

        let match;
        while ((match = uniformRegex.exec(source)) !== null) {
            uniforms.push({
                name: match[3],
                type: match[2],
                qualifiers: match[1].trim() || ''
            });
        }

        return uniforms;
    }

    // -----------------------------------------------------------------------
    // WGSL uniform parser
    // -----------------------------------------------------------------------

    /**
     * Parse WGSL source code and extract struct fields used as uniforms.
     * Looks for a struct definition (typically VIB3Uniforms) bound via
     * `@group(0) @binding(0) var<uniform>`, then extracts its fields.
     *
     * Returns an array of { name, type } objects with names prefixed by `u_`
     * so they can be compared against the GLSL convention.  Padding fields
     * (names starting with `_`) are excluded.
     *
     * @param {string} source - WGSL shader source code
     * @returns {{ name: string, type: string }[]}
     */
    parseWGSLUniforms(source) {
        if (!source || typeof source !== 'string') return [];

        const uniforms = [];

        // Step 1 - Find the struct name referenced by the uniform binding
        const bindingRegex = /@group\s*\(\s*0\s*\)\s*@binding\s*\(\s*0\s*\)\s*var\s*<\s*uniform\s*>\s*\w+\s*:\s*(\w+)\s*;/;
        const bindingMatch = bindingRegex.exec(source);
        const structName = bindingMatch ? bindingMatch[1] : 'VIB3Uniforms';

        // Step 2 - Extract the struct body
        const structRegex = new RegExp(
            `struct\\s+${structName}\\s*\\{([^}]+)\\}`,
            's'
        );
        const structMatch = structRegex.exec(source);
        if (!structMatch) return uniforms;

        const body = structMatch[1];

        // Step 3 - Parse each field:  name: type,
        // Use a non-greedy type match that stops at comma, semicolon, or newline
        const fieldRegex = /(\w+)\s*:\s*([^,}\n]+)/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(body)) !== null) {
            const fieldName = fieldMatch[1].trim();
            const fieldType = fieldMatch[2].trim().replace(/,\s*$/, '');

            // Skip padding fields
            if (fieldName.startsWith('_')) continue;

            // Convert WGSL field name to u_ prefix for comparison
            const uniformName = this._wgslFieldToUniform(fieldName);
            uniforms.push({ name: uniformName, type: fieldType });
        }

        return uniforms;
    }

    /**
     * Convert a WGSL struct field name to the GLSL u_ convention.
     * e.g. "time" -> "u_time", "rot4dXY" -> "u_rot4dXY"
     * @private
     */
    _wgslFieldToUniform(fieldName) {
        if (fieldName.startsWith('u_')) return fieldName;
        return 'u_' + fieldName;
    }

    // -----------------------------------------------------------------------
    // System registration
    // -----------------------------------------------------------------------

    /**
     * Register a visualization system's shader sources for verification.
     *
     * @param {string} name - System name (e.g. 'quantum', 'faceted', 'holographic')
     * @param {object} sources
     * @param {string} [sources.glslVertex]    - GLSL vertex shader source
     * @param {string} [sources.glslFragment]  - GLSL fragment shader source
     * @param {string} [sources.wgslVertex]    - WGSL vertex shader source
     * @param {string} [sources.wgslFragment]  - WGSL fragment shader source
     */
    registerSystem(name, sources = {}) {
        const glslUniforms = [
            ...this.parseGLSLUniforms(sources.glslVertex || ''),
            ...this.parseGLSLUniforms(sources.glslFragment || '')
        ];

        // Deduplicate by name (vertex + fragment may both declare same uniform)
        const glslMap = new Map();
        for (const u of glslUniforms) {
            if (!glslMap.has(u.name)) glslMap.set(u.name, u);
        }

        const wgslUniforms = [
            ...this.parseWGSLUniforms(sources.wgslVertex || ''),
            ...this.parseWGSLUniforms(sources.wgslFragment || '')
        ];
        const wgslMap = new Map();
        for (const u of wgslUniforms) {
            if (!wgslMap.has(u.name)) wgslMap.set(u.name, u);
        }

        this.systems.set(name, {
            glslUniforms: glslMap,
            wgslUniforms: wgslMap,
            sources
        });
    }

    // -----------------------------------------------------------------------
    // Verification
    // -----------------------------------------------------------------------

    /**
     * Run verification across all registered systems.
     *
     * @returns {{
     *   systems: Object.<string, {
     *     glslUniforms: string[],
     *     wgslUniforms: string[],
     *     missingRequired: string[],
     *     missingRecommended: string[],
     *     extraUniforms: string[],
     *     glslWgslMismatch: { glslOnly: string[], wgslOnly: string[] }
     *   }>,
     *   crossSystemMismatch: { uniform: string, presentIn: string[], missingFrom: string[] }[],
     *   summary: string,
     *   passed: boolean
     * }}
     */
    verify() {
        const allRequired = new Set(this.STANDARD_UNIFORMS.required);
        const allRecommended = new Set(this.STANDARD_UNIFORMS.recommended);
        const allOptional = new Set(this.STANDARD_UNIFORMS.optional);
        const allKnown = new Set([...allRequired, ...allRecommended, ...allOptional]);

        const systemResults = {};
        let overallPassed = true;

        for (const [name, data] of this.systems) {
            const glslNames = new Set(data.glslUniforms.keys());
            const wgslNames = new Set(data.wgslUniforms.keys());
            const allNames = new Set([...glslNames, ...wgslNames]);

            // Required uniforms missing from GLSL fragment
            const missingRequired = [...allRequired].filter(u => !glslNames.has(u));

            // Recommended uniforms missing from GLSL fragment
            const missingRecommended = [...allRecommended].filter(u => !glslNames.has(u));

            // Extra uniforms not in any standard category
            const extraUniforms = [...allNames].filter(u => !allKnown.has(u));

            // GLSL vs WGSL mismatch (if both backends exist)
            const glslOnly = [...glslNames].filter(u => wgslNames.size > 0 && !wgslNames.has(u));
            const wgslOnly = [...wgslNames].filter(u => glslNames.size > 0 && !glslNames.has(u));

            if (missingRequired.length > 0) overallPassed = false;

            systemResults[name] = {
                glslUniforms: [...glslNames].sort(),
                wgslUniforms: [...wgslNames].sort(),
                missingRequired,
                missingRecommended,
                extraUniforms,
                glslWgslMismatch: { glslOnly, wgslOnly }
            };
        }

        // Cross-system comparison: check which required/recommended uniforms
        // are present in some systems but missing from others
        const systemNames = [...this.systems.keys()];
        const crossSystemMismatch = [];

        const checkSet = [...allRequired, ...allRecommended];
        for (const uniform of checkSet) {
            const presentIn = [];
            const missingFrom = [];

            for (const sysName of systemNames) {
                const data = this.systems.get(sysName);
                const glslNames = new Set(data.glslUniforms.keys());
                if (glslNames.has(uniform)) {
                    presentIn.push(sysName);
                } else {
                    missingFrom.push(sysName);
                }
            }

            if (presentIn.length > 0 && missingFrom.length > 0) {
                crossSystemMismatch.push({ uniform, presentIn, missingFrom });
            }
        }

        if (crossSystemMismatch.length > 0) overallPassed = false;

        // Build summary
        const summaryLines = [];
        summaryLines.push(`VIB3+ Shader Sync Verification Report`);
        summaryLines.push(`Systems checked: ${systemNames.join(', ')}`);
        summaryLines.push(`Overall status: ${overallPassed ? 'PASSED' : 'FAILED'}`);
        summaryLines.push('');

        for (const [sysName, result] of Object.entries(systemResults)) {
            summaryLines.push(`[${sysName}]`);
            summaryLines.push(`  GLSL uniforms: ${result.glslUniforms.length}`);
            summaryLines.push(`  WGSL uniforms: ${result.wgslUniforms.length}`);
            if (result.missingRequired.length > 0) {
                summaryLines.push(`  MISSING REQUIRED: ${result.missingRequired.join(', ')}`);
            }
            if (result.missingRecommended.length > 0) {
                summaryLines.push(`  Missing recommended: ${result.missingRecommended.join(', ')}`);
            }
            if (result.extraUniforms.length > 0) {
                summaryLines.push(`  Extra (system-specific): ${result.extraUniforms.join(', ')}`);
            }
            if (result.glslWgslMismatch.glslOnly.length > 0) {
                summaryLines.push(`  GLSL only (no WGSL): ${result.glslWgslMismatch.glslOnly.join(', ')}`);
            }
            if (result.glslWgslMismatch.wgslOnly.length > 0) {
                summaryLines.push(`  WGSL only (no GLSL): ${result.glslWgslMismatch.wgslOnly.join(', ')}`);
            }
            summaryLines.push('');
        }

        if (crossSystemMismatch.length > 0) {
            summaryLines.push('[Cross-System Inconsistencies]');
            for (const m of crossSystemMismatch) {
                summaryLines.push(`  ${m.uniform}: present in [${m.presentIn.join(', ')}], missing from [${m.missingFrom.join(', ')}]`);
            }
            summaryLines.push('');
        }

        return {
            systems: systemResults,
            crossSystemMismatch,
            summary: summaryLines.join('\n'),
            passed: overallPassed
        };
    }

    // -----------------------------------------------------------------------
    // Console report
    // -----------------------------------------------------------------------

    /**
     * Print a colour-coded report to the console.
     * Works in both Node.js (ANSI codes) and browser (console.log styles).
     */
    printReport() {
        const report = this.verify();
        const isBrowser = typeof window !== 'undefined';

        if (isBrowser) {
            this._printBrowserReport(report);
        } else {
            this._printNodeReport(report);
        }

        return report;
    }

    /** @private */
    _printBrowserReport(report) {
        const headerStyle = 'font-weight:bold;font-size:14px;color:#64ff96;';
        const sysStyle    = 'font-weight:bold;font-size:12px;color:#00bfff;';
        const okStyle     = 'color:#64ff96;';
        const warnStyle   = 'color:#ffa500;';
        const errStyle    = 'color:#ff4444;font-weight:bold;';
        const dimStyle    = 'color:#888;';

        console.log('%c=== VIB3+ Shader Sync Verification ===', headerStyle);
        console.log('%cSystems: %s', dimStyle, [...this.systems.keys()].join(', '));
        console.log(
            `%c${report.passed ? 'PASSED' : 'FAILED'}`,
            report.passed ? okStyle : errStyle
        );

        for (const [sysName, result] of Object.entries(report.systems)) {
            console.log('%c--- %s ---', sysStyle, sysName);
            console.log('%cGLSL uniforms (%d): %s', dimStyle,
                result.glslUniforms.length, result.glslUniforms.join(', '));
            console.log('%cWGSL uniforms (%d): %s', dimStyle,
                result.wgslUniforms.length, result.wgslUniforms.join(', '));

            if (result.missingRequired.length > 0) {
                console.log('%cMISSING REQUIRED: %s', errStyle,
                    result.missingRequired.join(', '));
            } else {
                console.log('%cAll required uniforms present', okStyle);
            }

            if (result.missingRecommended.length > 0) {
                console.log('%cMissing recommended: %s', warnStyle,
                    result.missingRecommended.join(', '));
            }

            if (result.extraUniforms.length > 0) {
                console.log('%cExtra (system-specific): %s', dimStyle,
                    result.extraUniforms.join(', '));
            }

            if (result.glslWgslMismatch.glslOnly.length > 0) {
                console.log('%cGLSL only (no WGSL): %s', warnStyle,
                    result.glslWgslMismatch.glslOnly.join(', '));
            }
            if (result.glslWgslMismatch.wgslOnly.length > 0) {
                console.log('%cWGSL only (no GLSL): %s', warnStyle,
                    result.glslWgslMismatch.wgslOnly.join(', '));
            }
        }

        if (report.crossSystemMismatch.length > 0) {
            console.log('%c--- Cross-System Inconsistencies ---', errStyle);
            for (const m of report.crossSystemMismatch) {
                console.log(
                    '%c  %s: present in [%s], missing from [%s]',
                    warnStyle, m.uniform,
                    m.presentIn.join(', '), m.missingFrom.join(', ')
                );
            }
        }
    }

    /** @private */
    _printNodeReport(report) {
        const R = '\x1b[31m';  // red
        const G = '\x1b[32m';  // green
        const Y = '\x1b[33m';  // yellow
        const C = '\x1b[36m';  // cyan
        const D = '\x1b[90m';  // dim
        const B = '\x1b[1m';   // bold
        const X = '\x1b[0m';   // reset

        console.log(`${B}${G}=== VIB3+ Shader Sync Verification ===${X}`);
        console.log(`${D}Systems: ${[...this.systems.keys()].join(', ')}${X}`);
        console.log(
            report.passed
                ? `${B}${G}PASSED${X}`
                : `${B}${R}FAILED${X}`
        );
        console.log('');

        for (const [sysName, result] of Object.entries(report.systems)) {
            console.log(`${B}${C}--- ${sysName} ---${X}`);
            console.log(`${D}  GLSL uniforms (${result.glslUniforms.length}): ${result.glslUniforms.join(', ')}${X}`);
            console.log(`${D}  WGSL uniforms (${result.wgslUniforms.length}): ${result.wgslUniforms.join(', ')}${X}`);

            if (result.missingRequired.length > 0) {
                console.log(`${R}  MISSING REQUIRED: ${result.missingRequired.join(', ')}${X}`);
            } else {
                console.log(`${G}  All required uniforms present${X}`);
            }

            if (result.missingRecommended.length > 0) {
                console.log(`${Y}  Missing recommended: ${result.missingRecommended.join(', ')}${X}`);
            }

            if (result.extraUniforms.length > 0) {
                console.log(`${D}  Extra (system-specific): ${result.extraUniforms.join(', ')}${X}`);
            }

            if (result.glslWgslMismatch.glslOnly.length > 0) {
                console.log(`${Y}  GLSL only (no WGSL): ${result.glslWgslMismatch.glslOnly.join(', ')}${X}`);
            }
            if (result.glslWgslMismatch.wgslOnly.length > 0) {
                console.log(`${Y}  WGSL only (no GLSL): ${result.glslWgslMismatch.wgslOnly.join(', ')}${X}`);
            }
            console.log('');
        }

        if (report.crossSystemMismatch.length > 0) {
            console.log(`${B}${R}--- Cross-System Inconsistencies ---${X}`);
            for (const m of report.crossSystemMismatch) {
                console.log(
                    `${Y}  ${m.uniform}: present in [${m.presentIn.join(', ')}], missing from [${m.missingFrom.join(', ')}]${X}`
                );
            }
            console.log('');
        }
    }

    // -----------------------------------------------------------------------
    // Runtime verification (browser only - live WebGL programs)
    // -----------------------------------------------------------------------

    /**
     * Verify a live WebGL program's active uniforms against the standard set.
     * Call from browser console after shaders are compiled and linked.
     *
     * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - GL context
     * @param {WebGLProgram} program - Compiled and linked shader program
     * @param {string} [systemName='unknown'] - Name for reporting
     * @returns {{ activeUniforms: string[], missingRequired: string[], missingRecommended: string[], passed: boolean }}
     */
    verifyRuntime(gl, program, systemName = 'unknown') {
        if (!gl || !program) {
            console.error('ShaderSyncVerifier.verifyRuntime: gl and program are required');
            return { activeUniforms: [], missingRequired: [], missingRecommended: [], passed: false };
        }

        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        const activeUniforms = [];

        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(program, i);
            if (info) {
                activeUniforms.push(info.name);
            }
        }

        const activeSet = new Set(activeUniforms);

        const missingRequired = this.STANDARD_UNIFORMS.required.filter(
            u => !activeSet.has(u)
        );
        const missingRecommended = this.STANDARD_UNIFORMS.recommended.filter(
            u => !activeSet.has(u)
        );

        const passed = missingRequired.length === 0;

        // Console output
        const isBrowser = typeof window !== 'undefined';
        if (isBrowser) {
            const style = passed
                ? 'color:#64ff96;font-weight:bold;'
                : 'color:#ff4444;font-weight:bold;';
            console.log(`%cRuntime verification [${systemName}]: ${passed ? 'PASSED' : 'FAILED'}`, style);
            console.log(`  Active uniforms (${activeUniforms.length}):`, activeUniforms.sort().join(', '));
            if (missingRequired.length > 0) {
                console.log('%c  MISSING REQUIRED: ' + missingRequired.join(', '), 'color:#ff4444;');
            }
            if (missingRecommended.length > 0) {
                console.log('%c  Missing recommended: ' + missingRecommended.join(', '), 'color:#ffa500;');
            }
        } else {
            console.log(`Runtime verification [${systemName}]: ${passed ? 'PASSED' : 'FAILED'}`);
            console.log(`  Active uniforms (${activeUniforms.length}):`, activeUniforms.sort().join(', '));
            if (missingRequired.length > 0) {
                console.log('  MISSING REQUIRED:', missingRequired.join(', '));
            }
            if (missingRecommended.length > 0) {
                console.log('  Missing recommended:', missingRecommended.join(', '));
            }
        }

        return { activeUniforms, missingRequired, missingRecommended, passed };
    }

    // -----------------------------------------------------------------------
    // Static analysis (no GL context needed)
    // -----------------------------------------------------------------------

    /**
     * Analyse a single shader source without instantiating a verifier.
     *
     * @param {string} source - Shader source code (GLSL or WGSL)
     * @param {'glsl'|'wgsl'} [language='glsl'] - Shader language
     * @returns {{ uniforms: { name: string, type: string }[], language: string }}
     */
    static analyzeSource(source, language = 'glsl') {
        const verifier = new ShaderSyncVerifier();
        let uniforms;

        if (language === 'wgsl') {
            uniforms = verifier.parseWGSLUniforms(source);
        } else {
            uniforms = verifier.parseGLSLUniforms(source);
        }

        return { uniforms, language };
    }
}


// ---------------------------------------------------------------------------
// Embedded shader sources for the three active VIB3+ systems
// ---------------------------------------------------------------------------
// These are extracted from the inline GLSL in each system's .js file so the
// tool can run as a standalone Node.js script without a browser.
// ---------------------------------------------------------------------------

/**
 * Quantum system GLSL fragment shader uniforms (from QuantumVisualizer.js).
 * The shader is defined inline in initShaders().
 */
const QUANTUM_GLSL_FRAGMENT = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
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
uniform float u_roleIntensity;
void main() { gl_FragColor = vec4(0.0); }
`;

/**
 * Faceted system GLSL fragment shader uniforms (from FacetedSystem.js).
 */
const FACETED_GLSL_FRAGMENT = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_geometry;
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
void main() { gl_FragColor = vec4(0.0); }
`;

/**
 * Faceted system WGSL fragment shader (from FacetedSystem.js inline).
 */
const FACETED_WGSL_FRAGMENT = `
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
`;

/**
 * Holographic system GLSL fragment shader uniforms (from HolographicVisualizer.js).
 * This system uses non-standard names for several uniforms.
 */
const HOLOGRAPHIC_GLSL_FRAGMENT = `
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
void main() { gl_FragColor = vec4(0.0); }
`;

/**
 * Holographic system WGSL fragment shader (from holographic.frag.wgsl).
 */
const HOLOGRAPHIC_WGSL_FRAGMENT = `
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
`;

/**
 * Quantum system WGSL fragment shader (from quantum.frag.wgsl).
 */
const QUANTUM_WGSL_FRAGMENT = `
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
`;


// ---------------------------------------------------------------------------
// runFullAudit - registers all 3 systems and runs verification
// ---------------------------------------------------------------------------

/**
 * Register all three VIB3+ visualization systems and run a full audit.
 * Returns the verification report object and prints to console.
 *
 * @returns {{ systems: object, crossSystemMismatch: object[], summary: string, passed: boolean }}
 */
export function runFullAudit() {
    const verifier = new ShaderSyncVerifier();

    // Register Quantum system
    verifier.registerSystem('quantum', {
        glslFragment: QUANTUM_GLSL_FRAGMENT,
        wgslFragment: QUANTUM_WGSL_FRAGMENT
    });

    // Register Faceted system
    verifier.registerSystem('faceted', {
        glslFragment: FACETED_GLSL_FRAGMENT,
        wgslFragment: FACETED_WGSL_FRAGMENT
    });

    // Register Holographic system
    verifier.registerSystem('holographic', {
        glslFragment: HOLOGRAPHIC_GLSL_FRAGMENT,
        wgslFragment: HOLOGRAPHIC_WGSL_FRAGMENT
    });

    const report = verifier.printReport();

    // Generate the uniform matrix table
    _printUniformMatrix(verifier, report);

    return report;
}


/**
 * Print a matrix showing which uniforms are present in which systems.
 * @private
 */
function _printUniformMatrix(verifier, report) {
    const isBrowser = typeof window !== 'undefined';

    // Collect every uniform name across all systems
    const allUniforms = new Set();
    for (const result of Object.values(report.systems)) {
        for (const u of result.glslUniforms) allUniforms.add(u);
        for (const u of result.wgslUniforms) allUniforms.add(u);
    }
    // Also include standard uniforms even if missing everywhere
    for (const u of verifier.STANDARD_UNIFORMS.required) allUniforms.add(u);
    for (const u of verifier.STANDARD_UNIFORMS.recommended) allUniforms.add(u);

    const sortedUniforms = [...allUniforms].sort();
    const systemNames = Object.keys(report.systems);

    // Categorize
    const requiredSet = new Set(verifier.STANDARD_UNIFORMS.required);
    const recommendedSet = new Set(verifier.STANDARD_UNIFORMS.recommended);

    if (isBrowser) {
        console.log('%c=== Uniform Coverage Matrix ===', 'font-weight:bold;font-size:12px;color:#64ff96;');
        console.table(
            sortedUniforms.reduce((table, uniform) => {
                const row = { uniform, category: requiredSet.has(uniform) ? 'required' : (recommendedSet.has(uniform) ? 'recommended' : 'extra') };
                for (const sysName of systemNames) {
                    const result = report.systems[sysName];
                    const inGlsl = result.glslUniforms.includes(uniform);
                    const inWgsl = result.wgslUniforms.includes(uniform);
                    if (inGlsl && inWgsl) row[sysName] = 'GLSL+WGSL';
                    else if (inGlsl) row[sysName] = 'GLSL';
                    else if (inWgsl) row[sysName] = 'WGSL';
                    else row[sysName] = '---';
                }
                table.push(row);
                return table;
            }, [])
        );
    } else {
        const G = '\x1b[32m';
        const Y = '\x1b[33m';
        const R = '\x1b[31m';
        const D = '\x1b[90m';
        const B = '\x1b[1m';
        const X = '\x1b[0m';

        console.log(`\n${B}${G}=== Uniform Coverage Matrix ===${X}\n`);

        // Header
        const nameCol = 28;
        const catCol = 14;
        const sysCol = 16;

        let header = 'Uniform'.padEnd(nameCol) + 'Category'.padEnd(catCol);
        for (const sysName of systemNames) {
            header += sysName.padEnd(sysCol);
        }
        console.log(`${B}${header}${X}`);
        console.log('-'.repeat(nameCol + catCol + sysCol * systemNames.length));

        for (const uniform of sortedUniforms) {
            const category = requiredSet.has(uniform) ? 'required'
                : (recommendedSet.has(uniform) ? 'recommended' : 'extra');

            let line = uniform.padEnd(nameCol);

            if (category === 'required') line += `${R}${category.padEnd(catCol)}${X}`;
            else if (category === 'recommended') line += `${Y}${category.padEnd(catCol)}${X}`;
            else line += `${D}${category.padEnd(catCol)}${X}`;

            for (const sysName of systemNames) {
                const result = report.systems[sysName];
                const inGlsl = result.glslUniforms.includes(uniform);
                const inWgsl = result.wgslUniforms.includes(uniform);

                let cell;
                if (inGlsl && inWgsl) cell = `${G}GLSL+WGSL${X}`;
                else if (inGlsl) cell = `${Y}GLSL${X}`;
                else if (inWgsl) cell = `${Y}WGSL${X}`;
                else cell = `${R}---${X}`;

                // Pad accounting for ANSI codes
                const visibleLen = cell.replace(/\x1b\[\d+m/g, '').length;
                line += cell + ' '.repeat(Math.max(0, sysCol - visibleLen));
            }

            console.log(line);
        }
        console.log('');
    }
}


// ---------------------------------------------------------------------------
// CLI entry point (Node.js)
// ---------------------------------------------------------------------------

const isNodeMain = typeof process !== 'undefined'
    && typeof process.argv !== 'undefined'
    && process.argv[1]
    && (process.argv[1].endsWith('shader-sync-verify.js')
        || process.argv[1].endsWith('shader-sync-verify'));

if (isNodeMain) {
    const report = runFullAudit();
    process.exit(report.passed ? 0 : 1);
}
