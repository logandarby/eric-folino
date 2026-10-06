import { describe, expect, it } from 'vitest';
import { distance } from '../core/geometry.ts';
import { simplifyPolygon } from './simplify.ts';

// A 100×100 square with clusters of near-duplicate points.
const noisy = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 50, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 3 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
  { x: 0, y: 2 },
];

describe('simplifyPolygon', () => {
  it('keeps every neighbouring pair at least minSpacing apart', () => {
    const out = simplifyPolygon(noisy, 20);
    out.forEach((p, i) => {
      expect(distance(p, out[(i + 1) % out.length])).toBeGreaterThanOrEqual(20);
    });
    expect(out).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ]);
  });

  it('relaxes the spacing rather than collapsing the shape', () => {
    expect(simplifyPolygon(noisy, 1000).length).toBeGreaterThanOrEqual(5);
  });

  it('leaves the polygon alone with spacing 0', () => {
    expect(simplifyPolygon(noisy, 0)).toBe(noisy);
  });
});
