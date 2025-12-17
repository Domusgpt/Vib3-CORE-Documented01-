export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function computeHighlightParams(bands = [], energy = 0, zone = 'calm') {
  const hiMid = bands[4] ?? 0;
  const high = bands[5] ?? 0;
  const sparkle = bands[6] ?? 0;

  const zoneBoost = zone === 'combat' ? 0.16 : zone === 'recover' ? -0.08 : 0;

  const speed = clamp01(0.45 + high * 1.2 + energy * 0.6 + zoneBoost * 0.3) * 2.8;
  const intensity = clamp01(0.35 + hiMid * 0.9 + sparkle * 0.8 + energy * 0.4 + zoneBoost * 0.4) * 1.6;

  const tint = [
    clamp01(0.35 + hiMid * 0.35 + sparkle * 0.25 + zoneBoost * 0.25),
    clamp01(0.65 + high * 0.22 + sparkle * 0.15 + zoneBoost * 0.08),
    clamp01(0.9 + sparkle * 0.08 - hiMid * 0.05)
  ];

  return { speed, intensity, tint };
}
