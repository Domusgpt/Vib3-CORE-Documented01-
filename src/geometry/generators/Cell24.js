/**
 * Cell24 - 24-Cell (Icositetrachoron) Geometry Generator
 *
 * The 24-cell is a unique self-dual regular 4D polytope with no 3D analogue.
 * It has 24 vertices, 96 edges, 96 triangular faces, and 24 octahedral cells.
 *
 * Key Features:
 * - Trilatic decomposition: Vertices partition into three disjoint 16-cells (Alpha/Beta/Gamma)
 * - F4 symmetry group (1152 elements)
 * - Self-dual: Its dual is another 24-cell
 *
 * This is the fundamental building block for the 600-cell epitaxial assembly.
 *
 * @module geometry/generators/Cell24
 */

import { Vec4 } from '../../math/Vec4.js';

/**
 * Golden ratio constant used for 600-cell assembly
 */
const PHI = (1 + Math.sqrt(5)) / 2;  // ≈ 1.618033988749895
const PHI_INV = 1 / PHI;             // ≈ 0.618033988749895

/**
 * Generate the 24 vertices of a 24-cell
 *
 * The 24-cell vertices consist of:
 * - 8 vertices from permutations of (±1, 0, 0, 0) - forms first 16-cell (Alpha)
 * - 16 vertices from (±1/2, ±1/2, ±1/2, ±1/2) with even sign count - forms two more 16-cells (Beta/Gamma)
 *
 * @param {number} size - Scale factor for the polytope
 * @returns {Vec4[]} Array of 24 vertices
 */
export function generate24CellVertices(size = 1) {
    const vertices = [];
    const s = size;
    const h = size * 0.5 * Math.sqrt(2); // Half-diagonal scaling for tesseract vertices

    // Type A: 8 vertices - permutations of (±1, 0, 0, 0)
    // These form the first 16-cell (cross-polytope)
    for (let axis = 0; axis < 4; axis++) {
        for (const sign of [-1, 1]) {
            const coords = [0, 0, 0, 0];
            coords[axis] = sign * s;
            vertices.push(new Vec4(coords[0], coords[1], coords[2], coords[3]));
        }
    }

    // Type B: 16 vertices - (±h, ±h, ±h, ±h) with EVEN number of minus signs
    // These form two interpenetrating 16-cells
    for (let i = 0; i < 16; i++) {
        // i encodes the sign pattern (bit 0 = x, bit 1 = y, bit 2 = z, bit 3 = w)
        const signs = [
            (i & 1) ? -1 : 1,
            (i & 2) ? -1 : 1,
            (i & 4) ? -1 : 1,
            (i & 8) ? -1 : 1
        ];

        // Count negative signs
        const negCount = signs.filter(s => s < 0).length;

        // Only include vertices with even number of minus signs
        if (negCount % 2 === 0) {
            vertices.push(new Vec4(
                signs[0] * h,
                signs[1] * h,
                signs[2] * h,
                signs[3] * h
            ));
        }
    }

    return vertices;
}

/**
 * Trilatic Decomposition - Partition 24-cell vertices into three disjoint 16-cells
 *
 * This is the "Computational Focus" system mentioned in the HHC specification.
 * - Alpha (α): The 8 axial vertices (permutations of ±1, 0, 0, 0)
 * - Beta (β): 8 vertices from tesseract with specific sign patterns
 * - Gamma (γ): The remaining 8 tesseract vertices
 *
 * Each subset forms a complete 16-cell (cross-polytope).
 * Used for: Alpha=Read, Beta=Write, Gamma=Execute in HHC paradigm.
 *
 * @param {number} size - Scale factor
 * @returns {Object} {alpha: Vec4[], beta: Vec4[], gamma: Vec4[]}
 */
export function get24CellTrilaticDecomposition(size = 1) {
    const s = size;
    const h = size * 0.5 * Math.sqrt(2);

    const alpha = [];  // Axial vertices - 16-cell #1
    const beta = [];   // Tesseract subset A - 16-cell #2
    const gamma = [];  // Tesseract subset B - 16-cell #3

    // Alpha: The 8 axial vertices (permutations of ±s, 0, 0, 0)
    for (let axis = 0; axis < 4; axis++) {
        for (const sign of [-1, 1]) {
            const coords = [0, 0, 0, 0];
            coords[axis] = sign * s;
            alpha.push(new Vec4(coords[0], coords[1], coords[2], coords[3]));
        }
    }

    // Beta and Gamma: Split the 16 tesseract vertices
    // Beta: Vertices where (x*y*z*w) > 0 (positive product)
    // Gamma: Vertices where (x*y*z*w) < 0 (negative product)
    for (let i = 0; i < 16; i++) {
        const signs = [
            (i & 1) ? -1 : 1,
            (i & 2) ? -1 : 1,
            (i & 4) ? -1 : 1,
            (i & 8) ? -1 : 1
        ];

        const negCount = signs.filter(s => s < 0).length;

        // Only consider vertices with even negative count (part of 24-cell)
        if (negCount % 2 === 0) {
            const v = new Vec4(
                signs[0] * h,
                signs[1] * h,
                signs[2] * h,
                signs[3] * h
            );

            // Product of signs determines Beta vs Gamma
            const signProduct = signs[0] * signs[1] * signs[2] * signs[3];

            if (signProduct > 0) {
                beta.push(v);
            } else {
                gamma.push(v);
            }
        }
    }

    return { alpha, beta, gamma };
}

/**
 * Generate edges of the 24-cell
 * The 24-cell has 96 edges, each connecting vertices at distance 1 (when circumradius = 1)
 *
 * @param {Vec4[]} vertices - The 24 vertices (optional, will generate if not provided)
 * @param {number} size - Scale factor (only used if vertices not provided)
 * @returns {number[][]} Array of [i, j] edge index pairs
 */
export function generate24CellEdges(vertices = null, size = 1) {
    if (!vertices) {
        vertices = generate24CellVertices(size);
    }

    const edges = [];
    // Edge length for unit 24-cell (circumradius 1)
    const expectedEdgeLength = size;
    const tolerance = size * 0.01;

    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            const dist = vertices[i].distanceTo(vertices[j]);
            if (Math.abs(dist - expectedEdgeLength) < tolerance) {
                edges.push([i, j]);
            }
        }
    }

    return edges;
}

/**
 * Generate faces of the 24-cell
 * The 24-cell has 96 triangular faces
 *
 * @param {Vec4[]} vertices - The 24 vertices
 * @param {number[][]} edges - The 96 edges (optional)
 * @param {number} size - Scale factor
 * @returns {number[][]} Array of [i, j, k] face index triples
 */
export function generate24CellFaces(vertices = null, edges = null, size = 1) {
    if (!vertices) {
        vertices = generate24CellVertices(size);
    }
    if (!edges) {
        edges = generate24CellEdges(vertices, size);
    }

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

    // Find all triangles by looking for common neighbors
    for (const [i, j] of edges) {
        const neighborsI = adjacency.get(i);
        const neighborsJ = adjacency.get(j);

        // Find vertices connected to both i and j
        for (const k of neighborsI) {
            if (k > j && neighborsJ.has(k)) {
                // Sort indices to avoid duplicates
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
 * Generate octahedral cells of the 24-cell
 * The 24-cell has 24 octahedral cells (3D facets)
 *
 * @param {Vec4[]} vertices - The 24 vertices
 * @param {number} size - Scale factor
 * @returns {number[][]} Array of 6-vertex index arrays (octahedra)
 */
export function generate24CellCells(vertices = null, size = 1) {
    if (!vertices) {
        vertices = generate24CellVertices(size);
    }

    // Each cell center is at distance √2/2 from the center
    // Cell centers are the 24 vertices of the dual 24-cell
    const cells = [];

    // For a 24-cell centered at origin, each vertex is also the center
    // of an octahedral cell in the dual. We find cells by looking for
    // vertices that are exactly 1 unit apart (sharing an edge)

    const edges = generate24CellEdges(vertices, size);
    const adjacency = new Map();

    for (const [i, j] of edges) {
        if (!adjacency.has(i)) adjacency.set(i, new Set());
        if (!adjacency.has(j)) adjacency.set(j, new Set());
        adjacency.get(i).add(j);
        adjacency.get(j).add(i);
    }

    // Each vertex belongs to 6 octahedral cells
    // Find cells by looking for cliques of 6 vertices forming octahedra
    const cellSet = new Set();

    for (let center = 0; center < vertices.length; center++) {
        // The 8 neighbors of a vertex in a 24-cell form an octahedron
        const neighbors = Array.from(adjacency.get(center) || []);

        if (neighbors.length === 8) {
            const sorted = neighbors.sort((a, b) => a - b);
            const key = sorted.join(',');

            if (!cellSet.has(key)) {
                cellSet.add(key);
                cells.push(sorted);
            }
        }
    }

    return cells;
}

/**
 * Generate the complete 24-cell geometry
 *
 * @param {number} scale - Overall scale factor
 * @param {Object} options - Additional options
 * @param {boolean} options.includeTrilaticDecomposition - Include Alpha/Beta/Gamma subsets
 * @param {boolean} options.includeFaces - Include triangular faces
 * @param {boolean} options.includeCells - Include octahedral cells
 * @returns {Object} Complete geometry object
 */
export function generate24Cell(scale = 1, options = {}) {
    const {
        includeTrilaticDecomposition = true,
        includeFaces = true,
        includeCells = false
    } = options;

    const vertices = generate24CellVertices(scale);
    const edges = generate24CellEdges(vertices, scale);

    const geometry = {
        name: '24-cell',
        type: 'icositetrachoron',
        vertices,
        edges,
        vertexCount: 24,
        edgeCount: 96,
        faceCount: 96,
        cellCount: 24,

        // Symmetry information
        symmetryGroup: 'F4',
        symmetryOrder: 1152,
        selfDual: true,

        // Metric properties (for unit circumradius)
        circumradius: scale,
        edgeLength: scale,

        // Dihedral angle between adjacent octahedral cells
        dihedralAngle: Math.acos(-1/3), // ≈ 109.47°
    };

    if (includeTrilaticDecomposition) {
        geometry.trilatic = get24CellTrilaticDecomposition(scale);
    }

    if (includeFaces) {
        geometry.faces = generate24CellFaces(vertices, edges, scale);
    }

    if (includeCells) {
        geometry.cells = generate24CellCells(vertices, scale);
    }

    return geometry;
}

/**
 * Generate rotation quaternions for 600-cell epitaxial assembly
 *
 * The 600-cell can be partitioned into 5 disjoint 24-cells.
 * These 5 are related by rotations from the Binary Icosahedral Group (2I).
 * The rotations involve the golden ratio φ.
 *
 * @returns {Object[]} Array of 5 rotation specifications
 */
export function generate600CellOffsetRotations() {
    // The 5 disjoint 24-cells in a 600-cell are related by rotations
    // corresponding to the vertices of an icosahedron in rotation space

    const rotations = [
        // Identity - base 24-cell
        {
            index: 0,
            name: 'Base',
            quaternion: { w: 1, x: 0, y: 0, z: 0 },
            bivectorAngles: { xy: 0, xz: 0, yz: 0, xw: 0, yw: 0, zw: 0 }
        },
        // 72° rotation around icosahedral axis
        {
            index: 1,
            name: 'Phi-1',
            quaternion: {
                w: PHI / 2,
                x: 0.5,
                y: PHI_INV / 2,
                z: 0
            },
            bivectorAngles: { xy: 0, xz: 0, yz: 0, xw: 2 * Math.PI / 5, yw: 0, zw: 0 }
        },
        // 144° rotation
        {
            index: 2,
            name: 'Phi-2',
            quaternion: {
                w: PHI_INV / 2,
                x: 0.5,
                y: -PHI / 2,
                z: 0
            },
            bivectorAngles: { xy: 0, xz: 0, yz: 0, xw: 4 * Math.PI / 5, yw: 0, zw: 0 }
        },
        // 216° rotation
        {
            index: 3,
            name: 'Phi-3',
            quaternion: {
                w: -PHI_INV / 2,
                x: 0.5,
                y: PHI / 2,
                z: 0
            },
            bivectorAngles: { xy: 0, xz: 0, yz: 0, xw: 6 * Math.PI / 5, yw: 0, zw: 0 }
        },
        // 288° rotation
        {
            index: 4,
            name: 'Phi-4',
            quaternion: {
                w: -PHI / 2,
                x: 0.5,
                y: -PHI_INV / 2,
                z: 0
            },
            bivectorAngles: { xy: 0, xz: 0, yz: 0, xw: 8 * Math.PI / 5, yw: 0, zw: 0 }
        }
    ];

    // Normalize quaternions
    for (const rot of rotations) {
        const q = rot.quaternion;
        const len = Math.sqrt(q.w*q.w + q.x*q.x + q.y*q.y + q.z*q.z);
        q.w /= len;
        q.x /= len;
        q.y /= len;
        q.z /= len;
    }

    return rotations;
}

/**
 * Apply a quaternion rotation to a Vec4
 * Uses the sandwich product: v' = q * v * q†
 *
 * @param {Vec4} v - The 4D vector to rotate
 * @param {Object} q - Quaternion {w, x, y, z}
 * @returns {Vec4} Rotated vector
 */
export function applyQuaternionToVec4(v, q) {
    // For 4D, we treat the quaternion as operating on the xyz subspace
    // and leave w relatively unaffected (simple rotation)
    // For full 4D rotation, use Rotor4D instead

    const { w: qw, x: qx, y: qy, z: qz } = q;
    const { x: vx, y: vy, z: vz, w: vw } = v;

    // Quaternion rotation of 3D subspace
    // This is a simplified approach; for full isoclinic rotation use Rotor4D

    // q * v (quaternion * vector treated as imaginary quaternion)
    const tw = -qx * vx - qy * vy - qz * vz;
    const tx = qw * vx + qy * vz - qz * vy;
    const ty = qw * vy + qz * vx - qx * vz;
    const tz = qw * vz + qx * vy - qy * vx;

    // result * q† (conjugate)
    const rx = -tw * qx + tx * qw - ty * qz + tz * qy;
    const ry = -tw * qy + ty * qw - tz * qx + tx * qz;
    const rz = -tw * qz + tz * qw - tx * qy + ty * qx;

    return new Vec4(rx, ry, rz, vw);
}

export default generate24Cell;
