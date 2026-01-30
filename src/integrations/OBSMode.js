/**
 * VIB3+ OBS Transparent Background Mode
 *
 * Configures the VIB3+ engine for optimal capture in OBS Studio, either as
 * a Browser Source with transparent background or as a Window Capture target.
 *
 * OBS Browser Sources support alpha transparency via CSS `background: transparent`
 * and WebGL premultiplied alpha. This module sets up all canvases and the engine
 * for seamless overlay compositing in OBS.
 *
 * Usage:
 *   import { Vib3OBSMode } from './integrations/OBSMode.js';
 *   const obsMode = new Vib3OBSMode(engine);
 *   obsMode.enable();
 *
 *   // Generate OBS browser source URL with parameters:
 *   const url = Vib3OBSMode.generateBrowserSourceURL({
 *       system: 'quantum', geometry: 12, hue: 270
 *   });
 *
 * @module Vib3OBSMode
 * @version 1.0.0
 * @license All Rights Reserved - Clear Seas Solutions LLC
 */

/**
 * Default OBS configuration recommendations.
 * @constant {Object}
 */
const DEFAULT_OBS_CONFIG = {
    /** Browser source width in pixels */
    width: 1920,
    /** Browser source height in pixels */
    height: 1080,
    /** Frames per second */
    fps: 60,
    /** Custom CSS to inject into the browser source */
    css: 'body { background: transparent !important; overflow: hidden; margin: 0; padding: 0; }',
    /** Whether to shut down the source when not visible */
    shutdownWhenHidden: false,
    /** Whether to refresh the browser when the scene becomes active */
    refreshOnActivate: false,
    /** Hardware acceleration */
    hardwareAcceleration: true
};

/**
 * Canvas IDs used by the holographic 5-layer system.
 * @constant {string[]}
 */
const HOLOGRAPHIC_CANVAS_IDS = [
    'background-canvas',
    'shadow-canvas',
    'content-canvas',
    'highlight-canvas',
    'accent-canvas'
];

/**
 * Valid capture modes for OBS.
 * @constant {string[]}
 */
const CAPTURE_MODES = ['browser-source', 'window-capture'];

/**
 * Valid VIB3 parameter names accepted in URL query strings.
 * @constant {string[]}
 */
const URL_PARAM_NAMES = [
    'system', 'geometry', 'hue', 'saturation', 'intensity', 'speed',
    'gridDensity', 'morphFactor', 'chaos', 'dimension',
    'rot4dXY', 'rot4dXZ', 'rot4dYZ', 'rot4dXW', 'rot4dYW', 'rot4dZW'
];

/**
 * OBS integration mode for VIB3+ visualization engine.
 *
 * Provides methods to configure the engine for OBS capture, manage
 * transparent backgrounds, hide UI elements, and generate browser
 * source URLs with embedded parameters.
 *
 * @class
 */
export class Vib3OBSMode {
    /**
     * Create an OBS mode controller for a VIB3Engine instance.
     *
     * @param {import('../core/VIB3Engine.js').VIB3Engine} engine - The VIB3 engine instance
     * @param {object} [options={}] - OBS mode options
     * @param {string} [options.captureMode='browser-source'] - Capture mode: 'browser-source' | 'window-capture'
     * @param {boolean} [options.hideUI=true] - Whether to hide UI elements when enabled
     * @param {boolean} [options.autoResize=true] - Automatically resize canvases to fill viewport
     */
    constructor(engine, options = {}) {
        /**
         * The VIB3Engine instance being controlled.
         * @type {import('../core/VIB3Engine.js').VIB3Engine}
         */
        this.engine = engine;

        /**
         * Whether transparent background mode is currently active.
         * @type {boolean}
         */
        this.transparentMode = false;

        /**
         * OBS capture mode.
         * @type {string}
         */
        this.captureMode = options.captureMode || 'browser-source';
        if (!CAPTURE_MODES.includes(this.captureMode)) {
            console.warn(`[Vib3OBSMode] Unknown capture mode "${this.captureMode}", defaulting to "browser-source"`);
            this.captureMode = 'browser-source';
        }

        /**
         * Whether to hide UI elements when OBS mode is enabled.
         * @type {boolean}
         */
        this.hideUI = options.hideUI !== false;

        /**
         * Whether to automatically resize canvases to fill the viewport.
         * @type {boolean}
         */
        this.autoResize = options.autoResize !== false;

        /**
         * List of UI element selectors to hide/show.
         * @type {string[]}
         * @private
         */
        this._uiSelectors = [
            '#controls-panel', '#control-panel', '.controls',
            '#gallery-modal', '.gallery-modal',
            '#toolbar', '.toolbar',
            '#debug-panel', '.debug-panel',
            '#mobile-debug', '.mobile-debug',
            'header', 'footer', 'nav',
            '.vib3-ui', '#vib3-ui'
        ];

        /**
         * Stored original styles for restoration on disable.
         * @type {Map<Element, object>}
         * @private
         */
        this._originalStyles = new Map();

        /**
         * Resize observer for auto-resize mode.
         * @type {ResizeObserver|null}
         * @private
         */
        this._resizeObserver = null;

        /**
         * Bound resize handler reference for cleanup.
         * @type {Function|null}
         * @private
         */
        this._resizeHandler = null;
    }

    /**
     * Enable OBS capture mode.
     *
     * This method:
     * - Sets transparent background on the document body
     * - Configures all VIB3 canvases for premultiplied alpha
     * - Hides all UI elements (if hideUI is true)
     * - Sets up auto-resize to fill the browser viewport
     * - Disables unnecessary visual effects (scrollbars, selection, etc.)
     * - Applies capture-mode-specific optimizations
     *
     * @returns {boolean} Whether OBS mode was successfully enabled
     */
    enable() {
        if (this.transparentMode) {
            console.warn('[Vib3OBSMode] Already enabled');
            return true;
        }

        try {
            // Store and modify body styles
            this._storeAndApplyBodyStyles();

            // Configure canvases for transparency
            this._configureCanvases();

            // Hide UI elements
            if (this.hideUI) {
                this._hideUIElements();
            }

            // Set up auto-resize
            if (this.autoResize) {
                this._setupAutoResize();
            }

            // Apply capture-mode-specific settings
            if (this.captureMode === 'browser-source') {
                this._configureBrowserSource();
            } else {
                this._configureWindowCapture();
            }

            this.transparentMode = true;
            console.log(`[Vib3OBSMode] Enabled (mode: ${this.captureMode})`);
            return true;
        } catch (err) {
            console.error('[Vib3OBSMode] Failed to enable:', err);
            return false;
        }
    }

    /**
     * Disable OBS capture mode and restore original state.
     *
     * Restores all modified styles, shows hidden UI elements,
     * removes resize observers, and resets canvas configurations.
     *
     * @returns {boolean} Whether OBS mode was successfully disabled
     */
    disable() {
        if (!this.transparentMode) {
            console.warn('[Vib3OBSMode] Already disabled');
            return true;
        }

        try {
            // Restore body styles
            this._restoreBodyStyles();

            // Show hidden UI elements
            this._showUIElements();

            // Remove auto-resize
            this._teardownAutoResize();

            // Restore original styles from stored map
            for (const [element, styles] of this._originalStyles) {
                if (element && element.parentNode) {
                    Object.assign(element.style, styles);
                }
            }
            this._originalStyles.clear();

            this.transparentMode = false;
            console.log('[Vib3OBSMode] Disabled');
            return true;
        } catch (err) {
            console.error('[Vib3OBSMode] Failed to disable:', err);
            return false;
        }
    }

    /**
     * Returns recommended OBS settings for capturing VIB3+ visualizations.
     *
     * The returned object includes settings for both Browser Source and
     * Window Capture modes, along with scene composition tips.
     *
     * @returns {object} OBS configuration recommendations
     */
    getOBSConfig() {
        const baseConfig = { ...DEFAULT_OBS_CONFIG };

        return {
            browserSource: {
                ...baseConfig,
                url: Vib3OBSMode.generateBrowserSourceURL(
                    this.engine ? {
                        system: this.engine.getCurrentSystem(),
                        ...this.engine.getAllParameters()
                    } : {}
                ),
                description: 'Add as Browser Source in OBS for transparent overlay',
                setup: [
                    '1. Add a new Browser Source in OBS',
                    '2. Set the URL to the generated browser source URL',
                    `3. Set width to ${baseConfig.width} and height to ${baseConfig.height}`,
                    `4. Set FPS to ${baseConfig.fps}`,
                    '5. Add Custom CSS: ' + baseConfig.css,
                    '6. Enable "Shutdown source when not visible" for performance',
                    '7. Ensure "Hardware acceleration" is checked'
                ]
            },
            windowCapture: {
                description: 'Capture the browser window running VIB3+',
                setup: [
                    '1. Open VIB3+ in a dedicated browser window',
                    '2. Enable OBS mode in the VIB3+ UI or via URL parameter (?obs=1)',
                    '3. Add a Window Capture source in OBS',
                    '4. Select the VIB3+ browser window',
                    '5. Use a Color Key or Chroma Key filter to remove the background',
                    '6. Alternatively, use "Window Capture (Xcomposite)" on Linux for alpha support'
                ],
                chromaKeySettings: {
                    keyColorType: 'Custom',
                    keyColor: '#000000',
                    similarity: 40,
                    smoothness: 80,
                    keyColorSpillReduction: 100
                }
            },
            performanceTips: [
                'Use 1080p resolution for best performance/quality balance',
                'Reduce gridDensity below 30 for complex geometries',
                'Disable audio reactivity if not needed (saves CPU)',
                'Use "faceted" system for lowest GPU usage',
                'Use "quantum" system for most visual impact',
                'Close developer tools and other browser tabs',
                'Ensure hardware acceleration is enabled in the browser'
            ],
            sceneComposition: [
                'Place VIB3+ source above your camera/game capture',
                'Use "Screen" or "Add" blending mode for glowing effects',
                'Use low intensity (0.3-0.5) for subtle overlays',
                'Use high intensity (0.8-1.0) for full-screen backgrounds',
                'Combine with OBS Move Transition for animated scene switches'
            ]
        };
    }

    /**
     * Check if OBS mode is currently enabled.
     * @returns {boolean}
     */
    isEnabled() {
        return this.transparentMode;
    }

    /**
     * Get the current capture mode.
     * @returns {string} 'browser-source' or 'window-capture'
     */
    getCaptureMode() {
        return this.captureMode;
    }

    /**
     * Switch capture mode while OBS mode is active.
     * @param {string} mode - 'browser-source' or 'window-capture'
     */
    setCaptureMode(mode) {
        if (!CAPTURE_MODES.includes(mode)) {
            console.warn(`[Vib3OBSMode] Unknown capture mode: ${mode}`);
            return;
        }
        const wasEnabled = this.transparentMode;
        if (wasEnabled) this.disable();
        this.captureMode = mode;
        if (wasEnabled) this.enable();
    }

    // ========================================================================
    // Static Methods
    // ========================================================================

    /**
     * Generate a URL with query parameters for OBS Browser Source.
     *
     * The URL includes all specified VIB3 parameters as query string values,
     * plus the `obs=1` flag to auto-enable OBS mode on load.
     *
     * @param {object} [params={}] - VIB3 parameter overrides
     * @param {string} [params.system] - Visualization system
     * @param {number} [params.geometry] - Geometry index (0-23)
     * @param {number} [params.hue] - Color hue (0-360)
     * @param {number} [params.saturation] - Saturation (0-1)
     * @param {number} [params.intensity] - Intensity (0-1)
     * @param {number} [params.speed] - Animation speed (0.1-3)
     * @param {number} [params.gridDensity] - Pattern density (4-100)
     * @param {number} [params.morphFactor] - Morph factor (0-2)
     * @param {number} [params.chaos] - Chaos level (0-1)
     * @param {number} [params.dimension] - Projection distance (3.0-4.5)
     * @param {number} [params.rot4dXY] - XY rotation (radians)
     * @param {number} [params.rot4dXZ] - XZ rotation (radians)
     * @param {number} [params.rot4dYZ] - YZ rotation (radians)
     * @param {number} [params.rot4dXW] - XW rotation (radians)
     * @param {number} [params.rot4dYW] - YW rotation (radians)
     * @param {number} [params.rot4dZW] - ZW rotation (radians)
     * @param {string} [baseURL] - Base URL (defaults to current page or a placeholder)
     * @returns {string} Complete URL with query parameters
     * @example
     * const url = Vib3OBSMode.generateBrowserSourceURL({
     *     system: 'quantum',
     *     geometry: 12,
     *     hue: 270,
     *     intensity: 0.8
     * });
     * // => "https://your-site.com/vib3/?obs=1&system=quantum&geometry=12&hue=270&intensity=0.8"
     */
    static generateBrowserSourceURL(params = {}, baseURL) {
        // Determine base URL
        let base;
        if (baseURL) {
            base = baseURL;
        } else if (typeof window !== 'undefined' && window.location) {
            base = window.location.origin + window.location.pathname;
        } else {
            base = 'https://your-vib3-deployment.com/';
        }

        // Build query string
        const queryParts = ['obs=1'];

        for (const key of URL_PARAM_NAMES) {
            if (key in params && params[key] !== undefined && params[key] !== null) {
                const value = params[key];
                // Sanitize: only allow alphanumeric, dots, hyphens, and underscores
                const sanitized = String(value).replace(/[^a-zA-Z0-9.\-_]/g, '');
                if (sanitized.length > 0 && sanitized.length <= 50) {
                    queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(sanitized)}`);
                }
            }
        }

        // Ensure base URL ends cleanly
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
        return `${cleanBase}?${queryParts.join('&')}`;
    }

    /**
     * Parse VIB3 parameters from a URL query string.
     *
     * Useful for initializing the engine from an OBS browser source URL.
     *
     * @param {string} [queryString] - URL query string (defaults to window.location.search)
     * @returns {{ obs: boolean, params: object }} Parsed OBS flag and VIB3 parameters
     * @example
     * const { obs, params } = Vib3OBSMode.parseURLParams();
     * if (obs) {
     *     obsMode.enable();
     *     engine.setParameters(params);
     * }
     */
    static parseURLParams(queryString) {
        const search = queryString || (typeof window !== 'undefined' ? window.location.search : '');
        const urlParams = new URLSearchParams(search);

        const obs = urlParams.get('obs') === '1';
        const params = {};

        for (const key of URL_PARAM_NAMES) {
            const raw = urlParams.get(key);
            if (raw !== null) {
                if (key === 'system') {
                    // String parameter - validate against allowed systems
                    const sanitized = raw.replace(/[^a-zA-Z]/g, '').toLowerCase();
                    if (['quantum', 'faceted', 'holographic'].includes(sanitized)) {
                        params.system = sanitized;
                    }
                } else {
                    // Numeric parameter - parse and validate
                    const value = parseFloat(raw);
                    if (Number.isFinite(value)) {
                        params[key] = value;
                    }
                }
            }
        }

        return { obs, params };
    }

    /**
     * Returns the list of valid URL parameter names.
     * @returns {string[]}
     */
    static getURLParamNames() {
        return [...URL_PARAM_NAMES];
    }

    /**
     * Returns the list of valid capture modes.
     * @returns {string[]}
     */
    static getCaptureModes() {
        return [...CAPTURE_MODES];
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    /**
     * Store original body styles and apply OBS transparent styles.
     * @private
     */
    _storeAndApplyBodyStyles() {
        if (typeof document === 'undefined') return;

        const body = document.body;
        const html = document.documentElement;

        // Store originals
        this._originalBodyStyles = {
            background: body.style.background,
            backgroundColor: body.style.backgroundColor,
            overflow: body.style.overflow,
            margin: body.style.margin,
            padding: body.style.padding,
            userSelect: body.style.userSelect,
            cursor: body.style.cursor
        };
        this._originalHtmlStyles = {
            background: html.style.background,
            backgroundColor: html.style.backgroundColor,
            overflow: html.style.overflow
        };

        // Apply transparent styles
        body.style.background = 'transparent';
        body.style.backgroundColor = 'transparent';
        body.style.overflow = 'hidden';
        body.style.margin = '0';
        body.style.padding = '0';
        body.style.userSelect = 'none';
        body.style.cursor = 'none';

        html.style.background = 'transparent';
        html.style.backgroundColor = 'transparent';
        html.style.overflow = 'hidden';
    }

    /**
     * Restore original body styles.
     * @private
     */
    _restoreBodyStyles() {
        if (typeof document === 'undefined') return;

        const body = document.body;
        const html = document.documentElement;

        if (this._originalBodyStyles) {
            Object.assign(body.style, this._originalBodyStyles);
            this._originalBodyStyles = null;
        }
        if (this._originalHtmlStyles) {
            Object.assign(html.style, this._originalHtmlStyles);
            this._originalHtmlStyles = null;
        }
    }

    /**
     * Configure all VIB3 canvases for transparent rendering.
     * @private
     */
    _configureCanvases() {
        if (typeof document === 'undefined') return;

        // Find all VIB3 canvases
        const canvasIds = [...HOLOGRAPHIC_CANVAS_IDS];
        const allCanvases = document.querySelectorAll('canvas');

        allCanvases.forEach(canvas => {
            // Store original styles
            this._originalStyles.set(canvas, {
                background: canvas.style.background,
                backgroundColor: canvas.style.backgroundColor
            });

            // Set transparent background
            canvas.style.background = 'transparent';
            canvas.style.backgroundColor = 'transparent';
        });

        // Also handle the main container
        const container = document.getElementById('vib3-container');
        if (container) {
            this._originalStyles.set(container, {
                background: container.style.background,
                backgroundColor: container.style.backgroundColor
            });
            container.style.background = 'transparent';
            container.style.backgroundColor = 'transparent';
        }
    }

    /**
     * Hide all UI elements.
     * @private
     */
    _hideUIElements() {
        if (typeof document === 'undefined') return;

        for (const selector of this._uiSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (!this._originalStyles.has(el)) {
                        this._originalStyles.set(el, {
                            display: el.style.display,
                            visibility: el.style.visibility,
                            opacity: el.style.opacity
                        });
                    }
                    el.style.display = 'none';
                });
            } catch (e) {
                // Selector might be invalid; skip silently
            }
        }
    }

    /**
     * Show all previously hidden UI elements.
     * @private
     */
    _showUIElements() {
        if (typeof document === 'undefined') return;

        for (const selector of this._uiSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    const original = this._originalStyles.get(el);
                    if (original) {
                        el.style.display = original.display || '';
                        el.style.visibility = original.visibility || '';
                        el.style.opacity = original.opacity || '';
                    }
                });
            } catch (e) {
                // Skip invalid selectors
            }
        }
    }

    /**
     * Set up automatic canvas resizing to fill the viewport.
     * @private
     */
    _setupAutoResize() {
        if (typeof window === 'undefined') return;

        this._resizeHandler = () => {
            const container = document.getElementById('vib3-container');
            if (container) {
                container.style.width = '100vw';
                container.style.height = '100vh';
                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
            }
        };

        window.addEventListener('resize', this._resizeHandler);
        this._resizeHandler(); // Apply immediately
    }

    /**
     * Remove auto-resize handlers.
     * @private
     */
    _teardownAutoResize() {
        if (typeof window === 'undefined') return;

        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }

        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    }

    /**
     * Apply Browser Source-specific optimizations.
     * @private
     */
    _configureBrowserSource() {
        if (typeof document === 'undefined') return;

        // Prevent right-click context menu (distracting in OBS)
        this._contextMenuHandler = (e) => e.preventDefault();
        document.addEventListener('contextmenu', this._contextMenuHandler);

        // Prevent text selection highlighting
        document.body.style.webkitUserSelect = 'none';
        document.body.style.userSelect = 'none';

        // Disable scrolling
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        // Add a meta tag to hint to the browser source that this supports transparency
        const existingMeta = document.querySelector('meta[name="vib3-obs-mode"]');
        if (!existingMeta) {
            const meta = document.createElement('meta');
            meta.name = 'vib3-obs-mode';
            meta.content = 'transparent';
            document.head.appendChild(meta);
            this._obsMeta = meta;
        }
    }

    /**
     * Apply Window Capture-specific optimizations.
     * @private
     */
    _configureWindowCapture() {
        if (typeof document === 'undefined') return;

        // For window capture, we use a solid black background
        // that can be chroma-keyed in OBS
        document.body.style.background = '#000000';
        document.body.style.backgroundColor = '#000000';
        document.documentElement.style.background = '#000000';

        // Set window title for easy identification in OBS
        if (typeof document !== 'undefined') {
            this._originalTitle = document.title;
            document.title = 'VIB3+ [OBS Capture]';
        }
    }

    /**
     * Clean up and destroy the OBS mode instance.
     * Call this when the engine is being destroyed.
     */
    destroy() {
        if (this.transparentMode) {
            this.disable();
        }

        // Remove context menu handler
        if (this._contextMenuHandler && typeof document !== 'undefined') {
            document.removeEventListener('contextmenu', this._contextMenuHandler);
            this._contextMenuHandler = null;
        }

        // Remove OBS meta tag
        if (this._obsMeta && this._obsMeta.parentNode) {
            this._obsMeta.parentNode.removeChild(this._obsMeta);
            this._obsMeta = null;
        }

        // Restore window title
        if (this._originalTitle && typeof document !== 'undefined') {
            document.title = this._originalTitle;
            this._originalTitle = null;
        }

        this._originalStyles.clear();
        this.engine = null;
    }
}
