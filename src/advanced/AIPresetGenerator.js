/**
 * VIB3+ AI Preset Generator
 * Uses rule-based NLP keyword extraction and optional MCP/LLM integration
 * to generate creative parameter presets from natural-language descriptions.
 *
 * The generator works in three tiers:
 *  1. Built-in keyword-to-parameter vocabulary (no external API needed)
 *  2. Algorithmic random generation with optional theme constraints
 *  3. MCP protocol integration for full LLM-powered generation
 *
 * Also provides preset mutation and crossbreeding for evolutionary exploration.
 *
 * @module advanced/AIPresetGenerator
 */

/**
 * A VIB3 preset -- a complete set of visualization parameters.
 * @typedef {Object} VIB3Preset
 * @property {string}  name        - Human-readable name
 * @property {string}  description - How this preset was generated
 * @property {number}  geometry    - Geometry index (0-23)
 * @property {number}  rot4dXY     - XY rotation (0 - 2*PI)
 * @property {number}  rot4dXZ     - XZ rotation
 * @property {number}  rot4dYZ     - YZ rotation
 * @property {number}  rot4dXW     - XW rotation
 * @property {number}  rot4dYW     - YW rotation
 * @property {number}  rot4dZW     - ZW rotation
 * @property {number}  gridDensity - Grid density (4-100)
 * @property {number}  morphFactor - Morph factor (0-2)
 * @property {number}  chaos       - Chaos level (0-1)
 * @property {number}  speed       - Animation speed (0.1-3)
 * @property {number}  hue         - Color hue (0-360)
 * @property {number}  intensity   - Brightness (0-1)
 * @property {number}  saturation  - Color saturation (0-1)
 * @property {number}  dimension   - Projection distance (3.0-4.5)
 * @property {string}  [system]    - Optional target system (quantum|faceted|holographic)
 * @property {number}  timestamp   - Creation timestamp (ms)
 */

/** Parameter ranges used by the generator. */
const PARAM_RANGES = {
    geometry:    { min: 0,    max: 23,         step: 1,    type: 'int' },
    rot4dXY:     { min: 0,    max: Math.PI * 2, step: null, type: 'float' },
    rot4dXZ:     { min: 0,    max: Math.PI * 2, step: null, type: 'float' },
    rot4dYZ:     { min: 0,    max: Math.PI * 2, step: null, type: 'float' },
    rot4dXW:     { min: 0,    max: Math.PI * 2, step: null, type: 'float' },
    rot4dYW:     { min: 0,    max: Math.PI * 2, step: null, type: 'float' },
    rot4dZW:     { min: 0,    max: Math.PI * 2, step: null, type: 'float' },
    gridDensity: { min: 4,    max: 100,        step: 1,    type: 'float' },
    morphFactor: { min: 0,    max: 2,          step: null, type: 'float' },
    chaos:       { min: 0,    max: 1,          step: null, type: 'float' },
    speed:       { min: 0.1,  max: 3,          step: null, type: 'float' },
    hue:         { min: 0,    max: 360,        step: null, type: 'float' },
    intensity:   { min: 0,    max: 1,          step: null, type: 'float' },
    saturation:  { min: 0,    max: 1,          step: null, type: 'float' },
    dimension:   { min: 3.0,  max: 4.5,        step: null, type: 'float' }
};

/**
 * Style vocabulary: maps descriptive keywords to partial parameter overrides.
 * Values are expressed as fractions of the parameter range (0-1) unless
 * marked as absolute.
 */
const STYLE_VOCABULARY = {
    // Energy / Motion
    energetic:    { speed: [0.7, 1.0], chaos: [0.4, 0.7], intensity: [0.7, 1.0], hue: [0, 60] },
    calm:         { speed: [0.05, 0.25], chaos: [0.0, 0.15], intensity: [0.3, 0.6], hue: [180, 240] },
    frantic:      { speed: [0.85, 1.0], chaos: [0.7, 1.0], morphFactor: [0.6, 1.0], gridDensity: [0.5, 0.8] },
    slow:         { speed: [0.0, 0.15], chaos: [0.0, 0.1] },
    fast:         { speed: [0.7, 1.0], chaos: [0.2, 0.5] },
    gentle:       { speed: [0.05, 0.2], chaos: [0.0, 0.1], intensity: [0.2, 0.5] },
    aggressive:   { speed: [0.8, 1.0], chaos: [0.6, 1.0], intensity: [0.8, 1.0] },
    pulsing:      { speed: [0.4, 0.6], morphFactor: [0.5, 1.0], chaos: [0.2, 0.4] },
    flowing:      { speed: [0.2, 0.45], chaos: [0.1, 0.3], morphFactor: [0.3, 0.7] },
    chaotic:      { chaos: [0.7, 1.0], speed: [0.5, 0.8] },
    orderly:      { chaos: [0.0, 0.1], gridDensity: [0.4, 0.7] },
    vibrating:    { speed: [0.6, 0.8], morphFactor: [0.4, 0.8], chaos: [0.3, 0.5] },

    // Color / Light
    dark:         { intensity: [0.05, 0.25], saturation: [0.2, 0.5], hue: [240, 300] },
    bright:       { intensity: [0.7, 1.0], saturation: [0.6, 1.0] },
    neon:         { intensity: [0.8, 1.0], saturation: [0.9, 1.0], hue: [280, 340] },
    pastel:       { intensity: [0.5, 0.7], saturation: [0.2, 0.4] },
    monochrome:   { saturation: [0.0, 0.05], intensity: [0.4, 0.8] },
    warm:         { hue: [0, 60], saturation: [0.5, 0.8], intensity: [0.5, 0.8] },
    cool:         { hue: [180, 270], saturation: [0.4, 0.7], intensity: [0.4, 0.7] },
    fiery:        { hue: [0, 30], saturation: [0.8, 1.0], intensity: [0.7, 1.0], speed: [0.5, 0.8] },
    icy:          { hue: [190, 220], saturation: [0.3, 0.6], intensity: [0.5, 0.8], speed: [0.1, 0.3] },
    golden:       { hue: [40, 55], saturation: [0.7, 0.9], intensity: [0.6, 0.85] },
    sunset:       { hue: [10, 45], saturation: [0.6, 0.9], intensity: [0.5, 0.8] },
    ocean:        { hue: [180, 220], saturation: [0.5, 0.8], speed: [0.2, 0.4] },
    forest:       { hue: [100, 150], saturation: [0.4, 0.7], intensity: [0.3, 0.6] },
    electric:     { intensity: [0.8, 1.0], saturation: [0.8, 1.0], hue: [220, 280] },
    muted:        { saturation: [0.1, 0.3], intensity: [0.3, 0.5] },
    vivid:        { saturation: [0.8, 1.0], intensity: [0.7, 1.0] },
    purple:       { hue: [270, 310], saturation: [0.6, 0.9] },
    red:          { hue: [350, 370], saturation: [0.7, 1.0] },
    blue:         { hue: [200, 250], saturation: [0.5, 0.8] },
    green:        { hue: [100, 150], saturation: [0.5, 0.8] },
    pink:         { hue: [320, 350], saturation: [0.5, 0.8], intensity: [0.6, 0.9] },

    // Mood / Theme
    psychedelic:  { chaos: [0.5, 0.9], saturation: [0.8, 1.0], speed: [0.4, 0.7], morphFactor: [0.6, 1.0] },
    zen:          { chaos: [0.0, 0.05], speed: [0.05, 0.15], intensity: [0.3, 0.5], saturation: [0.2, 0.4] },
    dreamy:       { chaos: [0.1, 0.3], speed: [0.1, 0.3], intensity: [0.4, 0.6], morphFactor: [0.3, 0.6] },
    nightmare:    { chaos: [0.6, 0.9], intensity: [0.1, 0.3], hue: [280, 340], speed: [0.3, 0.6] },
    ethereal:     { intensity: [0.3, 0.5], saturation: [0.3, 0.6], chaos: [0.1, 0.25], speed: [0.1, 0.25] },
    cosmic:       { dimension: [0.6, 1.0], chaos: [0.3, 0.6], hue: [240, 300], intensity: [0.5, 0.8] },
    organic:      { morphFactor: [0.4, 0.8], chaos: [0.2, 0.4], speed: [0.2, 0.4] },
    mechanical:   { chaos: [0.0, 0.1], gridDensity: [0.6, 0.9], morphFactor: [0.0, 0.2] },
    abstract:     { chaos: [0.3, 0.6], morphFactor: [0.4, 0.8], dimension: [0.3, 0.7] },
    minimal:      { gridDensity: [0.0, 0.2], chaos: [0.0, 0.1], intensity: [0.3, 0.5] },
    complex:      { gridDensity: [0.7, 1.0], chaos: [0.3, 0.6], morphFactor: [0.5, 0.8] },
    retro:        { saturation: [0.4, 0.6], hue: [20, 60], gridDensity: [0.3, 0.5] },
    futuristic:   { saturation: [0.6, 0.9], hue: [180, 260], gridDensity: [0.5, 0.8] },
    alien:        { hue: [100, 160], chaos: [0.4, 0.7], morphFactor: [0.5, 0.9], dimension: [0.5, 0.9] },
    underwater:   { hue: [170, 210], speed: [0.15, 0.35], chaos: [0.15, 0.35] },
    space:        { hue: [230, 280], intensity: [0.3, 0.6], dimension: [0.7, 1.0] },
    hypnotic:     { speed: [0.3, 0.5], morphFactor: [0.5, 0.8], chaos: [0.15, 0.3] },
    glitch:       { chaos: [0.7, 1.0], speed: [0.6, 0.9], gridDensity: [0.5, 0.8] },
    serene:       { speed: [0.05, 0.2], chaos: [0.0, 0.1], intensity: [0.3, 0.5], hue: [160, 220] },

    // Geometry hints
    crystal:      { _geometryBase: 7, gridDensity: [0.4, 0.7], chaos: [0.0, 0.15] },
    fractal:      { _geometryBase: 5, chaos: [0.3, 0.6], gridDensity: [0.5, 0.8] },
    toroidal:     { _geometryBase: 3, morphFactor: [0.3, 0.6] },
    torus:        { _geometryBase: 3 },
    cube:         { _geometryBase: 1 },
    tesseract:    { _geometryBase: 1, dimension: [0.5, 0.8] },
    sphere:       { _geometryBase: 2 },
    wave:         { _geometryBase: 6, speed: [0.3, 0.6] },
    klein:        { _geometryBase: 4, dimension: [0.4, 0.7] },
    simplex:      { _geometryBase: 0 },
    tetrahedron:  { _geometryBase: 0 },

    // Core type hints
    hypersphere:  { _coreType: 1 },
    hypertetra:   { _coreType: 2 },
    base:         { _coreType: 0 },

    // System hints
    quantum:      { _system: 'quantum' },
    faceted:      { _system: 'faceted' },
    holographic:  { _system: 'holographic' },
    hologram:     { _system: 'holographic' }
};

/**
 * Named theme presets for the random generator.
 */
const THEMES = {
    deepSpace: {
        hue: [220, 280], intensity: [0.2, 0.5], saturation: [0.4, 0.7],
        speed: [0.1, 0.3], chaos: [0.1, 0.3], dimension: [0.6, 1.0],
        gridDensity: [0.3, 0.6]
    },
    lavaLamp: {
        hue: [0, 40], intensity: [0.6, 0.9], saturation: [0.7, 1.0],
        speed: [0.15, 0.35], chaos: [0.2, 0.4], morphFactor: [0.5, 0.9]
    },
    arctic: {
        hue: [190, 220], intensity: [0.5, 0.8], saturation: [0.2, 0.5],
        speed: [0.05, 0.2], chaos: [0.0, 0.1], gridDensity: [0.2, 0.4]
    },
    acid: {
        hue: [80, 160], intensity: [0.7, 1.0], saturation: [0.8, 1.0],
        speed: [0.5, 0.9], chaos: [0.5, 0.9], morphFactor: [0.6, 1.0]
    },
    meditation: {
        hue: [240, 280], intensity: [0.2, 0.4], saturation: [0.3, 0.5],
        speed: [0.03, 0.12], chaos: [0.0, 0.05], morphFactor: [0.1, 0.3]
    },
    storm: {
        hue: [200, 260], intensity: [0.3, 0.7], saturation: [0.4, 0.7],
        speed: [0.6, 1.0], chaos: [0.5, 0.8], gridDensity: [0.5, 0.8]
    },
    synthwave: {
        hue: [280, 340], intensity: [0.6, 0.9], saturation: [0.7, 1.0],
        speed: [0.3, 0.5], chaos: [0.1, 0.3], gridDensity: [0.4, 0.7]
    },
    nature: {
        hue: [80, 150], intensity: [0.4, 0.7], saturation: [0.4, 0.7],
        speed: [0.1, 0.3], chaos: [0.1, 0.3], morphFactor: [0.2, 0.5]
    }
};

export class AIPresetGenerator {
    /**
     * @param {Object} engine - VIB3Engine instance (optional, used for reading current state)
     */
    constructor(engine) {
        /** @type {Object|null} */
        this.engine = engine;

        /** @type {string|null} MCP server endpoint URL */
        this.mcpEndpoint = null;

        /** @type {VIB3Preset[]} History of generated presets */
        this.presetHistory = [];

        /** @type {number} Maximum history entries */
        this.maxHistory = 100;
    }

    // -----------------------------------------------------------------------
    //  Text Description -> Preset
    // -----------------------------------------------------------------------

    /**
     * Generate a VIB3 preset from a natural-language text description.
     * Uses the built-in style vocabulary to extract keywords and map them
     * to parameter ranges. No external API required.
     *
     * @param {string} description - e.g. "calm ocean with gentle waves"
     * @returns {Promise<VIB3Preset>}
     */
    async generateFromDescription(description) {
        if (!description || typeof description !== 'string') {
            throw new Error('Description must be a non-empty string.');
        }

        const normalized = description.toLowerCase().trim();
        const tokens = this._tokenize(normalized);
        const matchedStyles = this._matchKeywords(tokens);

        // Build parameter constraints from matched styles
        const constraints = {};
        let geometryBase = null;
        let coreType = null;
        let system = null;

        for (const style of matchedStyles) {
            const mapping = STYLE_VOCABULARY[style];
            if (!mapping) continue;

            // Handle special keys
            if (mapping._geometryBase !== undefined && geometryBase === null) {
                geometryBase = mapping._geometryBase;
            }
            if (mapping._coreType !== undefined && coreType === null) {
                coreType = mapping._coreType;
            }
            if (mapping._system !== undefined && system === null) {
                system = mapping._system;
            }

            // Merge parameter constraints (later matches override earlier)
            for (const [param, range] of Object.entries(mapping)) {
                if (param.startsWith('_')) continue;
                constraints[param] = range;
            }
        }

        // Generate parameter values from constraints
        const preset = this._generateFromConstraints(constraints, geometryBase, coreType);

        preset.name = this._generatePresetName(matchedStyles, description);
        preset.description = `Generated from: "${description}"`;
        if (system) {
            preset.system = system;
        }
        preset.timestamp = Date.now();

        // Store in history
        this._addToHistory(preset);

        return preset;
    }

    /**
     * Get the comprehensive style vocabulary mapping.
     * @returns {Object} Keyword-to-parameter mapping dictionary
     */
    getStyleMapping() {
        return { ...STYLE_VOCABULARY };
    }

    /**
     * Get available theme names for random generation.
     * @returns {string[]}
     */
    getAvailableThemes() {
        return Object.keys(THEMES);
    }

    // -----------------------------------------------------------------------
    //  MCP / LLM Integration
    // -----------------------------------------------------------------------

    /**
     * Set the MCP endpoint for LLM-based generation.
     * @param {string} endpoint - URL of the MCP server
     */
    setMCPEndpoint(endpoint) {
        this.mcpEndpoint = endpoint;
    }

    /**
     * Generate a preset via MCP protocol communicating with an LLM.
     * Sends the current visualization state plus the user prompt,
     * and expects a structured parameter response.
     *
     * @param {string} prompt - User's creative prompt
     * @returns {Promise<VIB3Preset>}
     * @throws {Error} If MCP endpoint is not configured or request fails
     */
    async generateViaMCP(prompt) {
        if (!this.mcpEndpoint) {
            throw new Error('MCP endpoint not configured. Call setMCPEndpoint() first.');
        }

        // Gather current state
        const currentState = this._getCurrentState();

        const requestBody = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
                name: 'generate_preset',
                arguments: {
                    prompt,
                    currentState,
                    parameterRanges: PARAM_RANGES,
                    availableStyles: Object.keys(STYLE_VOCABULARY)
                }
            }
        };

        const response = await fetch(this.mcpEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(`MCP error: ${result.error.message || JSON.stringify(result.error)}`);
        }

        // Parse LLM response into a preset
        const llmOutput = result.result;
        const preset = this._parseLLMResponse(llmOutput);

        preset.name = preset.name || `LLM: ${prompt.substring(0, 30)}`;
        preset.description = `LLM generated from: "${prompt}"`;
        preset.timestamp = Date.now();

        this._addToHistory(preset);

        return preset;
    }

    // -----------------------------------------------------------------------
    //  Random Generation
    // -----------------------------------------------------------------------

    /**
     * Generate a random creative preset with optional theme constraint.
     *
     * @param {string|null} [theme=null] - Theme name (e.g. 'deepSpace', 'lavaLamp')
     *   or null for fully random.
     * @returns {VIB3Preset}
     */
    generateRandom(theme = null) {
        let constraints = {};

        if (theme && THEMES[theme]) {
            constraints = { ...THEMES[theme] };
        }

        // Random geometry
        const geometryBase = Math.floor(Math.random() * 8);
        const coreType = Math.floor(Math.random() * 3);

        const preset = this._generateFromConstraints(constraints, geometryBase, coreType);

        preset.name = theme
            ? `${this._capitalize(theme)} #${Math.floor(Math.random() * 1000)}`
            : `Random #${Math.floor(Math.random() * 10000)}`;
        preset.description = theme ? `Random preset with ${theme} theme` : 'Fully random preset';
        preset.timestamp = Date.now();

        this._addToHistory(preset);

        return preset;
    }

    // -----------------------------------------------------------------------
    //  Mutation & Crossbreeding
    // -----------------------------------------------------------------------

    /**
     * Mutate an existing preset by randomly varying parameters while
     * maintaining overall coherence.
     *
     * @param {VIB3Preset} preset - Source preset
     * @param {number} [intensity=0.3] - Mutation intensity (0 = no change, 1 = fully random)
     * @returns {VIB3Preset} New mutated preset
     */
    mutate(preset, intensity = 0.3) {
        const clamped = Math.max(0, Math.min(1, intensity));
        const result = { ...preset };

        for (const [param, range] of Object.entries(PARAM_RANGES)) {
            if (preset[param] === undefined) continue;

            const currentNorm = (preset[param] - range.min) / (range.max - range.min);

            // Apply gaussian-like mutation
            const mutation = (Math.random() - 0.5) * 2.0 * clamped;
            let newNorm = currentNorm + mutation;
            newNorm = Math.max(0, Math.min(1, newNorm));

            let newValue = range.min + newNorm * (range.max - range.min);

            if (range.type === 'int') {
                newValue = Math.round(newValue);
            }

            result[param] = newValue;
        }

        result.name = `Mutated: ${preset.name || 'Unnamed'} (${Math.round(clamped * 100)}%)`;
        result.description = `Mutated from "${preset.name || 'unnamed'}" at ${Math.round(clamped * 100)}% intensity`;
        result.timestamp = Date.now();

        this._addToHistory(result);

        return result;
    }

    /**
     * Crossbreed two presets by blending their parameters.
     *
     * @param {VIB3Preset} presetA - Parent A
     * @param {VIB3Preset} presetB - Parent B
     * @param {number} [ratio=0.5] - Blend ratio (0 = all A, 1 = all B)
     * @returns {VIB3Preset} Offspring preset
     */
    crossbreed(presetA, presetB, ratio = 0.5) {
        const r = Math.max(0, Math.min(1, ratio));
        const result = {};

        for (const [param, range] of Object.entries(PARAM_RANGES)) {
            const valA = presetA[param] !== undefined ? presetA[param] : this._randomInRange(range);
            const valB = presetB[param] !== undefined ? presetB[param] : this._randomInRange(range);

            // For geometry, pick one parent based on ratio
            if (range.type === 'int') {
                result[param] = Math.random() < r
                    ? Math.round(valB)
                    : Math.round(valA);
            } else {
                // Linear interpolation
                result[param] = valA * (1.0 - r) + valB * r;
            }
        }

        result.name = `Crossbred: ${(presetA.name || 'A').substring(0, 15)} x ${(presetB.name || 'B').substring(0, 15)}`;
        result.description = `Crossbred at ${Math.round(r * 100)}% ratio`;
        result.timestamp = Date.now();

        this._addToHistory(result);

        return result;
    }

    // -----------------------------------------------------------------------
    //  History
    // -----------------------------------------------------------------------

    /**
     * Export the full preset generation history.
     * @returns {VIB3Preset[]}
     */
    exportHistory() {
        return [...this.presetHistory];
    }

    /**
     * Clear the preset history.
     */
    clearHistory() {
        this.presetHistory = [];
    }

    /**
     * Get the most recently generated preset.
     * @returns {VIB3Preset|null}
     */
    getLastPreset() {
        return this.presetHistory.length > 0
            ? this.presetHistory[this.presetHistory.length - 1]
            : null;
    }

    // -----------------------------------------------------------------------
    //  Internal Helpers
    // -----------------------------------------------------------------------

    /**
     * Tokenize a description string into individual keywords.
     * @param {string} text - Lowercased description
     * @returns {string[]}
     * @private
     */
    _tokenize(text) {
        // Remove punctuation and split on whitespace
        return text
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 1);
    }

    /**
     * Match tokens against the style vocabulary.
     * Also attempts partial/fuzzy matching for common suffixes.
     *
     * @param {string[]} tokens
     * @returns {string[]} Matched style keywords
     * @private
     */
    _matchKeywords(tokens) {
        const matched = [];
        const vocabKeys = Object.keys(STYLE_VOCABULARY);

        for (const token of tokens) {
            // Direct match
            if (STYLE_VOCABULARY[token]) {
                matched.push(token);
                continue;
            }

            // Try common variations
            const variations = [
                token,
                token.replace(/s$/, ''),           // plurals
                token.replace(/ing$/, ''),          // gerunds
                token.replace(/ed$/, ''),            // past tense
                token.replace(/ly$/, ''),            // adverbs -> adjectives
                token.replace(/ish$/, ''),           // bluish -> blue
                token.replace(/ness$/, ''),          // darkness -> dark
                token.replace(/y$/, ''),             // wavy -> wav
                token + 'al',                        // cosmic -> cosmical
            ];

            for (const variant of variations) {
                if (STYLE_VOCABULARY[variant]) {
                    matched.push(variant);
                    break;
                }
            }

            // Substring match (e.g. "psychedelia" matches "psychedelic")
            if (!matched.includes(token)) {
                for (const key of vocabKeys) {
                    if (key.startsWith(token) || token.startsWith(key)) {
                        if (!matched.includes(key)) {
                            matched.push(key);
                        }
                        break;
                    }
                }
            }
        }

        return matched;
    }

    /**
     * Generate a preset from parameter constraints.
     * Constraints are expressed as [low, high] normalized fractions of the
     * parameter range.
     *
     * @param {Object} constraints - Param name -> [low, high] (0-1 fractions)
     * @param {number|null} geometryBase - Forced base geometry (0-7) or null
     * @param {number|null} coreType - Forced core type (0-2) or null
     * @returns {VIB3Preset}
     * @private
     */
    _generateFromConstraints(constraints, geometryBase, coreType) {
        const preset = {};

        for (const [param, range] of Object.entries(PARAM_RANGES)) {
            if (param === 'geometry') continue; // Handle separately

            if (constraints[param]) {
                const [lo, hi] = constraints[param];
                const norm = lo + Math.random() * (hi - lo);
                preset[param] = range.min + norm * (range.max - range.min);
            } else {
                preset[param] = this._randomInRange(range);
            }

            if (range.type === 'int') {
                preset[param] = Math.round(preset[param]);
            }
        }

        // Geometry index = coreType * 8 + baseGeometry
        const base = geometryBase !== null ? geometryBase : Math.floor(Math.random() * 8);
        const core = coreType !== null ? coreType : Math.floor(Math.random() * 3);
        preset.geometry = core * 8 + base;

        // Handle hue wrapping (values like [350, 370] should wrap around 360)
        if (preset.hue > 360) {
            preset.hue = preset.hue - 360;
        }

        return preset;
    }

    /**
     * Generate a random value within a parameter range.
     * @param {{min: number, max: number, type: string}} range
     * @returns {number}
     * @private
     */
    _randomInRange(range) {
        const val = range.min + Math.random() * (range.max - range.min);
        return range.type === 'int' ? Math.round(val) : val;
    }

    /**
     * Generate a human-readable name from matched styles.
     * @param {string[]} styles
     * @param {string} description
     * @returns {string}
     * @private
     */
    _generatePresetName(styles, description) {
        if (styles.length === 0) {
            // Take first few words of description
            const words = description.split(/\s+/).slice(0, 3);
            return words.map(w => this._capitalize(w)).join(' ');
        }

        // Combine up to 3 matched styles into a name
        const nameStyles = styles.slice(0, 3);
        return nameStyles.map(s => this._capitalize(s)).join(' ');
    }

    /**
     * Capitalize first letter of a string.
     * @param {string} str
     * @returns {string}
     * @private
     */
    _capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get the current engine state (if engine is available).
     * @returns {Object}
     * @private
     */
    _getCurrentState() {
        if (!this.engine || typeof this.engine.getParameter !== 'function') {
            return {};
        }

        const state = {};
        for (const param of Object.keys(PARAM_RANGES)) {
            try {
                state[param] = this.engine.getParameter(param);
            } catch (_e) {
                // Parameter may not exist
            }
        }

        return state;
    }

    /**
     * Parse an LLM response into a VIB3Preset. The LLM is expected to return
     * either a JSON object with parameter keys or a content array with text.
     *
     * @param {Object} llmOutput
     * @returns {VIB3Preset}
     * @private
     */
    _parseLLMResponse(llmOutput) {
        const preset = {};

        // Try direct parameter extraction
        let paramSource = llmOutput;

        // Handle MCP content array format
        if (llmOutput && llmOutput.content && Array.isArray(llmOutput.content)) {
            for (const block of llmOutput.content) {
                if (block.type === 'text') {
                    try {
                        // Try to parse JSON from text
                        const jsonMatch = block.text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            paramSource = JSON.parse(jsonMatch[0]);
                        }
                    } catch (_e) {
                        // Not valid JSON, try keyword extraction
                        return this._generateFromConstraints(
                            this._extractConstraintsFromText(block.text),
                            null,
                            null
                        );
                    }
                }
            }
        }

        // Map known parameters from the source
        for (const [param, range] of Object.entries(PARAM_RANGES)) {
            if (paramSource[param] !== undefined) {
                let val = parseFloat(paramSource[param]);
                if (!isNaN(val)) {
                    val = Math.max(range.min, Math.min(range.max, val));
                    preset[param] = range.type === 'int' ? Math.round(val) : val;
                }
            }
        }

        // Fill any missing parameters with defaults
        for (const [param, range] of Object.entries(PARAM_RANGES)) {
            if (preset[param] === undefined) {
                preset[param] = this._randomInRange(range);
            }
        }

        if (paramSource.name) preset.name = String(paramSource.name);
        if (paramSource.system) preset.system = String(paramSource.system);

        return preset;
    }

    /**
     * Extract parameter constraints from unstructured text (fallback).
     * @param {string} text
     * @returns {Object}
     * @private
     */
    _extractConstraintsFromText(text) {
        const tokens = this._tokenize(text.toLowerCase());
        const matched = this._matchKeywords(tokens);
        const constraints = {};

        for (const style of matched) {
            const mapping = STYLE_VOCABULARY[style];
            if (!mapping) continue;
            for (const [param, range] of Object.entries(mapping)) {
                if (!param.startsWith('_')) {
                    constraints[param] = range;
                }
            }
        }

        return constraints;
    }

    /**
     * Add a preset to history, trimming if needed.
     * @param {VIB3Preset} preset
     * @private
     */
    _addToHistory(preset) {
        this.presetHistory.push(preset);
        if (this.presetHistory.length > this.maxHistory) {
            this.presetHistory = this.presetHistory.slice(-this.maxHistory);
        }
    }
}
