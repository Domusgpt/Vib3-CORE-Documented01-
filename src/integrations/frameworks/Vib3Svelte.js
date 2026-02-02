/**
 * VIB3+ Svelte Component Wrapper
 *
 * Generates Svelte component source code and writable store definitions
 * for embedding VIB3+ 4D visualizations in Svelte applications.
 *
 * Usage (generated component):
 *   <Vib3Visualizer system="quantum" hue={200} saturation={0.8} />
 *
 * Usage (generated store):
 *   import { vib3Store } from '@vib3/svelte';
 *   $vib3Store.setParameter('hue', 270);
 *
 * NOTE: This module generates Svelte source code strings and package structures.
 * The output is intended for use in a Svelte or SvelteKit project.
 *
 * @module Vib3SvelteWrapper
 * @version 1.0.0
 * @license All Rights Reserved - Clear Seas Solutions LLC
 */

/**
 * VIB3+ parameter definitions for Svelte prop declarations.
 * @constant {Object}
 */
const VIB3_SVELTE_PROPS = {
    system: { type: 'string', default: "'quantum'" },
    geometry: { type: 'number', default: 0 },
    hue: { type: 'number', default: 200 },
    saturation: { type: 'number', default: 0.8 },
    intensity: { type: 'number', default: 0.5 },
    speed: { type: 'number', default: 1.0 },
    gridDensity: { type: 'number', default: 15 },
    morphFactor: { type: 'number', default: 1.0 },
    chaos: { type: 'number', default: 0.2 },
    dimension: { type: 'number', default: 3.5 },
    rot4dXY: { type: 'number', default: 0 },
    rot4dXZ: { type: 'number', default: 0 },
    rot4dYZ: { type: 'number', default: 0 },
    rot4dXW: { type: 'number', default: 0 },
    rot4dYW: { type: 'number', default: 0 },
    rot4dZW: { type: 'number', default: 0 }
};

/**
 * Numeric parameter names for batch updates.
 * @constant {string[]}
 */
const NUMERIC_PROP_NAMES = Object.keys(VIB3_SVELTE_PROPS).filter(
    k => VIB3_SVELTE_PROPS[k].type === 'number'
);

/**
 * Svelte wrapper for VIB3+ visualization engine.
 *
 * Provides static methods that generate Svelte component source code,
 * store definitions, and full NPM package structures for the @vib3/svelte package.
 *
 * @class
 */
export class Vib3SvelteWrapper {
    /**
     * Returns a Svelte component source code string (.svelte format).
     *
     * The generated component:
     * - Declares all VIB3 parameters as exported props
     * - Uses $: reactive declarations to sync props to the engine
     * - Initializes VIB3Engine in onMount
     * - Destroys the engine in onDestroy
     * - Dispatches 'ready' and 'error' events
     * - Exposes engine methods via bind:this
     *
     * @returns {string} Complete Svelte component source code
     * @example
     * const componentCode = Vib3SvelteWrapper.getComponent();
     * // Write to src/lib/Vib3Visualizer.svelte
     */
    static getComponent() {
        return `<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';

    /**
     * VIB3+ Visualizer Svelte Component
     *
     * Renders a VIB3+ 4D visualization. Accepts all VIB3 parameters as props.
     *
     * @fires ready - When the engine is initialized. Detail: VIB3Engine instance.
     * @fires error - On initialization failure. Detail: Error object.
     *
     * @example
     * <Vib3Visualizer system="quantum" hue={200} saturation={0.8} on:ready={handleReady} />
     */

    const dispatch = createEventDispatcher();

    // ---- Props ----
    /** @type {string} Active visualization system */
    export let system = 'quantum';
    /** @type {number} Geometry variant (0-23) */
    export let geometry = 0;
    /** @type {number} Color hue (0-360) */
    export let hue = 200;
    /** @type {number} Color saturation (0-1) */
    export let saturation = 0.8;
    /** @type {number} Visual intensity (0-1) */
    export let intensity = 0.5;
    /** @type {number} Animation speed (0.1-3) */
    export let speed = 1.0;
    /** @type {number} Pattern density (4-100) */
    export let gridDensity = 15;
    /** @type {number} Shape interpolation (0-2) */
    export let morphFactor = 1.0;
    /** @type {number} Randomness level (0-1) */
    export let chaos = 0.2;
    /** @type {number} 4D projection distance (3.0-4.5) */
    export let dimension = 3.5;
    /** @type {number} XY plane rotation (radians) */
    export let rot4dXY = 0;
    /** @type {number} XZ plane rotation (radians) */
    export let rot4dXZ = 0;
    /** @type {number} YZ plane rotation (radians) */
    export let rot4dYZ = 0;
    /** @type {number} XW hyperplane rotation (radians) */
    export let rot4dXW = 0;
    /** @type {number} YW hyperplane rotation (radians) */
    export let rot4dYW = 0;
    /** @type {number} ZW hyperplane rotation (radians) */
    export let rot4dZW = 0;
    /** @type {string} Container CSS width */
    export let width = '100%';
    /** @type {string} Container CSS height */
    export let height = '400px';
    /** @type {string} Additional CSS classes */
    export let className = '';
    /** @type {boolean} Prefer WebGPU backend */
    export let preferWebGPU = false;
    /** @type {boolean} Enable debug logging */
    export let debug = false;

    // ---- Internal State ----
    let containerEl;
    let engine = null;
    let initialized = false;
    const containerId = 'vib3-svelte-' + Math.random().toString(36).substring(2, 11);

    // ---- Lifecycle ----
    onMount(async () => {
        try {
            // Dynamic import so the Svelte component works in SSR
            const { VIB3Engine } = await import('@vib3/core');

            engine = new VIB3Engine({ preferWebGPU, debug });
            const success = await engine.initialize(containerId);

            if (!success) {
                throw new Error('VIB3Engine initialization failed');
            }

            await engine.switchSystem(system);
            syncParams();

            initialized = true;
            dispatch('ready', engine);
        } catch (err) {
            console.error('[Vib3Visualizer] Initialization error:', err);
            dispatch('error', err);
        }
    });

    onDestroy(() => {
        if (engine) {
            engine.destroy();
            engine = null;
        }
        initialized = false;
    });

    // ---- Reactive Synchronization ----
    function syncParams() {
        if (!engine || !initialized) return;
        engine.setParameters({
            geometry, hue, saturation, intensity, speed,
            gridDensity, morphFactor, chaos, dimension,
            rot4dXY, rot4dXZ, rot4dYZ, rot4dXW, rot4dYW, rot4dZW
        });
    }

    // React to system change
    $: if (initialized && engine) {
        engine.switchSystem(system);
    }

    // React to parameter changes
    $: if (initialized && engine) {
        // This block re-runs whenever any listed variable changes
        void (geometry, hue, saturation, intensity, speed,
              gridDensity, morphFactor, chaos, dimension,
              rot4dXY, rot4dXZ, rot4dYZ, rot4dXW, rot4dYW, rot4dZW);
        syncParams();
    }

    // ---- Public API (accessible via bind:this) ----

    /** @returns {object|null} The underlying VIB3Engine instance */
    export function getEngine() {
        return engine;
    }

    /** @returns {boolean} Whether the engine has been initialized */
    export function isInitialized() {
        return initialized;
    }

    /** Randomize all visualization parameters */
    export function randomize() {
        if (engine && initialized) engine.randomizeAll();
    }

    /** Reset parameters to defaults */
    export function reset() {
        if (engine && initialized) engine.resetAll();
    }

    /** Export current engine state */
    export function exportState() {
        return engine ? engine.exportState() : null;
    }

    /** Import an engine state object */
    export async function importState(state) {
        if (engine) await engine.importState(state);
    }
<\/script>

<div
    id={containerId}
    bind:this={containerEl}
    class="vib3-visualizer {className}"
    style="width:{width};height:{height};position:relative;overflow:hidden;background:#000"
/>

<style>
    .vib3-visualizer {
        position: relative;
        overflow: hidden;
        background: #000;
    }
</style>
`;
    }

    /**
     * Returns a Svelte writable store definition for VIB3+ state management.
     *
     * The generated store:
     * - Uses Svelte's writable store pattern
     * - Holds engine reference, initialization state, current system, and all parameters
     * - Provides helper methods: setParameter, setParameters, switchSystem, randomize, reset
     * - Automatically syncs store state to the engine
     *
     * @returns {string} Complete Svelte store source code
     * @example
     * const storeCode = Vib3SvelteWrapper.getStore();
     * // Write to src/lib/vib3Store.js
     */
    static getStore() {
        return `import { writable, derived, get } from 'svelte/store';

/**
 * VIB3+ Svelte Store
 *
 * Manages VIB3Engine state as a Svelte writable store.
 * Provides reactive state and methods for controlling the visualization.
 *
 * @example
 * import { vib3Store, vib3Actions } from '$lib/vib3Store';
 *
 * // Subscribe to state
 * $: console.log($vib3Store.parameters.hue);
 *
 * // Update parameter
 * vib3Actions.setParameter('hue', 270);
 *
 * // Switch system
 * vib3Actions.switchSystem('holographic');
 */

/** @type {import('svelte/store').Writable} */
export const vib3Store = writable({
    /** @type {object|null} VIB3Engine instance */
    engine: null,
    /** @type {boolean} Whether the engine is initialized */
    initialized: false,
    /** @type {string} Current active system */
    system: 'quantum',
    /** @type {object} Current visualization parameters */
    parameters: {
        geometry: 0,
        hue: 200,
        saturation: 0.8,
        intensity: 0.5,
        speed: 1.0,
        gridDensity: 15,
        morphFactor: 1.0,
        chaos: 0.2,
        dimension: 3.5,
        rot4dXY: 0, rot4dXZ: 0, rot4dYZ: 0,
        rot4dXW: 0, rot4dYW: 0, rot4dZW: 0
    }
});

/**
 * Derived store: whether the engine is ready for commands
 * @type {import('svelte/store').Readable<boolean>}
 */
export const vib3Ready = derived(vib3Store, ($store) => $store.initialized);

/**
 * Derived store: current visualization system name
 * @type {import('svelte/store').Readable<string>}
 */
export const vib3System = derived(vib3Store, ($store) => $store.system);

/**
 * Derived store: current visualization parameters
 * @type {import('svelte/store').Readable<object>}
 */
export const vib3Params = derived(vib3Store, ($store) => $store.parameters);

/**
 * Action creators for the VIB3 store.
 * These mutate the store and sync changes to the engine.
 */
export const vib3Actions = {
    /**
     * Initialize the engine and connect it to the store.
     * Call this once after the container element is in the DOM.
     *
     * @param {string} containerId - DOM element ID to mount VIB3 into
     * @param {object} [options={}] - Engine constructor options
     * @returns {Promise<boolean>} Whether initialization succeeded
     */
    async initialize(containerId, options = {}) {
        const { VIB3Engine } = await import('@vib3/core');

        const engine = new VIB3Engine({
            preferWebGPU: options.preferWebGPU || false,
            debug: options.debug || false
        });

        const success = await engine.initialize(containerId);
        if (success) {
            const allParams = engine.getAllParameters();
            vib3Store.set({
                engine,
                initialized: true,
                system: engine.getCurrentSystem(),
                parameters: { ...allParams }
            });
        }
        return success;
    },

    /**
     * Set a single visualization parameter.
     * @param {string} name - Parameter name
     * @param {number} value - Parameter value
     */
    setParameter(name, value) {
        const state = get(vib3Store);
        if (state.engine && state.initialized) {
            state.engine.setParameter(name, value);
            vib3Store.update(s => ({
                ...s,
                parameters: { ...s.parameters, [name]: value }
            }));
        }
    },

    /**
     * Set multiple visualization parameters at once.
     * @param {object} params - Object of name/value parameter pairs
     */
    setParameters(params) {
        const state = get(vib3Store);
        if (state.engine && state.initialized) {
            state.engine.setParameters(params);
            vib3Store.update(s => ({
                ...s,
                parameters: { ...s.parameters, ...params }
            }));
        }
    },

    /**
     * Switch to a different visualization system.
     * @param {string} newSystem - 'quantum' | 'faceted' | 'holographic'
     * @returns {Promise<boolean>} Whether the switch succeeded
     */
    async switchSystem(newSystem) {
        const state = get(vib3Store);
        if (state.engine && state.initialized) {
            const success = await state.engine.switchSystem(newSystem);
            if (success) {
                vib3Store.update(s => ({
                    ...s,
                    system: newSystem,
                    parameters: { ...state.engine.getAllParameters() }
                }));
            }
            return success;
        }
        return false;
    },

    /** Randomize all parameters */
    randomize() {
        const state = get(vib3Store);
        if (state.engine && state.initialized) {
            state.engine.randomizeAll();
            vib3Store.update(s => ({
                ...s,
                parameters: { ...state.engine.getAllParameters() }
            }));
        }
    },

    /** Reset parameters to defaults */
    reset() {
        const state = get(vib3Store);
        if (state.engine && state.initialized) {
            state.engine.resetAll();
            vib3Store.update(s => ({
                ...s,
                parameters: { ...state.engine.getAllParameters() }
            }));
        }
    },

    /** Export the current engine state */
    exportState() {
        const state = get(vib3Store);
        return state.engine ? state.engine.exportState() : null;
    },

    /** Import an engine state object */
    async importState(stateObj) {
        const state = get(vib3Store);
        if (state.engine) {
            await state.engine.importState(stateObj);
            vib3Store.update(s => ({
                ...s,
                system: state.engine.getCurrentSystem(),
                parameters: { ...state.engine.getAllParameters() }
            }));
        }
    },

    /** Start reactivity processing */
    startReactivity() {
        const state = get(vib3Store);
        if (state.engine) state.engine.startReactivity();
    },

    /** Stop reactivity processing */
    stopReactivity() {
        const state = get(vib3Store);
        if (state.engine) state.engine.stopReactivity();
    },

    /**
     * Feed audio levels into reactivity.
     * @param {number} bass - Bass level (0-1)
     * @param {number} mid - Mid level (0-1)
     * @param {number} high - High level (0-1)
     */
    setAudioInput(bass, mid, high) {
        const state = get(vib3Store);
        if (state.engine) state.engine.setAudioInput(bass, mid, high);
    },

    /** Destroy the engine and reset the store */
    destroy() {
        const state = get(vib3Store);
        if (state.engine) {
            state.engine.destroy();
        }
        vib3Store.set({
            engine: null,
            initialized: false,
            system: 'quantum',
            parameters: {
                geometry: 0, hue: 200, saturation: 0.8, intensity: 0.5,
                speed: 1.0, gridDensity: 15, morphFactor: 1.0, chaos: 0.2,
                dimension: 3.5, rot4dXY: 0, rot4dXZ: 0, rot4dYZ: 0,
                rot4dXW: 0, rot4dYW: 0, rot4dZW: 0
            }
        });
    }
};
`;
    }

    /**
     * Generates a complete NPM package structure for @vib3/svelte.
     *
     * @returns {Object.<string, string|object>} Map of file path to file content
     */
    static generatePackage() {
        return {
            'package.json': {
                name: '@vib3/svelte',
                version: '1.0.0',
                description: 'Svelte components for VIB3+ 4D Visualization Engine',
                svelte: 'src/index.js',
                main: 'dist/index.js',
                module: 'src/index.js',
                types: 'dist/index.d.ts',
                files: ['dist/', 'src/'],
                scripts: {
                    build: 'svelte-kit sync && svelte-package',
                    dev: 'vite dev',
                    prepublishOnly: 'npm run build'
                },
                peerDependencies: {
                    svelte: '>=4.0.0',
                    '@vib3/core': '>=1.0.0'
                },
                devDependencies: {
                    '@sveltejs/kit': '^2.0.0',
                    '@sveltejs/package': '^2.0.0',
                    svelte: '^4.0.0',
                    vite: '^5.0.0'
                },
                keywords: ['vib3', 'svelte', 'sveltekit', '4d', 'visualization', 'webgl', 'webgpu', 'shader'],
                license: 'MIT',
                repository: {
                    type: 'git',
                    url: 'https://github.com/clear-seas/vib3-svelte'
                },
                author: 'Clear Seas Solutions LLC'
            },

            'src/index.js': `/**
 * @vib3/svelte - Svelte bindings for VIB3+ 4D Visualization Engine
 * @module @vib3/svelte
 */
export { default as Vib3Visualizer } from './Vib3Visualizer.svelte';
export { vib3Store, vib3Ready, vib3System, vib3Params, vib3Actions } from './vib3Store.js';
`,

            'src/Vib3Visualizer.svelte': Vib3SvelteWrapper.getComponent(),

            'src/vib3Store.js': Vib3SvelteWrapper.getStore(),

            'README.md': `# @vib3/svelte

Svelte components and stores for the VIB3+ 4D Visualization Engine.

## Installation

\`\`\`bash
npm install @vib3/svelte @vib3/core svelte
\`\`\`

## Quick Start

### Component Usage

\`\`\`svelte
<script>
    import { Vib3Visualizer } from '@vib3/svelte';

    function handleReady(event) {
        console.log('VIB3 ready:', event.detail);
    }
</script>

<Vib3Visualizer
    system="quantum"
    hue={200}
    saturation={0.8}
    geometry={5}
    width="100%"
    height="600px"
    on:ready={handleReady}
/>
\`\`\`

### Store Usage

\`\`\`svelte
<script>
    import { onMount } from 'svelte';
    import { vib3Store, vib3Actions, vib3Ready } from '@vib3/svelte';

    onMount(async () => {
        await vib3Actions.initialize('vib3-container');
    });
</script>

<div id="vib3-container" style="width:100%;height:400px" />

{#if $vib3Ready}
    <button on:click={() => vib3Actions.switchSystem('quantum')}>Quantum</button>
    <button on:click={() => vib3Actions.switchSystem('faceted')}>Faceted</button>
    <button on:click={() => vib3Actions.randomize()}>Randomize</button>
    <input type="range" min="0" max="360"
           value={$vib3Store.parameters.hue}
           on:input={(e) => vib3Actions.setParameter('hue', Number(e.target.value))} />
{/if}
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| system | string | 'quantum' | Active system |
| geometry | number | 0 | Geometry variant (0-23) |
| hue | number | 200 | Color hue (0-360) |
| saturation | number | 0.8 | Color saturation (0-1) |
| intensity | number | 0.5 | Visual intensity (0-1) |
| speed | number | 1.0 | Animation speed (0.1-3) |
| gridDensity | number | 15 | Pattern density (4-100) |
| morphFactor | number | 1.0 | Shape interpolation (0-2) |
| chaos | number | 0.2 | Randomness (0-1) |
| dimension | number | 3.5 | Projection distance (3.0-4.5) |
| rot4dXY-ZW | number | 0 | 6D rotation angles (radians) |
| width | string | '100%' | Container width |
| height | string | '400px' | Container height |

## License

MIT - Clear Seas Solutions LLC
`
        };
    }

    /**
     * Returns the Svelte prop definitions.
     * @returns {Object} Prop definition map
     */
    static getPropDefs() {
        return { ...VIB3_SVELTE_PROPS };
    }

    /**
     * Returns the list of numeric parameter prop names.
     * @returns {string[]}
     */
    static getNumericPropNames() {
        return [...NUMERIC_PROP_NAMES];
    }
}
