import { describe, it, expect } from 'vitest';
import { smoothBands, updateBandState, getDefaultBands } from '../src/utils/bandSmoothing.js';

function arr(values) {
  return new Float32Array(values);
}

describe('band smoothing utilities', () => {
  it('smoothBands blends toward incoming values with the provided factor', () => {
    const previous = arr([0, 0.2, 0.4, 0.6, 0.8, 1, 0.5]);
    const incoming = arr([1, 1, 1, 1, 1, 1, 1]);
    const result = smoothBands(previous, incoming, 0.25);
    const expected = [0.25, 0.4, 0.55, 0.7, 0.85, 1, 0.625];
    expected.forEach((value, index) => {
      expect(result[index]).toBeCloseTo(value, 5);
    });
  });

  it('clamps smoothing to [0,1] and supports empty inputs', () => {
    const result = smoothBands(new Float32Array(0), new Float32Array(0), 5);
    expect(result.length).toBe(7);
    expect(result.every((v) => v === 0)).toBe(true);
  });

  it('updateBandState returns smoothed bands with peak energy', () => {
    const prev = getDefaultBands();
    const incoming = arr([0.2, 0.4, 0.6, 0.8, 0.5, 0.3, 0.1]);
    const { bands, energy } = updateBandState(prev, incoming, 0.5);
    const expected = [0.1, 0.2, 0.3, 0.4, 0.25, 0.15, 0.05];
    expected.forEach((value, index) => {
      expect(bands[index]).toBeCloseTo(value, 5);
    });
    expect(energy).toBeCloseTo(0.4);
  });
});
