export const ROTATION_PLANES = ['XY', 'XZ', 'YZ', 'XW', 'YW', 'ZW'];

export function normalizeRotationAngles(angles = {}) {
    return {
        XY: angles.XY ?? angles.xy ?? 0,
        XZ: angles.XZ ?? angles.xz ?? 0,
        YZ: angles.YZ ?? angles.yz ?? 0,
        XW: angles.XW ?? angles.xw ?? 0,
        YW: angles.YW ?? angles.yw ?? 0,
        ZW: angles.ZW ?? angles.zw ?? 0,
    };
}

export function identityMatrix4x4() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}

export function transposeMatrix4x4(matrix) {
    return [
        matrix[0], matrix[4], matrix[8], matrix[12],
        matrix[1], matrix[5], matrix[9], matrix[13],
        matrix[2], matrix[6], matrix[10], matrix[14],
        matrix[3], matrix[7], matrix[11], matrix[15],
    ];
}

export function multiplyMatrix4x4(a, b) {
    const out = new Array(16).fill(0);
    for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
            for (let idx = 0; idx < 4; idx += 1) {
                out[row * 4 + col] += a[row * 4 + idx] * b[idx * 4 + col];
            }
        }
    }
    return out;
}

export function applyMatrix4x4(matrix, vector) {
    const [x, y, z, w] = vector;
    return [
        matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[3] * w,
        matrix[4] * x + matrix[5] * y + matrix[6] * z + matrix[7] * w,
        matrix[8] * x + matrix[9] * y + matrix[10] * z + matrix[11] * w,
        matrix[12] * x + matrix[13] * y + matrix[14] * z + matrix[15] * w,
    ];
}

export function createRotationMatrix4D(plane, angle) {
    if (!ROTATION_PLANES.includes(plane)) {
        throw new Error(`Unknown rotation plane: ${plane}`);
    }

    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const matrix = identityMatrix4x4();

    switch (plane) {
        case 'XY':
            matrix[0] = c;
            matrix[1] = -s;
            matrix[4] = s;
            matrix[5] = c;
            break;
        case 'XZ':
            matrix[0] = c;
            matrix[2] = -s;
            matrix[8] = s;
            matrix[10] = c;
            break;
        case 'YZ':
            matrix[5] = c;
            matrix[6] = -s;
            matrix[9] = s;
            matrix[10] = c;
            break;
        case 'XW':
            matrix[0] = c;
            matrix[3] = -s;
            matrix[12] = s;
            matrix[15] = c;
            break;
        case 'YW':
            matrix[5] = c;
            matrix[7] = -s;
            matrix[13] = s;
            matrix[15] = c;
            break;
        case 'ZW':
            matrix[10] = c;
            matrix[11] = -s;
            matrix[14] = s;
            matrix[15] = c;
            break;
        default:
            break;
    }

    return matrix;
}

export function composeRotationMatrices(steps = []) {
    return steps.reduce(
        (matrix, step) => multiplyMatrix4x4(matrix, createRotationMatrix4D(step.plane, step.angle)),
        identityMatrix4x4()
    );
}

export function createRotationMatricesFromAngles(angles = {}) {
    const normalized = normalizeRotationAngles(angles);
    const matrices = {};

    ROTATION_PLANES.forEach((plane) => {
        matrices[plane] = createRotationMatrix4D(plane, normalized[plane]);
    });

    return matrices;
}

export function composeRotationMatrixFromAngles(angles = {}, order = ROTATION_PLANES) {
    const normalized = normalizeRotationAngles(angles);
    return order.reduce((matrix, plane) => {
        const angle = normalized[plane];
        if (!angle) {
            return matrix;
        }
        return multiplyMatrix4x4(matrix, createRotationMatrix4D(plane, angle));
    }, identityMatrix4x4());
}

export function vectorLength4D(vector) {
    return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

export function normalizeVector4D(vector) {
    const length = vectorLength4D(vector) || 1;
    return vector.map((value) => value / length);
}
