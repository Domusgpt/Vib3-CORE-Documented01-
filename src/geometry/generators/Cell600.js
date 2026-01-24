/**
 * Cell600 - 600-Cell (Hexacosichoron) Geometry Generator
 *
 * The 600-cell is a regular 4D polytope with extraordinary complexity:
 * - 120 vertices
 * - 720 edges
 * - 1200 triangular faces
 * - 600 tetrahedral cells
 *
 * The key insight for epitaxial construction:
 * The 120 vertices can be partitioned into 5 DISJOINT sets of 24 vertices.
 * Each set forms a complete 24-cell (icositetrachoron).
 * These 5 24-cells are related by golden ratio rotations.
 *
 * This module implements "Epitaxial Growth" - assembling the 600-cell
 * layer by layer from its constituent 24-cells, enabling the
 * Hexastack architecture required by the Holographic Hyper-Computer.
 *
 * @module geometry/generators/Cell600
 */

import { Vec4 } from '../../math/Vec4.js';
import { Rotor4D } from '../../math/Rotor4D.js';
import {
    generate24CellVertices,
    get24CellTrilaticDecomposition,
    generate24CellEdges,
    generate600CellOffsetRotations
} from './Cell24.js';

/**
 * Golden ratio constants
 */
const PHI = (1 + Math.sqrt(5)) / 2;      // ≈ 1.618033988749895
const PHI_INV = 1 / PHI;                 // ≈ 0.618033988749895
const PHI_SQ = PHI * PHI;                // ≈ 2.618033988749895

/**
 * Generate all 120 vertices of the 600-cell directly
 *
 * The 600-cell vertices consist of 4 types (total 120):
 * - 8 vertices: permutations of (±2, 0, 0, 0)
 * - 16 vertices: (±1, ±1, ±1, ±1)
 * - 96 vertices: even permutations of (±φ, ±1, ±1/φ, 0)
 *
 * where φ = golden ratio ≈ 1.618
 *
 * @param {number} scale - Overall scale (default 1 gives circumradius ≈ 2)
 * @returns {Vec4[]} Array of 120 vertices
 */
export function generate600CellVerticesDirect(scale = 1) {
    const vertices = [];
    const s = scale * 0.5; // Normalize to reasonable size

    // Type 1: 8 vertices - permutations of (±2, 0, 0, 0)
    for (let axis = 0; axis < 4; axis++) {
        for (const sign of [-1, 1]) {
            const coords = [0, 0, 0, 0];
            coords[axis] = sign * 2 * s;
            vertices.push(new Vec4(coords[0], coords[1], coords[2], coords[3]));
        }
    }

    // Type 2: 16 vertices - (±1, ±1, ±1, ±1)
    for (let i = 0; i < 16; i++) {
        vertices.push(new Vec4(
            ((i & 1) ? -1 : 1) * s,
            ((i & 2) ? -1 : 1) * s,
            ((i & 4) ? -1 : 1) * s,
            ((i & 8) ? -1 : 1) * s
        ));
    }

    // Type 3: 96 vertices - even permutations of (±φ, ±1, ±1/φ, 0)
    const base = [PHI, 1, PHI_INV, 0];

    // Even permutations of 4 elements (there are 12)
    const evenPerms = [
        [0, 1, 2, 3], [0, 2, 3, 1], [0, 3, 1, 2],
        [1, 0, 3, 2], [1, 2, 0, 3], [1, 3, 2, 0],
        [2, 0, 1, 3], [2, 1, 3, 0], [2, 3, 0, 1],
        [3, 0, 2, 1], [3, 1, 0, 2], [3, 2, 1, 0]
    ];

    for (const perm of evenPerms) {
        // For each permutation, apply all sign combinations (8 total)
        // but only to the non-zero components
        for (let signs = 0; signs < 8; signs++) {
            const coords = [
                base[perm[0]] * (signs & 1 ? -1 : 1),
                base[perm[1]] * (signs & 2 ? -1 : 1),
                base[perm[2]] * (signs & 4 ? -1 : 1),
                base[perm[3]] // The 0 component stays 0
            ];
            vertices.push(new Vec4(
                coords[0] * s,
                coords[1] * s,
                coords[2] * s,
                coords[3] * s
            ));
        }
    }

    return vertices;
}

/**
 * Generate 600-cell via Epitaxial Assembly from 5 disjoint 24-cells
 *
 * This is the core method for the Kirigami Engine.
 * Instead of generating all 120 vertices at once, we construct
 * the 600-cell as 5 "layers" - each layer being a complete 24-cell.
 *
 * The layers are related by rotations involving the golden ratio φ.
 *
 * @param {number} scale - Overall scale factor
 * @returns {Object} Epitaxial geometry with 5 layer 24-cells
 */
export function generate600CellEpitaxial(scale = 1) {
    const layers = [];
    const rotations = generate600CellOffsetRotations();

    // Base 24-cell
    const base24Cell = generate24CellVertices(scale);

    for (let i = 0; i < 5; i++) {
        const rotation = rotations[i];
        let layerVertices;

        if (i === 0) {
            // Layer 0 is the base (identity rotation)
            layerVertices = base24Cell.map(v => v.clone());
        } else {
            // Apply the golden ratio rotation to get subsequent layers
            const rotor = createRotorFromGoldenRotation(i, scale);
            layerVertices = base24Cell.map(v => rotor.rotate(v));
        }

        layers.push({
            index: i,
            name: rotation.name,
            vertices: layerVertices,
            vertexCount: 24,
            rotation: rotation,
            trilatic: get24CellTrilaticDecomposition(scale)
        });
    }

    // Collect all vertices for edge/face generation
    const allVertices = [];
    for (const layer of layers) {
        allVertices.push(...layer.vertices);
    }

    // Generate edges (vertices at distance = scale * edge_length_factor)
    const edges = generate600CellEdges(allVertices, scale);

    return {
        name: '600-cell (Epitaxial)',
        type: 'hexacosichoron',
        layers,
        layerCount: 5,
        allVertices,
        edges,
        totalVertexCount: 120,
        edgeCount: edges.length,
        faceCount: 1200,
        cellCount: 600,

        // Symmetry information
        symmetryGroup: 'H4',
        symmetryOrder: 14400,

        // Golden ratio connection
        goldenRatio: PHI,

        // Metric properties
        circumradius: scale * 2,
        edgeLength: scale * 2 / PHI,

        // Methods for layer access
        getLayer: (index) => layers[index % 5],
        getLayerVertices: (index) => layers[index % 5].vertices,
    };
}

/**
 * Create a Rotor4D from the golden ratio rotation for layer i
 *
 * The 5 layers of a 600-cell are related by rotations of 72° (2π/5)
 * in a plane involving the golden ratio.
 *
 * @param {number} layerIndex - Which layer (1-4, layer 0 is identity)
 * @param {number} scale - Scale factor
 * @returns {Rotor4D} The rotation rotor
 */
function createRotorFromGoldenRotation(layerIndex, scale = 1) {
    // Each layer is rotated by (layerIndex * 72°) = (layerIndex * 2π/5)
    // in the XW plane primarily, with golden ratio mixing into YZ

    const angle = (layerIndex * 2 * Math.PI) / 5;

    // Create compound rotation using golden ratio coordinates
    // This creates the icosahedral symmetry pattern
    const rotor = Rotor4D.fromEuler6({
        xy: 0,
        xz: 0,
        yz: angle * PHI_INV,
        xw: angle,
        yw: angle * PHI_INV,
        zw: 0
    });

    return rotor;
}

/**
 * Generate edges of the 600-cell
 * The 600-cell has 720 edges
 *
 * @param {Vec4[]} vertices - All 120 vertices
 * @param {number} scale - Scale factor
 * @returns {number[][]} Array of [i, j] edge index pairs
 */
export function generate600CellEdges(vertices, scale = 1) {
    const edges = [];
    const edgeLength = scale * 2 / PHI; // 600-cell edge length
    const tolerance = scale * 0.05;

    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            const dist = vertices[i].distanceTo(vertices[j]);
            if (Math.abs(dist - edgeLength) < tolerance) {
                edges.push([i, j]);
            }
        }
    }

    return edges;
}

/**
 * Get the layer index for a given vertex index in the epitaxial assembly
 *
 * @param {number} vertexIndex - Index into allVertices array
 * @returns {number} Layer index (0-4)
 */
export function getVertexLayerIndex(vertexIndex) {
    return Math.floor(vertexIndex / 24);
}

/**
 * Generate the 600-cell with full topology information
 *
 * @param {number} scale - Scale factor
 * @param {Object} options - Options
 * @returns {Object} Complete 600-cell geometry
 */
export function generate600Cell(scale = 1, options = {}) {
    const {
        epitaxial = true,
        includeFaces = false,
        includeCells = false
    } = options;

    if (epitaxial) {
        return generate600CellEpitaxial(scale);
    }

    // Non-epitaxial: direct generation
    const vertices = generate600CellVerticesDirect(scale);
    const edges = generate600CellEdges(vertices, scale);

    const geometry = {
        name: '600-cell',
        type: 'hexacosichoron',
        vertices,
        edges,
        vertexCount: 120,
        edgeCount: 720,
        faceCount: 1200,
        cellCount: 600,

        symmetryGroup: 'H4',
        symmetryOrder: 14400,
        goldenRatio: PHI,

        circumradius: scale * 2,
        edgeLength: scale * 2 / PHI,
    };

    if (includeFaces) {
        geometry.faces = generate600CellFaces(vertices, edges, scale);
    }

    if (includeCells) {
        geometry.cells = generate600CellCells(vertices, scale);
    }

    return geometry;
}

/**
 * Generate triangular faces of the 600-cell
 * The 600-cell has 1200 triangular faces
 *
 * @param {Vec4[]} vertices - All 120 vertices
 * @param {number[][]} edges - The 720 edges
 * @param {number} scale - Scale factor
 * @returns {number[][]} Array of [i, j, k] face index triples
 */
export function generate600CellFaces(vertices, edges, scale = 1) {
    // Build adjacency map
    const adjacency = new Map();
    for (const [i, j] of edges) {
        if (!adjacency.has(i)) adjacency.set(i, new Set());
        if (!adjacency.has(j)) adjacency.set(j, new Set());
        adjacency.get(i).add(j);
        adjacency.get(j).add(i);
    }

    const faces = [];
    const faceSet = new Set();

    // Find all triangles
    for (const [i, j] of edges) {
        const neighborsI = adjacency.get(i);
        const neighborsJ = adjacency.get(j);

        for (const k of neighborsI) {
            if (k > j && neighborsJ.has(k)) {
                const sorted = [i, j, k].sort((a, b) => a - b);
                const key = sorted.join(',');

                if (!faceSet.has(key)) {
                    faceSet.add(key);
                    faces.push(sorted);
                }
            }
        }
    }

    return faces;
}

/**
 * Generate tetrahedral cells of the 600-cell
 * The 600-cell has 600 tetrahedral cells
 *
 * @param {Vec4[]} vertices - All 120 vertices
 * @param {number} scale - Scale factor
 * @returns {number[][]} Array of 4-vertex index arrays (tetrahedra)
 */
export function generate600CellCells(vertices, scale = 1) {
    const edges = generate600CellEdges(vertices, scale);
    const edgeLength = scale * 2 / PHI;

    // Build adjacency map
    const adjacency = new Map();
    for (const [i, j] of edges) {
        if (!adjacency.has(i)) adjacency.set(i, new Set());
        if (!adjacency.has(j)) adjacency.set(j, new Set());
        adjacency.get(i).add(j);
        adjacency.get(j).add(i);
    }

    const cells = [];
    const cellSet = new Set();

    // Find all tetrahedra (complete K4 subgraphs)
    for (const [i, j] of edges) {
        const neighborsI = adjacency.get(i);
        const neighborsJ = adjacency.get(j);

        // Find vertices connected to both i and j
        const common = [...neighborsI].filter(v => neighborsJ.has(v));

        // Check pairs of common vertices
        for (let a = 0; a < common.length; a++) {
            for (let b = a + 1; b < common.length; b++) {
                const k = common[a];
                const l = common[b];

                // Check if k and l are also connected
                if (adjacency.get(k).has(l)) {
                    const sorted = [i, j, k, l].sort((a, b) => a - b);
                    const key = sorted.join(',');

                    if (!cellSet.has(key)) {
                        cellSet.add(key);
                        cells.push(sorted);
                    }
                }
            }
        }
    }

    return cells;
}

/**
 * Color scheme for the 6-layer Hexastack (5 structural + 1 pilot)
 * Based on the HHC specification's "Arithmetic of Light" topology
 */
export const HEXASTACK_COLORS = {
    // Structural layers (from 5 24-cells)
    0: { primary: [0, 0, 0], secondary: [255, 255, 255], name: 'Black/White (Luma Anchor)' },
    1: { primary: [255, 255, 255], secondary: [0, 0, 0], name: 'White/Black (Inverse Anchor)' },
    2: { primary: [255, 0, 255], secondary: [0, 255, 255], name: 'Magenta/Cyan (Dialectic)' },
    3: { primary: [0, 255, 255], secondary: [255, 0, 255], name: 'Cyan/Magenta (Counter-Dialectic)' },
    4: { primary: [138, 43, 226], secondary: [255, 215, 0], name: 'Violet/Gold (Harmonic)' },
    // Pilot layer (integrator/ghost)
    5: { primary: [255, 215, 0], secondary: [138, 43, 226], name: 'Gold/Violet (Pilot)' }
};

/**
 * Get layer color information
 *
 * @param {number} layerIndex - Layer index (0-5)
 * @param {boolean} secondary - Return secondary color instead of primary
 * @returns {number[]} RGB array [r, g, b]
 */
export function getLayerColor(layerIndex, secondary = false) {
    const layer = HEXASTACK_COLORS[layerIndex % 6];
    return secondary ? layer.secondary : layer.primary;
}

export default generate600Cell;
