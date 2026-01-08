function clampDenominator(denominator, epsilon) {
    if (Math.abs(denominator) < epsilon) {
        return denominator >= 0 ? epsilon : -epsilon;
    }
    return denominator;
}

export function stereographicProject4D(vector, options = {}) {
    const epsilon = options.epsilon ?? 1e-5;
    const [x, y, z, w] = vector;
    const denom = clampDenominator(1 - w, epsilon);
    return {
        x: x / denom,
        y: y / denom,
        z: z / denom,
        denom,
    };
}

export function perspectiveProject4D(vector, options = {}) {
    const epsilon = options.epsilon ?? 1e-5;
    const distance = options.distance ?? 2;
    const [x, y, z, w] = vector;
    const denom = clampDenominator(distance - w, epsilon);
    return {
        x: x / denom,
        y: y / denom,
        z: z / denom,
        denom,
    };
}
