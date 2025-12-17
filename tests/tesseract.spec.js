import { describe, expect, it } from 'vitest';
import { buildTesseractLines, getTesseractEdgeCount, project4Dto3D } from '../src/utils/tesseract.js';

describe('tesseract utilities', () => {
  it('exposes the expected edge count', () => {
    expect(getTesseractEdgeCount()).toBe(32);
  });

  it('projects 4D points into 3D space deterministically', () => {
    const result = project4Dto3D([1, 0, 0, 0], [0.25, 0.5, 0.1]);
    expect(result.length).toBe(3);
    result.forEach((v) => expect(Number.isFinite(v)).toBe(true));
  });

  it('builds line data sized to the edge list', () => {
    const lines = buildTesseractLines(1.2, 0.4);
    expect(lines.length).toBe(getTesseractEdgeCount() * 2 * 3);
    lines.forEach((v) => expect(Number.isFinite(v)).toBe(true));
  });
});
