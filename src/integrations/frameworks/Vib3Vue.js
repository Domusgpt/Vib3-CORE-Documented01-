/**
 * VIB3+ Vue 3 Component Wrapper
 *
 * Generates Vue 3 Composition API component definitions and composables
 * for embedding VIB3+ 4D visualizations in Vue applications.
 *
 * Usage (generated component):
 *   <Vib3Visualizer system="quantum" :hue="200" :saturation="0.8" />
 *
 * Usage (generated composable):
 *   const { engine, parameters, setParameter, switchSystem } = useVib3('container-id');
 *
 * NOTE: This module generates Vue 3 source code strings and package structures.
 * The output is intended for use in a Vue 3 project with the Composition API.
 *
 * @module Vib3VueWrapper
 * @version 1.0.0
 * @license All Rights Reserved - Clear Seas Solutions LLC
 */

/**
 * VIB3+ parameter prop definitions for Vue component validation.
 * @constant {Object}
 */
const VIB3_PROP_DEFS = {
    system: { type: 'String', default: "'quantum'", validator: "['quantum', 'faceted', 'holographic'].includes" },
    geometry: { type: 'Number', default: 0, min: 0, max: 23 },
    hue: { type: 'Number', default: 200, min: 0, max: 360 },
    saturation: { type: 'Number', default: 0.8, min: 0, max: 1 },
    intensity: { type: 'Number', default: 0.5, min: 0, max: 1 },
    speed: { type: 'Number', default: 1.0, min: 0.1, max: 3 },
    gridDensity: { type: 'Number', default: 15, min: 4, max: 100 },
    morphFactor: { type: 'Number', default: 1.0, min: 0, max: 2 },
    chaos: { type: 'Number', default: 0.2, min: 0, max: 1 },
    dimension: { type: 'Number', default: 3.5, min: 3.0, max: 4.5 },
    rot4dXY: { type: 'Number', default: 0, min: -6.28, max: 6.28 },
    rot4dXZ: { type: 'Number', default: 0, min: -6.28, max: 6.28 },
    rot4dYZ: { type: 'Number', default: 0, min: -6.28, max: 6.28 },
    rot4dXW: { type: 'Number', default: 0, min: -2, max: 2 },
    rot4dYW: { type: 'Number', default: 0, min: -2, max: 2 },
    rot4dZW: { type: 'Number', default: 0, min: -2, max: 2 }
};

/**
 * Numeric prop names for batch parameter updates.
 * @constant {string[]}
 */
const NUMERIC_PROPS = Object.keys(VIB3_PROP_DEFS).filter(k => VIB3_PROP_DEFS[k].type === 'Number');

/**
 * Vue 3 wrapper for VIB3+ visualization engine.
 *
 * Provides static methods that generate Vue 3 Composition API component
 * source code, composable definitions, and full NPM package structures
 * for the @vib3/vue package.
 *
 * @class
 */
export class Vib3VueWrapper {
    /**
     * Returns a Vue 3 Single File Component (SFC) source code string.
     *
     * The generated component:
     * - Uses Composition API with setup()
     * - Declares all VIB3 parameters as validated props
     * - Initializes VIB3Engine on mounted lifecycle
     * - Watches all props for reactive parameter updates
     * - Watches the system prop for system switching
     * - Emits 'ready' and 'error' events
     * - Properly destroys the engine on unmount
     *
     * @returns {string} Complete Vue 3 SFC source code (.vue format)
     * @example
     * const componentCode = Vib3VueWrapper.getComponent();
     * // Write to src/Vib3Visualizer.vue in your Vue project
     */
    static getComponent() {
        return `<template>
    <div
        :id="containerId"
        ref="containerRef"
        class="vib3-visualizer"
        :class="className"
        :style="containerStyle"
    />
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { VIB3Engine } from '@vib3/core';

/**
 * VIB3+ Visualizer Vue 3 Component
 *
 * Renders a VIB3+ 4D visualization inside a container div.
 * Supports all VIB3 parameters as reactive props.
 *
 * @emits ready - Fired when the VIB3Engine is successfully initialized. Payload: VIB3Engine instance.
 * @emits error - Fired on initialization failure. Payload: Error object.
 */
export default defineComponent({
    name: 'Vib3Visualizer',

    props: {
        /** Active visualization system */
        system: {
            type: String,
            default: 'quantum',
            validator: (v) => ['quantum', 'faceted', 'holographic'].includes(v)
        },
        /** Geometry variant index (0-23) */
        geometry: { type: Number, default: 0 },
        /** Color hue (0-360) */
        hue: { type: Number, default: 200 },
        /** Color saturation (0-1) */
        saturation: { type: Number, default: 0.8 },
        /** Visual intensity (0-1) */
        intensity: { type: Number, default: 0.5 },
        /** Animation speed (0.1-3) */
        speed: { type: Number, default: 1.0 },
        /** Pattern density (4-100) */
        gridDensity: { type: Number, default: 15 },
        /** Shape interpolation (0-2) */
        morphFactor: { type: Number, default: 1.0 },
        /** Randomness level (0-1) */
        chaos: { type: Number, default: 0.2 },
        /** 4D projection distance (3.0-4.5) */
        dimension: { type: Number, default: 3.5 },
        /** XY plane rotation (radians) */
        rot4dXY: { type: Number, default: 0 },
        /** XZ plane rotation (radians) */
        rot4dXZ: { type: Number, default: 0 },
        /** YZ plane rotation (radians) */
        rot4dYZ: { type: Number, default: 0 },
        /** XW hyperplane rotation (radians) */
        rot4dXW: { type: Number, default: 0 },
        /** YW hyperplane rotation (radians) */
        rot4dYW: { type: Number, default: 0 },
        /** ZW hyperplane rotation (radians) */
        rot4dZW: { type: Number, default: 0 },
        /** Container CSS width */
        width: { type: String, default: '100%' },
        /** Container CSS height */
        height: { type: String, default: '400px' },
        /** Additional CSS class */
        className: { type: String, default: '' },
        /** Prefer WebGPU backend */
        preferWebGPU: { type: Boolean, default: false },
        /** Enable debug logging */
        debug: { type: Boolean, default: false }
    },

    emits: ['ready', 'error'],

    setup(props, { emit, expose }) {
        const containerRef = ref(null);
        let engine = null;
        const initialized = ref(false);

        // Generate a unique container ID
        const containerId = 'vib3-vue-' + Math.random().toString(36).substring(2, 11);

        const containerStyle = computed(() => ({
            width: props.width,
            height: props.height,
            position: 'relative',
            overflow: 'hidden',
            background: '#000'
        }));

        // Collect all numeric parameter props into a params object
        function collectParams() {
            return {
                geometry: props.geometry,
                hue: props.hue,
                saturation: props.saturation,
                intensity: props.intensity,
                speed: props.speed,
                gridDensity: props.gridDensity,
                morphFactor: props.morphFactor,
                chaos: props.chaos,
                dimension: props.dimension,
                rot4dXY: props.rot4dXY,
                rot4dXZ: props.rot4dXZ,
                rot4dYZ: props.rot4dYZ,
                rot4dXW: props.rot4dXW,
                rot4dYW: props.rot4dYW,
                rot4dZW: props.rot4dZW
            };
        }

        // Initialize on mount
        onMounted(async () => {
            try {
                engine = new VIB3Engine({
                    preferWebGPU: props.preferWebGPU,
                    debug: props.debug
                });

                const success = await engine.initialize(containerId);
                if (!success) {
                    throw new Error('VIB3Engine initialization failed');
                }

                // Apply initial system
                await engine.switchSystem(props.system);
                engine.setParameters(collectParams());

                initialized.value = true;
                emit('ready', engine);
            } catch (err) {
                console.error('[Vib3Visualizer] Initialization error:', err);
                emit('error', err);
            }
        });

        // Watch system prop for switching
        watch(() => props.system, async (newSystem) => {
            if (engine && initialized.value) {
                await engine.switchSystem(newSystem);
            }
        });

        // Watch all numeric parameters
        const paramKeys = [
            'geometry', 'hue', 'saturation', 'intensity', 'speed',
            'gridDensity', 'morphFactor', 'chaos', 'dimension',
            'rot4dXY', 'rot4dXZ', 'rot4dYZ', 'rot4dXW', 'rot4dYW', 'rot4dZW'
        ];

        watch(
            () => paramKeys.map(k => props[k]),
            () => {
                if (engine && initialized.value) {
                    engine.setParameters(collectParams());
                }
            }
        );

        // Cleanup on unmount
        onBeforeUnmount(() => {
            if (engine) {
                engine.destroy();
                engine = null;
            }
            initialized.value = false;
        });

        // Expose engine methods to parent via template ref
        expose({
            /** @returns {VIB3Engine|null} The underlying engine instance */
            getEngine: () => engine,
            /** @returns {boolean} Whether the engine is initialized */
            isInitialized: () => initialized.value,
            /** Randomize all parameters */
            randomize: () => { if (engine) engine.randomizeAll(); },
            /** Reset parameters to defaults */
            reset: () => { if (engine) engine.resetAll(); },
            /** Export the current engine state */
            exportState: () => engine ? engine.exportState() : null,
            /** Import an engine state object */
            importState: async (state) => { if (engine) await engine.importState(state); }
        });

        return {
            containerRef,
            containerId,
            containerStyle
        };
    }
});
<\/script>

<style scoped>
.vib3-visualizer {
    position: relative;
    overflow: hidden;
    background: #000;
}
</style>
`;
    }

    /**
     * Returns the useVib3() composable definition as a source code string.
     *
     * The generated composable:
     * - Manages VIB3Engine lifecycle with reactive state
     * - Provides setParameter, setParameters, switchSystem, randomize, reset
     * - Exposes reactive refs for initialized state, current system, and parameters
     * - Handles automatic cleanup on scope disposal
     *
     * @returns {string} Complete Vue 3 composable source code
     * @example
     * const composableCode = Vib3VueWrapper.getComposable();
     * // Write to src/useVib3.js in your Vue project
     */
    static getComposable() {
        return `import { ref, reactive, onMounted, onBeforeUnmount, readonly } from 'vue';
import { VIB3Engine } from '@vib3/core';

/**
 * useVib3 - Vue 3 composable for VIB3+ engine lifecycle management
 *
 * @param {string} containerId - DOM element ID to mount VIB3 into
 * @param {object} [options={}] - Engine constructor options
 * @param {boolean} [options.preferWebGPU=false] - Prefer WebGPU backend
 * @param {boolean} [options.debug=false] - Enable debug logging
 * @param {string} [options.system='quantum'] - Initial system
 * @returns {{
 *   engine: Ref<VIB3Engine|null>,
 *   initialized: Ref<boolean>,
 *   system: Ref<string>,
 *   parameters: Reactive<object>,
 *   setParameter: (name: string, value: number) => void,
 *   setParameters: (params: object) => void,
 *   switchSystem: (system: string) => Promise<boolean>,
 *   randomize: () => void,
 *   reset: () => void,
 *   exportState: () => object|null,
 *   importState: (state: object) => Promise<void>,
 *   startReactivity: () => void,
 *   stopReactivity: () => void,
 *   setAudioInput: (bass: number, mid: number, high: number) => void
 * }}
 */
export function useVib3(containerId, options = {}) {
    const engine = ref(null);
    const initialized = ref(false);
    const system = ref(options.system || 'quantum');
    const parameters = reactive({
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
    });

    onMounted(async () => {
        const eng = new VIB3Engine({
            preferWebGPU: options.preferWebGPU || false,
            debug: options.debug || false
        });

        const success = await eng.initialize(containerId);
        if (success) {
            engine.value = eng;
            initialized.value = true;

            // Sync initial parameters from engine
            const allParams = eng.getAllParameters();
            Object.assign(parameters, allParams);
            system.value = eng.getCurrentSystem();
        }
    });

    onBeforeUnmount(() => {
        if (engine.value) {
            engine.value.destroy();
            engine.value = null;
        }
        initialized.value = false;
    });

    /**
     * Set a single visualization parameter
     * @param {string} name - Parameter name
     * @param {number} value - Parameter value
     */
    function setParameter(name, value) {
        if (engine.value && initialized.value) {
            engine.value.setParameter(name, value);
            parameters[name] = value;
        }
    }

    /**
     * Set multiple visualization parameters at once
     * @param {object} params - Object of name/value parameter pairs
     */
    function setParameters(params) {
        if (engine.value && initialized.value) {
            engine.value.setParameters(params);
            Object.assign(parameters, params);
        }
    }

    /**
     * Switch to a different visualization system
     * @param {string} newSystem - 'quantum' | 'faceted' | 'holographic'
     * @returns {Promise<boolean>} Whether the switch succeeded
     */
    async function switchSystem(newSystem) {
        if (engine.value && initialized.value) {
            const success = await engine.value.switchSystem(newSystem);
            if (success) {
                system.value = newSystem;
                Object.assign(parameters, engine.value.getAllParameters());
            }
            return success;
        }
        return false;
    }

    /** Randomize all parameters */
    function randomize() {
        if (engine.value && initialized.value) {
            engine.value.randomizeAll();
            Object.assign(parameters, engine.value.getAllParameters());
        }
    }

    /** Reset parameters to defaults */
    function reset() {
        if (engine.value && initialized.value) {
            engine.value.resetAll();
            Object.assign(parameters, engine.value.getAllParameters());
        }
    }

    /** Export current engine state */
    function exportState() {
        return engine.value ? engine.value.exportState() : null;
    }

    /** Import an engine state object */
    async function importState(state) {
        if (engine.value) {
            await engine.value.importState(state);
            Object.assign(parameters, engine.value.getAllParameters());
            system.value = engine.value.getCurrentSystem();
        }
    }

    /** Start reactivity processing (audio/tilt/interaction) */
    function startReactivity() {
        if (engine.value) engine.value.startReactivity();
    }

    /** Stop reactivity processing */
    function stopReactivity() {
        if (engine.value) engine.value.stopReactivity();
    }

    /**
     * Feed audio levels into the reactivity system
     * @param {number} bass - Bass level (0-1)
     * @param {number} mid - Mid level (0-1)
     * @param {number} high - High level (0-1)
     */
    function setAudioInput(bass, mid, high) {
        if (engine.value) engine.value.setAudioInput(bass, mid, high);
    }

    return {
        engine: readonly(engine),
        initialized: readonly(initialized),
        system: readonly(system),
        parameters,
        setParameter,
        setParameters,
        switchSystem,
        randomize,
        reset,
        exportState,
        importState,
        startReactivity,
        stopReactivity,
        setAudioInput
    };
}
`;
    }

    /**
     * Generates a complete NPM package structure for @vib3/vue.
     *
     * @returns {Object.<string, string|object>} Map of file path to file content
     */
    static generatePackage() {
        return {
            'package.json': {
                name: '@vib3/vue',
                version: '1.0.0',
                description: 'Vue 3 components for VIB3+ 4D Visualization Engine',
                main: 'dist/index.js',
                module: 'src/index.js',
                types: 'dist/index.d.ts',
                files: ['dist/', 'src/'],
                scripts: {
                    build: 'vite build',
                    dev: 'vite',
                    prepublishOnly: 'npm run build'
                },
                peerDependencies: {
                    vue: '>=3.3.0',
                    '@vib3/core': '>=1.0.0'
                },
                devDependencies: {
                    '@vitejs/plugin-vue': '^5.0.0',
                    vite: '^5.0.0',
                    vue: '^3.4.0'
                },
                keywords: ['vib3', 'vue', 'vue3', '4d', 'visualization', 'webgl', 'webgpu', 'shader'],
                license: 'MIT',
                repository: {
                    type: 'git',
                    url: 'https://github.com/clear-seas/vib3-vue'
                },
                author: 'Clear Seas Solutions LLC'
            },

            'src/index.js': `/**
 * @vib3/vue - Vue 3 bindings for VIB3+ 4D Visualization Engine
 * @module @vib3/vue
 */
export { default as Vib3Visualizer } from './Vib3Visualizer.vue';
export { useVib3 } from './useVib3.js';
`,

            'src/Vib3Visualizer.vue': Vib3VueWrapper.getComponent(),

            'src/useVib3.js': Vib3VueWrapper.getComposable(),

            'README.md': `# @vib3/vue

Vue 3 components and composables for the VIB3+ 4D Visualization Engine.

## Installation

\`\`\`bash
npm install @vib3/vue @vib3/core vue
\`\`\`

## Quick Start

### Component Usage

\`\`\`vue
<template>
    <Vib3Visualizer
        system="quantum"
        :hue="200"
        :saturation="0.8"
        :intensity="0.7"
        :geometry="5"
        width="100%"
        height="600px"
        @ready="onReady"
    />
</template>

<script setup>
import { Vib3Visualizer } from '@vib3/vue';

function onReady(engine) {
    console.log('VIB3 ready:', engine);
}
<\/script>
\`\`\`

### Composable Usage

\`\`\`vue
<template>
    <div>
        <div id="vib3-container" style="width:100%;height:400px" />
        <button @click="switchSystem('quantum')">Quantum</button>
        <button @click="switchSystem('faceted')">Faceted</button>
        <button @click="randomize()">Randomize</button>
        <input type="range" min="0" max="360"
               :value="parameters.hue"
               @input="setParameter('hue', Number($event.target.value))" />
    </div>
</template>

<script setup>
import { useVib3 } from '@vib3/vue';

const {
    initialized,
    parameters,
    setParameter,
    switchSystem,
    randomize
} = useVib3('vib3-container');
<\/script>
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| system | String | 'quantum' | Active system |
| geometry | Number | 0 | Geometry variant (0-23) |
| hue | Number | 200 | Color hue (0-360) |
| saturation | Number | 0.8 | Color saturation (0-1) |
| intensity | Number | 0.5 | Visual intensity (0-1) |
| speed | Number | 1.0 | Animation speed (0.1-3) |
| gridDensity | Number | 15 | Pattern density (4-100) |
| morphFactor | Number | 1.0 | Shape interpolation (0-2) |
| chaos | Number | 0.2 | Randomness (0-1) |
| dimension | Number | 3.5 | Projection distance (3.0-4.5) |
| rot4dXY-ZW | Number | 0 | 6D rotation angles (radians) |
| width | String | '100%' | Container width |
| height | String | '400px' | Container height |

## License

MIT - Clear Seas Solutions LLC
`
        };
    }

    /**
     * Returns the parameter prop definitions used for validation.
     * @returns {Object} Prop definition map
     */
    static getPropDefs() {
        return { ...VIB3_PROP_DEFS };
    }
}
