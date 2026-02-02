/**
 * VIB3+ Engine Stories
 * Demonstrates the three visualization systems and geometry variants.
 */

const SYSTEMS = ['quantum', 'faceted', 'holographic'];
const GEOMETRIES = [
    'Tetrahedron', 'Hypercube', 'Sphere', 'Torus',
    'Klein Bottle', 'Fractal', 'Wave', 'Crystal'
];

function createCanvas(args) {
    const container = document.createElement('div');
    container.style.cssText = 'width:100%;height:480px;background:#07070f;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#555;font-family:monospace;font-size:14px;';
    container.textContent = `[VIB3+ ${args.system} — geometry ${args.geometry} — hue ${args.hue}]`;
    return container;
}

export default {
    title: 'VIB3+/Engine',
    argTypes: {
        system: {
            control: 'select',
            options: SYSTEMS,
            description: 'Visualization system',
        },
        geometry: {
            control: { type: 'range', min: 0, max: 23, step: 1 },
            description: 'Geometry index (core * 8 + base)',
        },
        hue: {
            control: { type: 'range', min: 0, max: 360, step: 1 },
            description: 'Color hue (degrees)',
        },
        speed: {
            control: { type: 'range', min: 0.1, max: 3, step: 0.1 },
            description: 'Animation speed',
        },
        chaos: {
            control: { type: 'range', min: 0, max: 1, step: 0.05 },
            description: 'Randomness / turbulence',
        },
    },
    args: {
        system: 'quantum',
        geometry: 0,
        hue: 200,
        speed: 1.0,
        chaos: 0.2,
    },
};

export const Default = {
    render: (args) => createCanvas(args),
};

export const Quantum = {
    args: { system: 'quantum', geometry: 10, hue: 200 },
    render: (args) => createCanvas(args),
};

export const Faceted = {
    args: { system: 'faceted', geometry: 1, hue: 120 },
    render: (args) => createCanvas(args),
};

export const Holographic = {
    args: { system: 'holographic', geometry: 16, hue: 300 },
    render: (args) => createCanvas(args),
};
