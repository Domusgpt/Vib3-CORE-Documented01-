/**
 * VIB3+ URL State Manager
 * Reads/writes visualization parameters to URL query string for shareable links.
 *
 * Usage: Include this script in any demo page.
 * On load, applies URL params. On change, updates URL without reload.
 *
 * Supported params: system, geometry, hue, saturation, intensity, speed,
 *   chaos, morphFactor, gridDensity, dimension, rot4dXY..ZW
 */
(function () {
    'use strict';

    const PARAM_KEYS = [
        'system', 'geometry', 'hue', 'saturation', 'intensity', 'speed',
        'chaos', 'morphFactor', 'gridDensity', 'dimension',
        'rot4dXY', 'rot4dXZ', 'rot4dYZ', 'rot4dXW', 'rot4dYW', 'rot4dZW'
    ];

    const NUMERIC_PARAMS = PARAM_KEYS.filter(k => k !== 'system');

    /**
     * Read URL params and return as object.
     */
    function readURLState() {
        const params = new URLSearchParams(window.location.search);
        const state = {};
        for (const key of PARAM_KEYS) {
            if (params.has(key)) {
                const raw = params.get(key);
                if (key === 'system') {
                    if (['quantum', 'faceted', 'holographic'].includes(raw)) {
                        state.system = raw;
                    }
                } else {
                    const num = parseFloat(raw);
                    if (Number.isFinite(num)) {
                        state[key] = num;
                    }
                }
            }
        }
        return state;
    }

    /**
     * Write current state to URL without page reload.
     */
    function writeURLState(state) {
        const params = new URLSearchParams();
        for (const key of PARAM_KEYS) {
            if (state[key] !== undefined && state[key] !== null) {
                params.set(key, String(state[key]));
            }
        }
        const qs = params.toString();
        const newURL = qs
            ? `${window.location.pathname}?${qs}`
            : window.location.pathname;
        window.history.replaceState(null, '', newURL);
    }

    /**
     * Apply URL state to engine if available.
     */
    function applyURLState() {
        const state = readURLState();
        if (Object.keys(state).length === 0) return;

        // Try to find the engine on window
        const engine = window.vib3Engine || window.engine;
        if (!engine) {
            // Retry after engine might be initialized
            setTimeout(applyURLState, 500);
            return;
        }

        // Switch system first if specified
        if (state.system && typeof engine.switchSystem === 'function') {
            engine.switchSystem(state.system);
        }

        // Apply numeric parameters
        for (const key of NUMERIC_PARAMS) {
            if (state[key] !== undefined && typeof engine.setParameter === 'function') {
                engine.setParameter(key, state[key]);
            }
        }

        console.log('[VIB3 URL State] Applied:', state);
    }

    // Export for use by other scripts
    window.vib3URLState = { read: readURLState, write: writeURLState, apply: applyURLState };

    // Auto-apply on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyURLState);
    } else {
        applyURLState();
    }
})();
