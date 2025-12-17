const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * clamp01(t);

const lerpColor = (a, b, t) => {
  const clamped = clamp01(t);
  return [
    lerp(a[0], b[0], clamped),
    lerp(a[1], b[1], clamped),
    lerp(a[2], b[2], clamped)
  ];
};

const paletteFromBands = (bands = []) => {
  const bass = clamp01(bands[0] ?? 0);
  const mid = clamp01(bands[3] ?? 0);
  const high = clamp01(bands[5] ?? 0);

  const inner = lerpColor([0.05, 0.09, 0.2], [0.18, 0.22, 0.45], bass);
  const outer = lerpColor([0.08, 0.08, 0.12], [0.25, 0.14, 0.3], mid);
  const accent = lerpColor([0.72, 0.35, 0.9], [1.0, 0.84, 0.35], high);

  return { inner, outer, accent };
};

export { clamp01, lerp, lerpColor, paletteFromBands };
