/**
 * VIB3+ Figma Plugin Integration
 *
 * Generates a complete Figma plugin package that renders VIB3+ 4D visualizations
 * and exports them as image fills, effects, or standalone frames within Figma.
 *
 * The plugin uses an off-screen canvas with WebGL to render VIB3 shaders,
 * then transfers the pixel data to Figma via the Plugin API.
 *
 * Usage:
 *   const pkg = Vib3FigmaPlugin.generatePackage();
 *   // Write all files to disk, then publish via Figma Developer Console
 *
 * @module Vib3FigmaPlugin
 * @version 1.0.0
 * @license All Rights Reserved - Clear Seas Solutions LLC
 */

/**
 * Default render dimensions for plugin output.
 * @constant {Object}
 */
const DEFAULT_RENDER_CONFIG = {
    width: 1024,
    height: 1024,
    pixelRatio: 2,
    format: 'PNG'
};

/**
 * VIB3+ systems available in the plugin.
 * @constant {string[]}
 */
const AVAILABLE_SYSTEMS = ['quantum', 'faceted', 'holographic'];

/**
 * Base geometry names for the UI selector.
 * @constant {string[]}
 */
const BASE_GEOMETRIES = [
    'Tetrahedron', 'Hypercube', 'Sphere', 'Torus',
    'Klein Bottle', 'Fractal', 'Wave', 'Crystal'
];

/**
 * Core type names for the UI selector.
 * @constant {string[]}
 */
const CORE_TYPES = ['Base', 'Hypersphere', 'Hypertetrahedron'];

/**
 * Figma plugin integration for VIB3+ visualization engine.
 *
 * Generates all necessary files for a Figma plugin:
 * - manifest.json (plugin metadata and permissions)
 * - code.js (plugin sandbox code using Figma Plugin API)
 * - ui.html (plugin UI with parameter controls and preview)
 *
 * @class
 */
export class Vib3FigmaPlugin {
    /**
     * Generates the Figma plugin manifest.json content.
     *
     * Configures the plugin with:
     * - Plugin name, ID, and API version
     * - Edit permission for creating/modifying fills
     * - UI entry point and dimensions
     * - Network access for loading VIB3 core assets
     *
     * @param {object} [options={}] - Manifest customization options
     * @param {string} [options.name='VIB3+ 4D Visualizer'] - Plugin display name
     * @param {string} [options.id='vib3-figma-plugin'] - Plugin identifier
     * @param {string} [options.description] - Plugin description text
     * @returns {object} Figma plugin manifest object
     * @example
     * const manifest = Vib3FigmaPlugin.generatePluginManifest({ name: 'My VIB3 Plugin' });
     * fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
     */
    static generatePluginManifest(options = {}) {
        return {
            name: options.name || 'VIB3+ 4D Visualizer',
            id: options.id || 'vib3-figma-plugin',
            api: '1.0.0',
            main: 'code.js',
            ui: 'ui.html',
            editorType: ['figma'],
            capabilities: [],
            enableProposedApi: false,
            permissions: ['currentuser'],
            networkAccess: {
                allowedDomains: ['none'],
                reasoning: 'VIB3 renders entirely client-side using embedded shaders.'
            },
            description: options.description ||
                'Generate stunning 4D visualizations with quantum, faceted, and holographic rendering systems. ' +
                'Supports 24 geometry variants with full 6D rotation control.',
            documentAccess: 'dynamic-page',
            containsWidget: false
        };
    }

    /**
     * Generates the main plugin sandbox code (code.js).
     *
     * This code runs in the Figma plugin sandbox and:
     * - Opens the plugin UI at a configurable size
     * - Receives rendered pixel data from the UI iframe
     * - Creates Figma rectangles with the visualization as an image fill
     * - Supports batch generation of multiple geometry variants
     * - Handles error reporting back to the UI
     *
     * @param {object} [options={}] - Code generation options
     * @param {number} [options.uiWidth=480] - Plugin UI panel width
     * @param {number} [options.uiHeight=640] - Plugin UI panel height
     * @returns {string} Complete plugin sandbox code
     */
    static generatePluginCode(options = {}) {
        const uiWidth = options.uiWidth || 480;
        const uiHeight = options.uiHeight || 640;

        return `/**
 * VIB3+ Figma Plugin - Sandbox Code
 * Runs in the Figma plugin sandbox (no DOM access).
 * Communicates with ui.html via figma.ui.postMessage / figma.ui.onmessage.
 */

figma.showUI(__html__, {
    width: ${uiWidth},
    height: ${uiHeight},
    title: 'VIB3+ 4D Visualizer'
});

/**
 * Handle messages from the plugin UI.
 */
figma.ui.onmessage = async (msg) => {
    try {
        switch (msg.type) {
            case 'render-complete':
                await handleRenderComplete(msg);
                break;

            case 'batch-render':
                await handleBatchRender(msg);
                break;

            case 'apply-fill':
                await handleApplyFill(msg);
                break;

            case 'cancel':
                figma.closePlugin();
                break;

            default:
                console.warn('Unknown message type:', msg.type);
        }
    } catch (err) {
        figma.ui.postMessage({
            type: 'error',
            message: err.message || 'An unknown error occurred'
        });
        figma.notify('VIB3+ Error: ' + (err.message || 'Unknown error'), { error: true });
    }
};

/**
 * Create a Figma rectangle with the rendered VIB3 visualization as an image fill.
 *
 * @param {object} msg - Message containing imageData (Uint8Array), width, height, name
 */
async function handleRenderComplete(msg) {
    const { imageData, width, height, name } = msg;

    if (!imageData || !width || !height) {
        throw new Error('Invalid render data: missing imageData, width, or height');
    }

    // Create image from raw pixel data
    const image = figma.createImage(new Uint8Array(imageData));

    // Create rectangle node
    const rect = figma.createRectangle();
    rect.name = name || 'VIB3+ Visualization';
    rect.resize(width, height);

    // Apply image as fill
    rect.fills = [{
        type: 'IMAGE',
        scaleMode: 'FILL',
        imageHash: image.hash
    }];

    // Position in viewport center
    const viewCenter = figma.viewport.center;
    rect.x = viewCenter.x - width / 2;
    rect.y = viewCenter.y - height / 2;

    // Select the new node
    figma.currentPage.selection = [rect];
    figma.viewport.scrollAndZoomIntoView([rect]);

    figma.notify('VIB3+ visualization created!');
    figma.ui.postMessage({ type: 'render-inserted', nodeId: rect.id });
}

/**
 * Generate multiple geometry variants and arrange them in a grid.
 *
 * @param {object} msg - Message containing params, count, columns, cellSize
 */
async function handleBatchRender(msg) {
    const { renders, columns, cellSize, name } = msg;

    if (!renders || !Array.isArray(renders) || renders.length === 0) {
        throw new Error('Invalid batch render data');
    }

    const cols = columns || 4;
    const size = cellSize || 512;
    const groupName = name || 'VIB3+ Batch';

    const nodes = [];
    const viewCenter = figma.viewport.center;
    const totalCols = Math.min(cols, renders.length);
    const totalRows = Math.ceil(renders.length / cols);
    const startX = viewCenter.x - (totalCols * (size + 20)) / 2;
    const startY = viewCenter.y - (totalRows * (size + 20)) / 2;

    for (let i = 0; i < renders.length; i++) {
        const render = renders[i];
        const col = i % cols;
        const row = Math.floor(i / cols);

        const image = figma.createImage(new Uint8Array(render.imageData));

        const rect = figma.createRectangle();
        rect.name = render.name || 'VIB3+ Variant ' + i;
        rect.resize(size, size);
        rect.fills = [{
            type: 'IMAGE',
            scaleMode: 'FILL',
            imageHash: image.hash
        }];

        rect.x = startX + col * (size + 20);
        rect.y = startY + row * (size + 20);

        // Add rounded corners
        rect.cornerRadius = 8;

        nodes.push(rect);
    }

    // Group all nodes
    if (nodes.length > 1) {
        const group = figma.group(nodes, figma.currentPage);
        group.name = groupName;
        figma.currentPage.selection = [group];
        figma.viewport.scrollAndZoomIntoView([group]);
    } else if (nodes.length === 1) {
        figma.currentPage.selection = nodes;
        figma.viewport.scrollAndZoomIntoView(nodes);
    }

    figma.notify('VIB3+ batch: ' + renders.length + ' visualizations created!');
    figma.ui.postMessage({ type: 'batch-complete', count: renders.length });
}

/**
 * Apply a VIB3 visualization as fill to the currently selected node.
 *
 * @param {object} msg - Message containing imageData, width, height
 */
async function handleApplyFill(msg) {
    const { imageData } = msg;
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
        figma.notify('Please select a shape first.', { error: true });
        return;
    }

    const image = figma.createImage(new Uint8Array(imageData));

    let appliedCount = 0;
    for (const node of selection) {
        if ('fills' in node) {
            node.fills = [{
                type: 'IMAGE',
                scaleMode: 'FILL',
                imageHash: image.hash
            }];
            appliedCount++;
        }
    }

    if (appliedCount > 0) {
        figma.notify('VIB3+ fill applied to ' + appliedCount + ' shape(s)!');
    } else {
        figma.notify('Selected nodes do not support fills.', { error: true });
    }

    figma.ui.postMessage({ type: 'fill-applied', count: appliedCount });
}
`;
    }

    /**
     * Generates the plugin UI HTML file.
     *
     * The UI provides:
     * - System selector (Quantum / Faceted / Holographic)
     * - Geometry variant grid (24 options)
     * - Parameter sliders (hue, saturation, intensity, speed, etc.)
     * - 6D rotation controls
     * - Live WebGL preview canvas
     * - Export buttons (Create New, Apply to Selection, Batch Generate)
     * - Render size configuration
     *
     * The UI renders VIB3 shaders on an off-screen WebGL canvas and
     * sends pixel data to the plugin sandbox via parent.postMessage.
     *
     * @param {object} [options={}] - UI customization options
     * @param {number} [options.previewSize=256] - Preview canvas size in pixels
     * @returns {string} Complete HTML string for the plugin UI
     */
    static generatePluginUI(options = {}) {
        const previewSize = options.previewSize || 256;

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VIB3+ 4D Visualizer</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 11px;
        color: #e0e0e0;
        background: #1e1e2e;
        overflow-y: auto;
        padding: 12px;
    }
    h2 { font-size: 13px; margin-bottom: 8px; color: #64ffb4; text-transform: uppercase; letter-spacing: 1px; }
    h3 { font-size: 11px; margin-bottom: 6px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; }
    .section { margin-bottom: 16px; }
    .preview-container {
        display: flex; justify-content: center; margin-bottom: 12px;
    }
    #preview-canvas {
        width: ${previewSize}px; height: ${previewSize}px;
        border-radius: 8px; border: 1px solid #333;
        background: #000;
    }
    .system-tabs {
        display: flex; gap: 4px; margin-bottom: 12px;
    }
    .system-tab {
        flex: 1; padding: 6px 0; text-align: center;
        background: #2a2a3e; border: 1px solid #3a3a5e; border-radius: 4px;
        color: #888; cursor: pointer; font-size: 10px; text-transform: uppercase;
        transition: all 0.2s;
    }
    .system-tab.active { background: #3a3a6e; color: #64ffb4; border-color: #64ffb4; }
    .system-tab:hover:not(.active) { background: #333358; color: #ccc; }
    .geometry-grid {
        display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; margin-bottom: 12px;
    }
    .geom-btn {
        padding: 4px 0; text-align: center; font-size: 9px;
        background: #2a2a3e; border: 1px solid #3a3a5e; border-radius: 3px;
        color: #888; cursor: pointer; transition: all 0.15s;
    }
    .geom-btn.active { background: #3a3a6e; color: #64ffb4; border-color: #64ffb4; }
    .geom-btn:hover:not(.active) { background: #333358; color: #ccc; }
    .slider-row {
        display: flex; align-items: center; margin-bottom: 6px;
    }
    .slider-label { width: 80px; color: #999; font-size: 10px; }
    .slider-input {
        flex: 1; -webkit-appearance: none; appearance: none;
        height: 4px; background: #3a3a5e; border-radius: 2px; outline: none;
    }
    .slider-input::-webkit-slider-thumb {
        -webkit-appearance: none; width: 12px; height: 12px;
        background: #64ffb4; border-radius: 50%; cursor: pointer;
    }
    .slider-value { width: 40px; text-align: right; color: #64ffb4; font-size: 10px; font-family: monospace; }
    .action-buttons {
        display: flex; gap: 6px; margin-top: 12px;
    }
    .btn {
        flex: 1; padding: 8px 0; text-align: center;
        border: 1px solid #64ffb4; border-radius: 4px;
        color: #64ffb4; background: transparent;
        cursor: pointer; font-size: 10px; text-transform: uppercase;
        letter-spacing: 0.5px; transition: all 0.2s;
    }
    .btn:hover { background: #64ffb420; }
    .btn.primary { background: #64ffb4; color: #1e1e2e; font-weight: 600; }
    .btn.primary:hover { background: #7affcc; }
    .size-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
    .size-input {
        width: 60px; padding: 4px 6px; background: #2a2a3e; border: 1px solid #3a3a5e;
        border-radius: 3px; color: #e0e0e0; font-size: 10px; text-align: center;
    }
    .status { color: #888; font-size: 10px; text-align: center; margin-top: 8px; min-height: 14px; }
    .core-label {
        grid-column: span 8; font-size: 9px; color: #666;
        text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 0;
    }
</style>
</head>
<body>
    <h2>VIB3+ 4D Visualizer</h2>

    <!-- Preview -->
    <div class="preview-container">
        <canvas id="preview-canvas" width="${previewSize * 2}" height="${previewSize * 2}"></canvas>
    </div>

    <!-- System Selection -->
    <div class="section">
        <div class="system-tabs">
            <div class="system-tab active" data-system="quantum">Quantum</div>
            <div class="system-tab" data-system="faceted">Faceted</div>
            <div class="system-tab" data-system="holographic">Holographic</div>
        </div>
    </div>

    <!-- Geometry Selection -->
    <div class="section">
        <h3>Geometry</h3>
        <div class="geometry-grid" id="geometry-grid"></div>
    </div>

    <!-- Parameters -->
    <div class="section">
        <h3>Parameters</h3>
        <div id="param-sliders"></div>
    </div>

    <!-- 6D Rotation -->
    <div class="section">
        <h3>6D Rotation</h3>
        <div id="rotation-sliders"></div>
    </div>

    <!-- Render Size -->
    <div class="section">
        <h3>Output Size</h3>
        <div class="size-row">
            <span class="slider-label">Width</span>
            <input class="size-input" id="render-width" type="number" value="1024" min="64" max="4096" step="64">
            <span style="color:#666">x</span>
            <input class="size-input" id="render-height" type="number" value="1024" min="64" max="4096" step="64">
            <span class="slider-label">Height</span>
        </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
        <button class="btn primary" id="btn-create">Create New</button>
        <button class="btn" id="btn-apply">Apply Fill</button>
        <button class="btn" id="btn-batch">Batch (24)</button>
    </div>
    <div class="status" id="status"></div>

<script>
(function() {
    // ---- State ----
    const state = {
        system: 'quantum',
        geometry: 0,
        hue: 200, saturation: 0.8, intensity: 0.5, speed: 1.0,
        gridDensity: 15, morphFactor: 1.0, chaos: 0.2, dimension: 3.5,
        rot4dXY: 0, rot4dXZ: 0, rot4dYZ: 0, rot4dXW: 0, rot4dYW: 0, rot4dZW: 0
    };

    // ---- Parameter Definitions ----
    const paramDefs = [
        { key: 'hue', label: 'Hue', min: 0, max: 360, step: 1, format: (v) => v + '\\u00b0' },
        { key: 'saturation', label: 'Saturation', min: 0, max: 1, step: 0.01, format: (v) => (v * 100).toFixed(0) + '%' },
        { key: 'intensity', label: 'Intensity', min: 0, max: 1, step: 0.01, format: (v) => (v * 100).toFixed(0) + '%' },
        { key: 'speed', label: 'Speed', min: 0.1, max: 3, step: 0.1, format: (v) => v.toFixed(1) + 'x' },
        { key: 'gridDensity', label: 'Density', min: 4, max: 100, step: 1, format: (v) => v.toFixed(0) },
        { key: 'morphFactor', label: 'Morph', min: 0, max: 2, step: 0.01, format: (v) => v.toFixed(2) },
        { key: 'chaos', label: 'Chaos', min: 0, max: 1, step: 0.01, format: (v) => (v * 100).toFixed(0) + '%' },
        { key: 'dimension', label: 'Dimension', min: 3.0, max: 4.5, step: 0.01, format: (v) => v.toFixed(2) + 'D' }
    ];

    const rotDefs = [
        { key: 'rot4dXY', label: 'XY Plane', min: -6.28, max: 6.28, step: 0.01 },
        { key: 'rot4dXZ', label: 'XZ Plane', min: -6.28, max: 6.28, step: 0.01 },
        { key: 'rot4dYZ', label: 'YZ Plane', min: -6.28, max: 6.28, step: 0.01 },
        { key: 'rot4dXW', label: 'XW Hyper', min: -2, max: 2, step: 0.01 },
        { key: 'rot4dYW', label: 'YW Hyper', min: -2, max: 2, step: 0.01 },
        { key: 'rot4dZW', label: 'ZW Hyper', min: -2, max: 2, step: 0.01 }
    ];

    const baseNames = ['Tet', 'Cube', 'Sph', 'Tor', 'Kln', 'Frc', 'Wav', 'Cry'];
    const coreLabels = ['Base', 'Hypersphere Core', 'Hypertetrahedron Core'];

    // ---- Build UI ----
    function buildGeometryGrid() {
        const grid = document.getElementById('geometry-grid');
        grid.innerHTML = '';
        for (let core = 0; core < 3; core++) {
            const label = document.createElement('div');
            label.className = 'core-label';
            label.textContent = coreLabels[core];
            grid.appendChild(label);
            for (let base = 0; base < 8; base++) {
                const idx = core * 8 + base;
                const btn = document.createElement('div');
                btn.className = 'geom-btn' + (idx === state.geometry ? ' active' : '');
                btn.textContent = baseNames[base];
                btn.title = coreLabels[core] + ' - ' + baseNames[base] + ' (' + idx + ')';
                btn.addEventListener('click', () => {
                    state.geometry = idx;
                    document.querySelectorAll('.geom-btn').forEach((b, i) => {
                        b.classList.toggle('active', i === idx);
                    });
                });
                grid.appendChild(btn);
            }
        }
    }

    function buildSliders(container, defs) {
        const el = document.getElementById(container);
        el.innerHTML = '';
        defs.forEach(def => {
            const row = document.createElement('div');
            row.className = 'slider-row';
            const fmt = def.format || ((v) => v.toFixed(2));
            row.innerHTML =
                '<span class="slider-label">' + def.label + '</span>' +
                '<input class="slider-input" type="range" min="' + def.min + '" max="' + def.max +
                '" step="' + def.step + '" value="' + state[def.key] + '" data-key="' + def.key + '">' +
                '<span class="slider-value" id="val-' + def.key + '">' + fmt(state[def.key]) + '</span>';
            const slider = row.querySelector('input');
            slider.addEventListener('input', () => {
                const v = parseFloat(slider.value);
                state[def.key] = v;
                document.getElementById('val-' + def.key).textContent = fmt(v);
            });
            el.appendChild(row);
        });
    }

    buildGeometryGrid();
    buildSliders('param-sliders', paramDefs);
    buildSliders('rotation-sliders', rotDefs);

    // ---- System Tabs ----
    document.querySelectorAll('.system-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.system = tab.dataset.system;
            document.querySelectorAll('.system-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // ---- Render to Canvas ----
    function renderToCanvas(canvas, width, height) {
        canvas.width = width;
        canvas.height = height;

        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
            setStatus('WebGL not available');
            return null;
        }

        // Minimal full-screen quad vertex shader
        const vsSource = 'attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}';

        // Faceted-style fragment shader (works for all systems as preview)
        const fsSource = \`precision highp float;
uniform float u_time;uniform vec2 u_resolution;uniform float u_geometry;
uniform float u_rot4dXY;uniform float u_rot4dXZ;uniform float u_rot4dYZ;
uniform float u_rot4dXW;uniform float u_rot4dYW;uniform float u_rot4dZW;
uniform float u_dimension;uniform float u_gridDensity;uniform float u_morphFactor;
uniform float u_chaos;uniform float u_hue;uniform float u_intensity;
uniform float u_saturation;uniform float u_speed;

mat4 rotXY(float a){float c=cos(a),s=sin(a);return mat4(c,-s,0,0,s,c,0,0,0,0,1,0,0,0,0,1);}
mat4 rotXW(float a){float c=cos(a),s=sin(a);return mat4(c,0,0,-s,0,1,0,0,0,0,1,0,s,0,0,c);}
mat4 rotYW(float a){float c=cos(a),s=sin(a);return mat4(1,0,0,0,0,c,0,-s,0,0,1,0,0,s,0,c);}
mat4 rotZW(float a){float c=cos(a),s=sin(a);return mat4(1,0,0,0,0,1,0,0,0,0,c,-s,0,0,s,c);}

vec3 hsl2rgb(float h,float s,float l){
    float c=(1.0-abs(2.0*l-1.0))*s;float hp=h*6.0;
    float x=c*(1.0-abs(mod(hp,2.0)-1.0));float m=l-c*0.5;vec3 rgb;
    if(hp<1.0)rgb=vec3(c,x,0);else if(hp<2.0)rgb=vec3(x,c,0);
    else if(hp<3.0)rgb=vec3(0,c,x);else if(hp<4.0)rgb=vec3(0,x,c);
    else if(hp<5.0)rgb=vec3(x,0,c);else rgb=vec3(c,0,x);
    return rgb+m;
}

void main(){
    vec2 uv=(gl_FragCoord.xy-u_resolution*0.5)/min(u_resolution.x,u_resolution.y);
    float t=u_time*0.001*u_speed;
    vec4 p=vec4(uv*3.0,sin(t),cos(t*0.7));
    p=rotXY(u_rot4dXY)*p;p=rotXW(u_rot4dXW)*p;p=rotYW(u_rot4dYW)*p;p=rotZW(u_rot4dZW)*p;
    float w=1.0/(u_dimension-p.w);vec3 proj=p.xyz*w;
    float gs=u_gridDensity*0.1;vec3 g=fract(proj*gs);
    float base=mod(u_geometry,8.0);float core=floor(u_geometry/8.0);
    float pattern=0.0;
    if(base<1.0){vec3 q=g-0.5;pattern=1.0-smoothstep(0.0,0.15,length(q));}
    else if(base<2.0){vec3 e=min(g,1.0-g);pattern=1.0-smoothstep(0.0,0.04,min(min(e.x,e.y),e.z));}
    else if(base<3.0){pattern=1.0-smoothstep(0.1,0.3,length(g-0.5));}
    else if(base<4.0){float r=length(g.xy-0.5);pattern=1.0-smoothstep(0.0,0.05,abs(r-0.3));}
    else if(base<5.0){float u2=atan(g.y-0.5,g.x-0.5);pattern=sin(u2*4.0+t)*0.5+0.5;}
    else if(base<6.0){vec3 c2=abs(g*2.0-1.0);float d=length(max(c2-0.3,0.0));for(int i=0;i<3;i++){c2=abs(c2*2.0-1.0);d=min(d,length(max(c2-0.3,0.0))/pow(2.0,float(i+1)));}pattern=1.0-smoothstep(0.0,0.05,d);}
    else if(base<7.0){pattern=(sin(proj.x*gs*2.0+t*2.0)+sin(proj.y*gs*1.8+t*1.5))*0.25+0.5;}
    else{vec3 c2=g-0.5;float oct=max(max(abs(c2.x)+abs(c2.y),abs(c2.y)+abs(c2.z)),abs(c2.x)+abs(c2.z));pattern=1.0-smoothstep(0.3,0.4,oct);}

    if(core>0.5){pattern*=(1.0+sin(length(proj)*3.0+t)*0.3);}
    pattern*=u_morphFactor;
    pattern+=sin(proj.x*7.0)*cos(proj.y*11.0)*u_chaos*0.3;
    float pi2=pow(clamp(pattern,0.0,1.0),1.5)*u_intensity;
    vec3 col=hsl2rgb(u_hue,u_saturation,0.3+pi2*0.5);
    gl_FragColor=vec4(col*pi2*2.0,1.0);
}\`;

        // Compile shaders
        function createShader(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        const vs = createShader(gl.VERTEX_SHADER, vsSource);
        const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) return null;

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Program link error');
            return null;
        }

        // Fullscreen quad
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(prog, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.useProgram(prog);

        // Set uniforms
        gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), width, height);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), performance.now());
        gl.uniform1f(gl.getUniformLocation(prog, 'u_geometry'), state.geometry);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_gridDensity'), state.gridDensity);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_morphFactor'), state.morphFactor);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_chaos'), state.chaos);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_speed'), state.speed);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_hue'), state.hue / 360.0);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_intensity'), state.intensity);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_saturation'), state.saturation);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_dimension'), state.dimension);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_rot4dXY'), state.rot4dXY);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_rot4dXZ'), state.rot4dXZ);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_rot4dYZ'), state.rot4dYZ);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_rot4dXW'), state.rot4dXW);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_rot4dYW'), state.rot4dYW);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_rot4dZW'), state.rot4dZW);

        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Read pixels
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        // Cleanup
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buf);

        return pixels;
    }

    // ---- Preview Loop ----
    const previewCanvas = document.getElementById('preview-canvas');
    let animFrame;
    function previewLoop() {
        renderToCanvas(previewCanvas, previewCanvas.width, previewCanvas.height);
        animFrame = requestAnimationFrame(previewLoop);
    }
    previewLoop();

    // ---- Status ----
    function setStatus(msg) {
        document.getElementById('status').textContent = msg;
    }

    // ---- Actions ----
    document.getElementById('btn-create').addEventListener('click', () => {
        setStatus('Rendering...');
        const w = parseInt(document.getElementById('render-width').value) || 1024;
        const h = parseInt(document.getElementById('render-height').value) || 1024;
        const offscreen = document.createElement('canvas');
        const pixels = renderToCanvas(offscreen, w, h);
        if (pixels) {
            parent.postMessage({
                pluginMessage: {
                    type: 'render-complete',
                    imageData: Array.from(pixels),
                    width: w, height: h,
                    name: 'VIB3+ ' + state.system + ' G' + state.geometry
                }
            }, '*');
            setStatus('Sent to Figma!');
        } else {
            setStatus('Render failed.');
        }
    });

    document.getElementById('btn-apply').addEventListener('click', () => {
        setStatus('Rendering for fill...');
        const w = parseInt(document.getElementById('render-width').value) || 1024;
        const h = parseInt(document.getElementById('render-height').value) || 1024;
        const offscreen = document.createElement('canvas');
        const pixels = renderToCanvas(offscreen, w, h);
        if (pixels) {
            parent.postMessage({
                pluginMessage: {
                    type: 'apply-fill',
                    imageData: Array.from(pixels),
                    width: w, height: h
                }
            }, '*');
            setStatus('Fill applied!');
        }
    });

    document.getElementById('btn-batch').addEventListener('click', () => {
        setStatus('Batch rendering 24 variants...');
        const size = 512;
        const offscreen = document.createElement('canvas');
        const renders = [];
        const baseNames = ['Tetrahedron','Hypercube','Sphere','Torus','Klein','Fractal','Wave','Crystal'];
        const coreNames = ['Base','Hyper-S','Hyper-T'];
        const origGeom = state.geometry;

        for (let i = 0; i < 24; i++) {
            state.geometry = i;
            const pixels = renderToCanvas(offscreen, size, size);
            if (pixels) {
                renders.push({
                    imageData: Array.from(pixels),
                    name: coreNames[Math.floor(i / 8)] + ' ' + baseNames[i % 8]
                });
            }
        }
        state.geometry = origGeom;

        if (renders.length > 0) {
            parent.postMessage({
                pluginMessage: {
                    type: 'batch-render',
                    renders: renders,
                    columns: 8,
                    cellSize: size,
                    name: 'VIB3+ ' + state.system + ' All Geometries'
                }
            }, '*');
            setStatus('Batch sent! ' + renders.length + ' variants.');
        }
    });

    // ---- Messages from plugin code ----
    window.onmessage = (event) => {
        const msg = event.data.pluginMessage;
        if (!msg) return;
        if (msg.type === 'error') setStatus('Error: ' + msg.message);
        if (msg.type === 'render-inserted') setStatus('Visualization created!');
        if (msg.type === 'batch-complete') setStatus('Batch complete: ' + msg.count + ' items.');
        if (msg.type === 'fill-applied') setStatus('Fill applied to ' + msg.count + ' shape(s).');
    };
})();
<\/script>
</body>
</html>`;
    }

    /**
     * Generates a complete Figma plugin package ready for deployment.
     *
     * @param {object} [options={}] - Package customization options
     * @returns {Object.<string, string|object>} Map of file path to file content
     * @example
     * const pkg = Vib3FigmaPlugin.generatePackage();
     * // Write manifest.json, code.js, and ui.html to your plugin directory
     */
    static generatePackage(options = {}) {
        return {
            'manifest.json': Vib3FigmaPlugin.generatePluginManifest(options),
            'code.js': Vib3FigmaPlugin.generatePluginCode(options),
            'ui.html': Vib3FigmaPlugin.generatePluginUI(options)
        };
    }

    /**
     * Returns the default render configuration.
     * @returns {Object} Default width, height, pixelRatio, format
     */
    static getDefaultRenderConfig() {
        return { ...DEFAULT_RENDER_CONFIG };
    }

    /**
     * Returns available system names.
     * @returns {string[]} Array of system names
     */
    static getAvailableSystems() {
        return [...AVAILABLE_SYSTEMS];
    }

    /**
     * Returns geometry name for a given index.
     * @param {number} index - Geometry index (0-23)
     * @returns {string} Human-readable geometry name
     */
    static getGeometryName(index) {
        const coreIndex = Math.floor(index / 8);
        const baseIndex = index % 8;
        const coreName = CORE_TYPES[coreIndex] || 'Unknown';
        const baseName = BASE_GEOMETRIES[baseIndex] || 'Unknown';
        return coreIndex === 0 ? baseName : `${coreName} (${baseName})`;
    }
}
