import { describe, expect, it } from 'vitest';
import { clamp01, shadowParameters } from '../src/utils/shadowMath.js';

describe('shadowMath', () => {
  it('clamps values to 0..1', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(2)).toBe(1);
  });

  it('derives parameters from bands and telemetry', () => {
    const params = shadowParameters(
      { bass: 0.8, lowMid: 0.6, high: 0.2 },
      { player_health: 0.5 }
    );
    expect(params.intensity).toBeCloseTo(0.65 + 0.8 * 0.6);
    expect(params.softness).toBeCloseTo(0.25 + 0.6 * 0.35);
    expect(params.noise).toBeCloseTo(0.04 + 0.2 * 0.05);
    expect(params.health).toBe(0.5);
  });

  it('falls back to defaults when inputs are missing', () => {
    const params = shadowParameters();
    expect(params.intensity).toBeCloseTo(0.65 + 0.3 * 0.6);
    expect(params.softness).toBeCloseTo(0.25 + 0.25 * 0.35);
    expect(params.noise).toBeCloseTo(0.04 + 0.1 * 0.05);
    expect(params.health).toBe(1);
  });
});
