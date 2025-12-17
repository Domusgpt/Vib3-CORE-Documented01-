const DEFAULT_LENGTH = 7;

function createZeroedBands(length) {
  return new Float32Array(length).fill(0);
}

export function smoothBands(previous = createZeroedBands(DEFAULT_LENGTH), incoming = createZeroedBands(DEFAULT_LENGTH), smoothing = 0.25) {
  const length = Math.max(previous.length || DEFAULT_LENGTH, incoming.length || DEFAULT_LENGTH);
  const prev = previous.length ? previous : createZeroedBands(length);
  const next = new Float32Array(length);
  const clamped = Math.max(0, Math.min(1, smoothing));

  for (let i = 0; i < length; i++) {
    const sample = incoming[i] ?? 0;
    next[i] = prev[i] * (1 - clamped) + sample * clamped;
  }

  return next;
}

export function updateBandState(previous = createZeroedBands(DEFAULT_LENGTH), incoming = createZeroedBands(DEFAULT_LENGTH), smoothing = 0.25) {
  const bands = smoothBands(previous, incoming, smoothing);
  const energy = bands.length ? bands.reduce((max, value) => (value > max ? value : max), 0) : 0;
  return { bands, energy };
}

export function getDefaultBands(length = DEFAULT_LENGTH) {
  return createZeroedBands(length);
}
