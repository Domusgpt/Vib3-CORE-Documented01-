export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function shadowParameters(bands = {}, telemetry = {}) {
  const bass = clamp01(bands.bass ?? 0.3);
  const lowMid = clamp01(bands.lowMid ?? 0.25);
  const high = clamp01(bands.high ?? 0.1);
  const health = clamp01(telemetry.player_health ?? 1);

  return {
    intensity: 0.65 + bass * 0.6,
    softness: 0.25 + lowMid * 0.35,
    noise: 0.04 + high * 0.05,
    health
  };
}
