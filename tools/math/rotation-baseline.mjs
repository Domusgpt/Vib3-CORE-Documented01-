import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Projection } from '../../src/math/Projection.js';
import { Rotor4D } from '../../src/math/Rotor4D.js';
import { Vec4 } from '../../src/math/Vec4.js';

const iterations = 4000;
const renormInterval = 25;
const step = Rotor4D.fromEuler6({ xy: 0.003, xw: 0.002, zw: -0.001 });

let rotorNoRenorm = Rotor4D.identity();
let rotorRenorm = Rotor4D.identity();

for (let i = 1; i <= iterations; i += 1) {
    rotorNoRenorm = rotorNoRenorm.multiply(step);
    rotorRenorm = rotorRenorm.multiply(step);
    if (i % renormInterval === 0) {
        rotorRenorm.normalizeInPlace();
    }
}

const driftNoRenorm = Math.abs(rotorNoRenorm.norm() - 1);
const driftRenorm = Math.abs(rotorRenorm.norm() - 1);

let vector = new Vec4(0.2, -0.7, 1.1, 0.4);
const baselineLength = vector.length();
const stepRotor = Rotor4D.fromPlaneAngle('XW', 0.01);

for (let i = 1; i <= 2000; i += 1) {
    vector = stepRotor.rotate(vector);
}

const vectorLengthDrift = Math.abs(vector.length() - baselineLength);

const perspectiveSample = Projection.perspective(new Vec4(1, 1, 1, 2), 2, { epsilon: 1e-4 });
const stereographicSample = Projection.stereographic(new Vec4(1, 0, 0, 1), { epsilon: 1e-4 });

const output = {
    generated_at: new Date().toISOString(),
    rotor_precision: {
        iterations,
        renorm_interval: renormInterval,
        drift_without_renorm: driftNoRenorm,
        drift_with_renorm: driftRenorm,
        vector_length_drift: vectorLengthDrift,
    },
    projection_clamp: {
        epsilon: 1e-4,
        perspective_sample: {
            x: perspectiveSample.x,
            y: perspectiveSample.y,
            z: perspectiveSample.z,
        },
        stereographic_sample: {
            x: stereographicSample.x,
            y: stereographicSample.y,
            z: stereographicSample.z,
        },
    },
};

const outputPath = resolve('docs/src/math/rotation-baseline.json');
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
