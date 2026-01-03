import { describe, expect, it } from 'vitest';
import { clampControlValue, readControlValue } from '../js/core/control-utils.js';

const buildDoc = (descriptor) => ({
  getElementById: (id) => descriptor[id] || null
});

describe('clampControlValue', () => {
  const doc = buildDoc({
    alpha: { min: '0', max: '1', step: '0.2', type: 'range' }
  });

  it('clamps to slider min/max bounds', () => {
    expect(clampControlValue('alpha', 2, doc)).toBe(1);
    expect(clampControlValue('alpha', -1, doc)).toBe(0);
  });

  it('quantizes values to slider step increments', () => {
    expect(clampControlValue('alpha', 0.34, doc)).toBeCloseTo(0.4);
  });

  it('respects explicit override bounds', () => {
    expect(clampControlValue('alpha', 1.2, doc, { max: 0.8 })).toBe(0.8);
  });
});

describe('readControlValue', () => {
  const doc = buildDoc({
    slider: { type: 'range', value: '0.75' },
    toggle: { type: 'checkbox', checked: true }
  });

  it('reads numeric slider values', () => {
    expect(readControlValue('slider', doc)).toBeCloseTo(0.75);
  });

  it('reads checkbox states', () => {
    expect(readControlValue('toggle', doc)).toBe(true);
  });

  it('returns undefined for missing controls', () => {
    expect(readControlValue('missing', doc)).toBeUndefined();
  });
});
