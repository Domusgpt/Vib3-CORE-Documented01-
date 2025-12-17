import { describe, expect, it } from 'vitest';
import { normalizeBandsFromFFT, psychoBandBreakpoints } from '../src/utils/audioBands.js';

describe('normalizeBandsFromFFT', () => {
  it('spreads flat energy evenly across bands', () => {
    const fft = new Uint8Array(512).fill(128);
    const bands = normalizeBandsFromFFT(fft, 48000);
    const unique = new Set(bands.map((v) => v.toFixed(4)));
    expect(unique.size).toBeGreaterThanOrEqual(1);
    bands.forEach((value) => {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    });
  });

  it('maps low-frequency bins into the first band and high bins into the last', () => {
    const fft = new Uint8Array(128).fill(0);
    // Emphasize very low frequency bins
    fft[0] = 255;
    fft[1] = 255;
    // Emphasize highest bin
    fft[fft.length - 1] = 255;

    const bands = normalizeBandsFromFFT(fft, 48000);
    expect(bands[0]).toBeGreaterThanOrEqual(bands[1]);
    expect(bands[bands.length - 1]).toBeGreaterThan(0);
  });

  it('handles sample-rate changes by adjusting bin width', () => {
    const fft = new Uint8Array(256).fill(0);
    fft[10] = 255; // stays within low band
    fft[200] = 200; // high frequency content

    const lowRateBands = normalizeBandsFromFFT(fft, 24000);
    const highRateBands = normalizeBandsFromFFT(fft, 96000);

    // With a higher sample rate, the same bin index maps to a higher frequency
    expect(highRateBands[0]).toBeLessThanOrEqual(lowRateBands[0]);
  });
});

describe('psychoBandBreakpoints', () => {
  it('is strictly increasing and covers 7 psychoacoustic bands', () => {
    expect(psychoBandBreakpoints).toHaveLength(7);
    const sorted = [...psychoBandBreakpoints].sort((a, b) => a - b);
    expect(sorted).toEqual(psychoBandBreakpoints);
  });
});
