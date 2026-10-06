import { describe, expect, it } from 'vitest';
import { RadialJitter } from './jitter.ts';

const square = [
  { x: -10, y: -10 },
  { x: 10, y: -10 },
  { x: 10, y: 10 },
  { x: -10, y: 10 },
];
const origin = { x: 0, y: 0 };
const radiusOf = (p: { x: number; y: number }) => Math.hypot(p.x, p.y);

describe('RadialJitter', () => {
  it('moves points only along the line from the centre', () => {
    for (const p of new RadialJitter(0.1, () => 1).apply(square, origin)) {
      // Corners stay on the diagonals.
      expect(Math.abs(p.x)).toBeCloseTo(Math.abs(p.y));
    }
  });

  it('limits the offset to amount × mean radius', () => {
    const radius = Math.hypot(10, 10);
    const grow = new RadialJitter(0.1, () => 1).apply(square, origin);
    const shrink = new RadialJitter(0.1, () => 0).apply(square, origin);
    expect(radiusOf(grow[0])).toBeCloseTo(radius * 1.1);
    expect(radiusOf(shrink[0])).toBeCloseTo(radius * 0.9);
  });

  it('gives coincident points the same offset so seams stay closed', () => {
    const values = [0.1, 0.9, 0.3, 0.7, 0.5];
    let i = 0;
    const out = new RadialJitter(0.2, () => values[i++ % values.length]).apply(
      [...square, square[0]],
      origin
    );
    expect(out[4]).toEqual(out[0]);
  });

  it('always works from the original shape', () => {
    const jitter = new RadialJitter(0.1);
    const before = JSON.stringify(square);
    for (let n = 0; n < 50; n++) jitter.apply(square, origin);
    expect(JSON.stringify(square)).toBe(before);
  });
});
