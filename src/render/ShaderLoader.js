/**
 * ShaderLoader - Fetch, cache, and manage external shader files for VIB3+
 *
 * Loads .glsl and .wgsl shader files from src/shaders/ and provides them
 * to visualization systems via the UnifiedRenderBridge.
 *
 * Features:
 * - Async fetch with in-memory caching
 * - Parallel loading of GLSL + WGSL pairs
 * - Base path configuration for deployment flexibility
 * - Error reporting per shader file
 *
 * Usage:
 *   const loader = new ShaderLoader({ basePath: 'src/shaders' });
 *   const sources = await loader.loadShaderPair('faceted', 'faceted/faceted.frag');
 *   // sources = { glslVertex, glslFragment, wgslFragment }
 *   bridge.compileShader('faceted', sources);
 */

/**
 * Default base path relative to the HTML entry point.
 * Override via constructor options if shaders are served from a different location.
 */
const DEFAULT_BASE_PATH = 'src/shaders';

/**
 * Default vertex shader source used when no external vertex file is provided.
 * Simple fullscreen quad via attribute positions.
 */
const FALLBACK_VERTEX_GLSL = `
attribute vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * Default WGSL vertex shader - oversized triangle technique (no vertex buffer).
 */
const FALLBACK_VERTEX_WGSL = `
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var output: VertexOutput;
    let x = f32(i32(vertexIndex & 1u) * 4 - 1);
    let y = f32(i32(vertexIndex >> 1u) * 4 - 1);
    output.position = vec4<f32>(x, y, 0.0, 1.0);
    output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);
    return output;
}
`;

export class ShaderLoader {
    /**
     * @param {object} [options]
     * @param {string} [options.basePath] - Base URL path for shader files
     */
    constructor(options = {}) {
        /** @type {string} */
        this.basePath = options.basePath || DEFAULT_BASE_PATH;

        /** @type {Map<string, string>} path → source text */
        this._cache = new Map();

        /** @type {Map<string, Promise<string>>} in-flight fetches */
        this._pending = new Map();

        /** @type {Set<string>} paths that failed to load */
        this._failed = new Set();
    }

    /**
     * Fetch a single shader file by relative path.
     * Results are cached; subsequent calls return from cache.
     *
     * @param {string} relativePath - e.g. 'common/rotation4d.glsl'
     * @returns {Promise<string|null>} Shader source or null on failure
     */
    async load(relativePath) {
        const key = relativePath;

        // Return from cache
        if (this._cache.has(key)) {
            return this._cache.get(key);
        }

        // Return in-flight promise to avoid duplicate fetches
        if (this._pending.has(key)) {
            return this._pending.get(key);
        }

        // Known failure
        if (this._failed.has(key)) {
            return null;
        }

        const url = `${this.basePath}/${relativePath}`;
        const fetchPromise = this._fetchShader(url, key);
        this._pending.set(key, fetchPromise);

        const result = await fetchPromise;
        this._pending.delete(key);
        return result;
    }

    /**
     * Load a matched pair of GLSL + WGSL fragment shaders for a system,
     * plus the common vertex shaders.
     *
     * @param {string} systemName - e.g. 'faceted', 'quantum', 'holographic'
     * @param {string} fragmentBasePath - e.g. 'faceted/faceted.frag' (without extension)
     * @param {object} [options]
     * @param {string} [options.vertexGlslPath] - Override vertex GLSL path
     * @param {string} [options.vertexWgslPath] - Override vertex WGSL path
     * @returns {Promise<{glslVertex: string, glslFragment: string|null, wgslFragment: string|null}>}
     */
    async loadShaderPair(systemName, fragmentBasePath, options = {}) {
        const vertGlslPath = options.vertexGlslPath || 'common/fullscreen.vert.glsl';
        const vertWgslPath = options.vertexWgslPath || 'common/fullscreen.vert.wgsl';
        const fragGlslPath = `${fragmentBasePath}.glsl`;
        const fragWgslPath = `${fragmentBasePath}.wgsl`;

        // Fetch all four in parallel
        const [vertGlsl, vertWgsl, fragGlsl, fragWgsl] = await Promise.all([
            this.load(vertGlslPath),
            this.load(vertWgslPath),
            this.load(fragGlslPath),
            this.load(fragWgslPath)
        ]);

        return {
            glslVertex: vertGlsl || FALLBACK_VERTEX_GLSL,
            glslFragment: fragGlsl,
            wgslVertex: vertWgsl || FALLBACK_VERTEX_WGSL,
            wgslFragment: fragWgsl
        };
    }

    /**
     * Load all common library shader files.
     * Returns an object keyed by library name.
     *
     * @returns {Promise<object>} { uniforms: { glsl, wgsl }, rotation4d: { glsl, wgsl }, geometry24: { glsl, wgsl } }
     */
    async loadCommonLibrary() {
        const libs = ['uniforms', 'rotation4d', 'geometry24'];
        const results = {};

        await Promise.all(libs.map(async (name) => {
            const [glsl, wgsl] = await Promise.all([
                this.load(`common/${name}.glsl`),
                this.load(`common/${name}.wgsl`)
            ]);
            results[name] = { glsl, wgsl };
        }));

        return results;
    }

    /**
     * Preload all shader files for a given system.
     *
     * @param {string} systemName - 'quantum' | 'faceted' | 'holographic'
     * @returns {Promise<{glslVertex: string, glslFragment: string|null, wgslFragment: string|null}>}
     */
    async preloadSystem(systemName) {
        const fragPaths = {
            quantum: 'quantum/quantum.frag',
            faceted: 'faceted/faceted.frag',
            holographic: 'holographic/holographic.frag'
        };

        const fragBase = fragPaths[systemName];
        if (!fragBase) {
            console.warn(`ShaderLoader: Unknown system "${systemName}"`);
            return { glslVertex: FALLBACK_VERTEX_GLSL, glslFragment: null, wgslFragment: null };
        }

        return this.loadShaderPair(systemName, fragBase);
    }

    /**
     * Preload all three systems' shaders in parallel.
     *
     * @returns {Promise<Map<string, object>>} system name → shader sources
     */
    async preloadAll() {
        const systems = ['quantum', 'faceted', 'holographic'];
        const results = new Map();

        await Promise.all(systems.map(async (name) => {
            results.set(name, await this.preloadSystem(name));
        }));

        return results;
    }

    /**
     * Clear all cached shaders.
     */
    clearCache() {
        this._cache.clear();
        this._failed.clear();
    }

    /**
     * Get cache statistics.
     * @returns {{ cached: number, failed: number, pending: number }}
     */
    getStats() {
        return {
            cached: this._cache.size,
            failed: this._failed.size,
            pending: this._pending.size
        };
    }

    /**
     * @private
     * @param {string} url
     * @param {string} key
     * @returns {Promise<string|null>}
     */
    async _fetchShader(url, key) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`ShaderLoader: Failed to fetch ${url} (${response.status})`);
                this._failed.add(key);
                return null;
            }
            const text = await response.text();
            this._cache.set(key, text);
            return text;
        } catch (err) {
            console.warn(`ShaderLoader: Network error fetching ${url}:`, err.message);
            this._failed.add(key);
            return null;
        }
    }
}

/**
 * Singleton shader loader instance.
 * Import this for convenient shared access across the app.
 */
export const shaderLoader = new ShaderLoader();

export default ShaderLoader;
