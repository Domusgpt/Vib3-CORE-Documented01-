import { describe, it, expect } from 'vitest';
import { clamp01, computeHighlightParams } from '../src/utils/highlightMath.js';

describe('highlightMath', () => {
  it('clamps values to [0,1]', () => {
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(2)).toBe(1);
  });

  it('derives speed and intensity from bands and energy', () => {
    const { speed, intensity, tint } = computeHighlightParams([0, 0, 0, 0, 0.4, 0.6, 0.5], 0.8, 'combat');
    expect(speed).toBeGreaterThan(1);
    expect(speed).toBeLessThanOrEqual(2.8);
    expect(intensity).toBeGreaterThan(0.6);
    expect(intensity).toBeLessThanOrEqual(1.6);
    expect(tint.every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  it('adjusts for recovery zone by reducing intensity', () => {
    const combat = computeHighlightParams([0, 0, 0, 0, 0.2, 0.2, 0.2], 0.3, 'combat').intensity;
    const recover = computeHighlightParams([0, 0, 0, 0, 0.2, 0.2, 0.2], 0.3, 'recover').intensity;
    expect(recover).toBeLessThan(combat);
  });
});
