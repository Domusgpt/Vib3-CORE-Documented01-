/**
 * VIB3+ React Component Wrapper
 *
 * Generates React-compatible component definitions and hooks for embedding
 * VIB3+ 4D visualizations in React applications. This module produces
 * source code strings and package structures suitable for NPM publishing.
 *
 * Usage (generated component):
 *   <Vib3Visualizer system="quantum" hue={200} saturation={0.8} />
 *
 * Usage (generated hook):
 *   const { engine, setParameter, switchSystem } = useVib3(containerRef);
 *
 * NOTE: This is a vanilla JS wrapper that generates React-compatible code.
 * Users import this and use with React.createElement or JSX after building
 * the generated package.
 *
 * @module Vib3ReactWrapper
 * @version 1.0.0
 * @license All Rights Reserved - Clear Seas Solutions LLC
 */

/**
 * Default VIB3+ parameter definitions with types and ranges.
 * Used for prop type generation and validation.
 * @constant {Object}
 */
const VIB3_PARAM_DEFS = {
    system: { type: 'string', default: 'quantum', options: ['quantum', 'faceted', 'holographic'] },
    geometry: { type: 'number', min: 0, max: 23, default: 0 },
    hue: { type: 'number', min: 0, max: 360, default: 200 },
    saturation: { type: 'number', min: 0, max: 1, default: 0.8 },
    intensity: { type: 'number', min: 0, max: 1, default: 0.5 },
    speed: { type: 'number', min: 0.1, max: 3, default: 1.0 },
    gridDensity: { type: 'number', min: 4, max: 100, default: 15 },
    morphFactor: { type: 'number', min: 0, max: 2, default: 1.0 },
    chaos: { type: 'number', min: 0, max: 1, default: 0.2 },
    dimension: { type: 'number', min: 3.0, max: 4.5, default: 3.5 },
    rot4dXY: { type: 'number', min: -6.28, max: 6.28, default: 0.0 },
    rot4dXZ: { type: 'number', min: -6.28, max: 6.28, default: 0.0 },
    rot4dYZ: { type: 'number', min: -6.28, max: 6.28, default: 0.0 },
    rot4dXW: { type: 'number', min: -2, max: 2, default: 0.0 },
    rot4dYW: { type: 'number', min: -2, max: 2, default: 0.0 },
    rot4dZW: { type: 'number', min: -2, max: 2, default: 0.0 }
};

/**
 * Numeric parameter keys (excludes 'system' which is a string).
 * @constant {string[]}
 */
const NUMERIC_PARAM_KEYS = Object.keys(VIB3_PARAM_DEFS).filter(k => VIB3_PARAM_DEFS[k].type === 'number');

/**
 * React wrapper for VIB3+ visualization engine.
 *
 * Provides static methods that generate React component source code,
 * hook definitions, and full NPM package structures for the @vib3/react package.
 *
 * @class
 */
export class Vib3ReactWrapper {
    /**
     * Returns a React function component definition as a source code string.
     *
     * The generated component:
     * - Creates a container div with a unique ID
     * - Initializes VIB3Engine on mount via useEffect
     * - Syncs all VIB3 parameter props to the engine on change
     * - Handles system switching when the `system` prop changes
     * - Properly destroys the engine on unmount
     *
     * @returns {string} Complete React function component source code (JSX)
     * @example
     * const componentCode = Vib3ReactWrapper.getComponent();
     * // Write to src/Vib3Visualizer.jsx in your React project
     */
    static getComponent() {
        return `import React, { useRef, useEffect, useId } from 'react';
import { VIB3Engine } from '@vib3/core';

/**
 * VIB3+ Visualizer React Component
 *
 * Renders a VIB3+ 4D visualization inside a container div.
 * Supports all VIB3 parameters as props and handles lifecycle automatically.
 *
 * @param {object} props
 * @param {string} [props.system='quantum'] - Active system: 'quantum' | 'faceted' | 'holographic'
 * @param {number} [props.geometry=0] - Geometry variant index (0-23)
 * @param {number} [props.hue=200] - Color hue (0-360)
 * @param {number} [props.saturation=0.8] - Color saturation (0-1)
 * @param {number} [props.intensity=0.5] - Visual intensity (0-1)
 * @param {number} [props.speed=1.0] - Animation speed (0.1-3)
 * @param {number} [props.gridDensity=15] - Pattern density (4-100)
 * @param {number} [props.morphFactor=1.0] - Shape interpolation (0-2)
 * @param {number} [props.chaos=0.2] - Randomness level (0-1)
 * @param {number} [props.dimension=3.5] - Projection distance (3.0-4.5)
 * @param {number} [props.rot4dXY=0] - XY plane rotation (radians)
 * @param {number} [props.rot4dXZ=0] - XZ plane rotation (radians)
 * @param {number} [props.rot4dYZ=0] - YZ plane rotation (radians)
 * @param {number} [props.rot4dXW=0] - XW hyperplane rotation (radians)
 * @param {number} [props.rot4dYW=0] - YW hyperplane rotation (radians)
 * @param {number} [props.rot4dZW=0] - ZW hyperplane rotation (radians)
 * @param {string} [props.width='100%'] - Container width CSS value
 * @param {string} [props.height='400px'] - Container height CSS value
 * @param {string} [props.className] - Additional CSS class names
 * @param {object} [props.style] - Additional inline styles
 * @param {function} [props.onReady] - Callback fired when engine is initialized
 * @param {function} [props.onError] - Callback fired on initialization error
 * @param {React.Ref} [props.engineRef] - Ref to receive the VIB3Engine instance
 * @returns {React.ReactElement}
 */
export default function Vib3Visualizer({
    system = 'quantum',
    geometry = 0,
    hue = 200,
    saturation = 0.8,
    intensity = 0.5,
    speed = 1.0,
    gridDensity = 15,
    morphFactor = 1.0,
    chaos = 0.2,
    dimension = 3.5,
    rot4dXY = 0,
    rot4dXZ = 0,
    rot4dYZ = 0,
    rot4dXW = 0,
    rot4dYW = 0,
    rot4dZW = 0,
    width = '100%',
    height = '400px',
    className = '',
    style = {},
    onReady,
    onError,
    engineRef
}) {
    const containerRef = useRef(null);
    const engineInstance = useRef(null);
    const uniqueId = useId();
    const containerId = \`vib3-container-\${uniqueId.replace(/:/g, '')}\`;

    // Initialize engine on mount
    useEffect(() => {
        let mounted = true;

        async function init() {
            try {
                const engine = new VIB3Engine();
                const success = await engine.initialize(containerId);
                if (!mounted) {
                    engine.destroy();
                    return;
                }
                if (!success) {
                    throw new Error('VIB3Engine initialization failed');
                }
                engineInstance.current = engine;
                if (engineRef) {
                    if (typeof engineRef === 'function') engineRef(engine);
                    else engineRef.current = engine;
                }
                if (onReady) onReady(engine);
            } catch (err) {
                console.error('[Vib3Visualizer] Initialization error:', err);
                if (onError) onError(err);
            }
        }

        init();

        return () => {
            mounted = false;
            if (engineInstance.current) {
                engineInstance.current.destroy();
                engineInstance.current = null;
            }
        };
    }, [containerId]);

    // Sync system prop
    useEffect(() => {
        const engine = engineInstance.current;
        if (engine && engine.initialized) {
            engine.switchSystem(system);
        }
    }, [system]);

    // Sync numeric parameter props
    useEffect(() => {
        const engine = engineInstance.current;
        if (engine && engine.initialized) {
            engine.setParameters({
                geometry, hue, saturation, intensity, speed,
                gridDensity, morphFactor, chaos, dimension,
                rot4dXY, rot4dXZ, rot4dYZ, rot4dXW, rot4dYW, rot4dZW
            });
        }
    }, [geometry, hue, saturation, intensity, speed, gridDensity,
        morphFactor, chaos, dimension, rot4dXY, rot4dXZ, rot4dYZ,
        rot4dXW, rot4dYW, rot4dZW]);

    const containerStyle = {
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        background: '#000',
        ...style
    };

    return React.createElement('div', {
        id: containerId,
        ref: containerRef,
        className: \`vib3-visualizer \${className}\`.trim(),
        style: containerStyle
    });
}
`;
    }

    /**
     * Returns the useVib3() custom hook definition as a source code string.
     *
     * The generated hook:
     * - Accepts a container element ref
     * - Manages VIB3Engine lifecycle (create, initialize, destroy)
     * - Provides setParameter, setParameters, switchSystem, randomize, reset functions
     * - Exposes current parameter state via a React state object
     * - Returns an API object for imperative control
     *
     * @returns {string} Complete React hook source code
     * @example
     * const hookCode = Vib3ReactWrapper.getHookDefinition();
     * // Write to src/useVib3.js in your React project
     */
    static getHookDefinition() {
        return `import { useState, useEffect, useRef, useCallback } from 'react';
import { VIB3Engine } from '@vib3/core';

/**
 * useVib3 - React hook for VIB3+ engine lifecycle management
 *
 * @param {string} containerId - DOM element ID to mount VIB3 into
 * @param {object} [initialOptions={}] - Engine constructor options
 * @param {boolean} [initialOptions.preferWebGPU=false] - Prefer WebGPU backend
 * @param {boolean} [initialOptions.debug=false] - Enable debug logging
 * @returns {{
 *   engine: VIB3Engine | null,
 *   initialized: boolean,
 *   system: string,
 *   parameters: object,
 *   setParameter: (name: string, value: number) => void,
 *   setParameters: (params: object) => void,
 *   switchSystem: (system: string) => Promise<boolean>,
 *   randomize: () => void,
 *   reset: () => void,
 *   exportState: () => object | null,
 *   importState: (state: object) => Promise<void>,
 *   startReactivity: () => void,
 *   stopReactivity: () => void,
 *   setAudioInput: (bass: number, mid: number, high: number) => void
 * }}
 */
export function useVib3(containerId, initialOptions = {}) {
    const engineRef = useRef(null);
    const [initialized, setInitialized] = useState(false);
    const [system, setSystem] = useState(initialOptions.system || 'quantum');
    const [parameters, setParameters] = useState({});

    // Initialize engine
    useEffect(() => {
        let mounted = true;

        async function init() {
            const engine = new VIB3Engine({
                preferWebGPU: initialOptions.preferWebGPU || false,
                debug: initialOptions.debug || false
            });

            const success = await engine.initialize(containerId);
            if (!mounted) {
                engine.destroy();
                return;
            }

            if (success) {
                engineRef.current = engine;
                setInitialized(true);
                setParameters(engine.getAllParameters());
                setSystem(engine.getCurrentSystem());
            }
        }

        init();

        return () => {
            mounted = false;
            if (engineRef.current) {
                engineRef.current.destroy();
                engineRef.current = null;
            }
            setInitialized(false);
        };
    }, [containerId]);

    const setParam = useCallback((name, value) => {
        if (engineRef.current && engineRef.current.initialized) {
            engineRef.current.setParameter(name, value);
            setParameters(prev => ({ ...prev, [name]: value }));
        }
    }, []);

    const setParams = useCallback((params) => {
        if (engineRef.current && engineRef.current.initialized) {
            engineRef.current.setParameters(params);
            setParameters(prev => ({ ...prev, ...params }));
        }
    }, []);

    const doSwitchSystem = useCallback(async (newSystem) => {
        if (engineRef.current && engineRef.current.initialized) {
            const success = await engineRef.current.switchSystem(newSystem);
            if (success) {
                setSystem(newSystem);
                setParameters(engineRef.current.getAllParameters());
            }
            return success;
        }
        return false;
    }, []);

    const randomize = useCallback(() => {
        if (engineRef.current && engineRef.current.initialized) {
            engineRef.current.randomizeAll();
            setParameters(engineRef.current.getAllParameters());
        }
    }, []);

    const reset = useCallback(() => {
        if (engineRef.current && engineRef.current.initialized) {
            engineRef.current.resetAll();
            setParameters(engineRef.current.getAllParameters());
        }
    }, []);

    const exportState = useCallback(() => {
        if (engineRef.current && engineRef.current.initialized) {
            return engineRef.current.exportState();
        }
        return null;
    }, []);

    const importState = useCallback(async (state) => {
        if (engineRef.current && engineRef.current.initialized) {
            await engineRef.current.importState(state);
            setParameters(engineRef.current.getAllParameters());
            setSystem(engineRef.current.getCurrentSystem());
        }
    }, []);

    const startReactivity = useCallback(() => {
        if (engineRef.current) engineRef.current.startReactivity();
    }, []);

    const stopReactivity = useCallback(() => {
        if (engineRef.current) engineRef.current.stopReactivity();
    }, []);

    const setAudioInput = useCallback((bass, mid, high) => {
        if (engineRef.current) engineRef.current.setAudioInput(bass, mid, high);
    }, []);

    return {
        engine: engineRef.current,
        initialized,
        system,
        parameters,
        setParameter: setParam,
        setParameters: setParams,
        switchSystem: doSwitchSystem,
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
     * Generates a complete NPM package structure for @vib3/react.
     *
     * The returned object maps file paths to their contents, suitable
     * for writing to disk or bundling into a tarball.
     *
     * Package includes:
     * - package.json with peer dependencies on react and @vib3/core
     * - Main entry point re-exporting component and hook
     * - Vib3Visualizer.jsx component file
     * - useVib3.js hook file
     * - README.md with usage documentation
     *
     * @returns {Object.<string, string|object>} Map of file path to file content
     * @example
     * const pkg = Vib3ReactWrapper.generatePackage();
     * Object.entries(pkg).forEach(([path, content]) => {
     *     const data = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
     *     fs.writeFileSync(path, data);
     * });
     */
    static generatePackage() {
        return {
            'package.json': {
                name: '@vib3/react',
                version: '1.0.0',
                description: 'React components for VIB3+ 4D Visualization Engine',
                main: 'dist/index.js',
                module: 'src/index.js',
                types: 'dist/index.d.ts',
                files: ['dist/', 'src/'],
                scripts: {
                    build: 'rollup -c',
                    dev: 'rollup -c -w',
                    prepublishOnly: 'npm run build'
                },
                peerDependencies: {
                    react: '>=18.0.0',
                    'react-dom': '>=18.0.0',
                    '@vib3/core': '>=1.0.0'
                },
                devDependencies: {
                    '@rollup/plugin-babel': '^6.0.0',
                    '@rollup/plugin-node-resolve': '^15.0.0',
                    rollup: '^4.0.0'
                },
                keywords: ['vib3', 'react', '4d', 'visualization', 'webgl', 'webgpu', 'shader'],
                license: 'MIT',
                repository: {
                    type: 'git',
                    url: 'https://github.com/clear-seas/vib3-react'
                },
                author: 'Clear Seas Solutions LLC'
            },

            'src/index.js': `/**
 * @vib3/react - React bindings for VIB3+ 4D Visualization Engine
 * @module @vib3/react
 */
export { default as Vib3Visualizer } from './Vib3Visualizer.jsx';
export { useVib3 } from './useVib3.js';
`,

            'src/Vib3Visualizer.jsx': Vib3ReactWrapper.getComponent(),

            'src/useVib3.js': Vib3ReactWrapper.getHookDefinition(),

            'README.md': `# @vib3/react

React components and hooks for the VIB3+ 4D Visualization Engine.

## Installation

\`\`\`bash
npm install @vib3/react @vib3/core react react-dom
\`\`\`

## Quick Start

### Component Usage

\`\`\`jsx
import { Vib3Visualizer } from '@vib3/react';

function App() {
    return (
        <Vib3Visualizer
            system="quantum"
            hue={200}
            saturation={0.8}
            intensity={0.7}
            geometry={5}
            width="100%"
            height="600px"
            onReady={(engine) => console.log('VIB3 ready:', engine)}
        />
    );
}
\`\`\`

### Hook Usage

\`\`\`jsx
import { useVib3 } from '@vib3/react';

function VisualizerController() {
    const {
        initialized,
        system,
        parameters,
        setParameter,
        switchSystem,
        randomize,
        reset
    } = useVib3('vib3-container');

    return (
        <div>
            <div id="vib3-container" style={{ width: '100%', height: '400px' }} />
            {initialized && (
                <div>
                    <button onClick={() => switchSystem('quantum')}>Quantum</button>
                    <button onClick={() => switchSystem('faceted')}>Faceted</button>
                    <button onClick={() => switchSystem('holographic')}>Holographic</button>
                    <button onClick={randomize}>Randomize</button>
                    <button onClick={reset}>Reset</button>
                    <input
                        type="range"
                        min="0"
                        max="360"
                        value={parameters.hue || 200}
                        onChange={(e) => setParameter('hue', Number(e.target.value))}
                    />
                </div>
            )}
        </div>
    );
}
\`\`\`

## Props (Vib3Visualizer)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| system | string | 'quantum' | Active system: quantum, faceted, holographic |
| geometry | number | 0 | Geometry variant (0-23) |
| hue | number | 200 | Color hue (0-360) |
| saturation | number | 0.8 | Color saturation (0-1) |
| intensity | number | 0.5 | Visual intensity (0-1) |
| speed | number | 1.0 | Animation speed (0.1-3) |
| gridDensity | number | 15 | Pattern density (4-100) |
| morphFactor | number | 1.0 | Shape interpolation (0-2) |
| chaos | number | 0.2 | Randomness (0-1) |
| dimension | number | 3.5 | 4D projection distance (3.0-4.5) |
| rot4dXY-ZW | number | 0 | 6D rotation angles (radians) |
| width | string | '100%' | Container CSS width |
| height | string | '400px' | Container CSS height |
| onReady | function | - | Callback when engine initializes |
| onError | function | - | Callback on initialization error |
| engineRef | ref | - | Ref to receive VIB3Engine instance |

## Systems

- **Quantum** - Complex lattice visualizations with quantum-inspired patterns
- **Faceted** - Clean 2D geometric patterns with 4D rotation projection
- **Holographic** - 5-layer glassmorphic audio-reactive effects

## 24 Geometry Variants

8 base geometries x 3 core types = 24 variants

**Base (0-7):** Tetrahedron, Hypercube, Sphere, Torus, Klein Bottle, Fractal, Wave, Crystal
**Hypersphere Core (8-15):** Base geometries warped through S3 projection
**Hypertetrahedron Core (16-23):** Base geometries warped through pentatope mapping

## License

MIT - Clear Seas Solutions LLC
`
        };
    }

    /**
     * Returns the parameter definitions used for prop types and validation.
     * @returns {Object} Parameter definition map
     */
    static getParameterDefs() {
        return { ...VIB3_PARAM_DEFS };
    }

    /**
     * Returns a list of all numeric parameter keys.
     * @returns {string[]} Array of numeric parameter names
     */
    static getNumericParamKeys() {
        return [...NUMERIC_PARAM_KEYS];
    }
}
