import { describe, expect, it } from 'vitest';
import { clamp01, lerp, lerpColor, paletteFromBands } from '../src/utils/colorMath.js';

describe('colorMath', () => {
  it('clamps values to [0,1]', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0.4)).toBeCloseTo(0.4);
    expect(clamp01(1.6)).toBe(1);
  });

  it('lerps numbers with clamping', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 2)).toBe(10);
  });

  it('lerps colors channel-wise', () => {
    expect(lerpColor([0, 0, 0], [1, 1, 1], 0.25)).toEqual([0.25, 0.25, 0.25]);
  });

  it('builds palette from bands', () => {
    const palette = paletteFromBands([0.5, 0, 0, 0.25, 0, 0.75]);
    expect(palette.inner[0]).toBeGreaterThan(0.05);
    expect(palette.outer[1]).toBeGreaterThan(0.08);
    expect(palette.accent[0]).toBeGreaterThan(0.72);
  });
});
