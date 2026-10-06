import { describe, expect, it } from 'vitest';
import { serializePath } from './path.ts';
import { roundPolygon } from './round.ts';

const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

describe('roundPolygon', () => {
  it('cuts each corner back by the radius and curves through it', () => {
    expect(serializePath(roundPolygon(square, 10))).toBe(
      'M0 10Q0 0 10 0L90 0Q100 0 100 10L100 90Q100 100 90 100L10 100Q0 100 0 90Z'
    );
  });

  it('never cuts more than half an edge', () => {
    // Radius larger than the shape: curves meet at edge midpoints.
    expect(serializePath(roundPolygon(square, 1000))).toBe(
      'M0 50Q0 0 50 0L50 0Q100 0 100 50L100 50Q100 100 50 100L50 100Q0 100 0 50Z'
    );
  });

  it('leaves the polygon sharp with radius 0', () => {
    expect(serializePath(roundPolygon(square, 0))).toBe(
      'M0 0L100 0L100 100L0 100Z'
    );
  });
});
