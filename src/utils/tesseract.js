const TESSERACT_VERTICES = [
  [-1, -1, -1, -1], [1, -1, -1, -1], [-1, 1, -1, -1], [1, 1, -1, -1],
  [-1, -1, 1, -1], [1, -1, 1, -1], [-1, 1, 1, -1], [1, 1, 1, -1],
  [-1, -1, -1, 1], [1, -1, -1, 1], [-1, 1, -1, 1], [1, 1, -1, 1],
  [-1, -1, 1, 1], [1, -1, 1, 1], [-1, 1, 1, 1], [1, 1, 1, 1]
];

const TESSERACT_EDGES = (() => {
  const edges = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      let diff = 0;
      for (let k = 0; k < 4; k++) {
        if (TESSERACT_VERTICES[i][k] !== TESSERACT_VERTICES[j][k]) diff += 1;
      }
      if (diff === 1) edges.push([i, j]);
    }
  }
  return edges;
})();

function multiply4D(vec, rot) {
  const [x, y, z, w] = vec;
  const out = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    out[i] = rot[i * 4 + 0] * x + rot[i * 4 + 1] * y + rot[i * 4 + 2] * z + rot[i * 4 + 3] * w;
  }
  return out;
}

function rotation4D(ax, ay, az) {
  const cx = Math.cos(ax), sx = Math.sin(ax);
  const cy = Math.cos(ay), sy = Math.sin(ay);
  const cz = Math.cos(az), sz = Math.sin(az);

  const rotXY = [
    cx, -sx, 0, 0,
    sx, cx, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];

  const rotZW = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, cz, -sz,
    0, 0, sz, cz
  ];

  const rotXW = [
    cy, 0, 0, -sy,
    0, 1, 0, 0,
    0, 0, 1, 0,
    sy, 0, 0, cy
  ];

  const temp = new Array(16);
  const out = new Array(16);

  // temp = rotZW * rotXY
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      temp[i * 4 + j] = 0;
      for (let k = 0; k < 4; k++) {
        temp[i * 4 + j] += rotZW[i * 4 + k] * rotXY[k * 4 + j];
      }
    }
  }

  // out = rotXW * temp
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[i * 4 + j] = 0;
      for (let k = 0; k < 4; k++) {
        out[i * 4 + j] += rotXW[i * 4 + k] * temp[k * 4 + j];
      }
    }
  }

  return out;
}

function projectTo3D([x, y, z, w], distance = 2.8) {
  const denom = distance - w;
  const scale = denom !== 0 ? distance / denom : 1.0;
  return [x * scale, y * scale, z * scale];
}

export function buildTesseractLines(time, energy) {
  const t = time * 0.7 + energy * 0.8;
  const rot = rotation4D(t * 0.9, t * 1.2, t * 0.6);
  const transformed = TESSERACT_VERTICES.map((v) => multiply4D(v, rot));

  const lines = new Float32Array(TESSERACT_EDGES.length * 2 * 3);
  let idx = 0;
  for (const [a, b] of TESSERACT_EDGES) {
    const pa = projectTo3D(transformed[a]);
    const pb = projectTo3D(transformed[b]);
    lines.set(pa, idx); idx += 3;
    lines.set(pb, idx); idx += 3;
  }
  return lines;
}

export function getTesseractEdgeCount() {
  return TESSERACT_EDGES.length;
}

export function project4Dto3D(point, angles = [0, 0, 0], distance = 2.8) {
  const rot = rotation4D(angles[0], angles[1], angles[2]);
  return projectTo3D(multiply4D(point, rot), distance);
}
