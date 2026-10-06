import { describe, expect, it } from 'vitest';
import {
  intersectionArea,
  polygonCentroid,
  polylineLength,
  rect,
  rectPolygon,
  trimPolylineToOutline,
} from './geometry.ts';

describe('polygonCentroid', () => {
  it('finds the centre of a rectangle', () => {
    expect(polygonCentroid(rectPolygon(rect(0, 0, 10, 4)))).toEqual({
      x: 5,
      y: 2,
    });
  });

  it('weights by area, not by vertex count', () => {
    // Extra vertices along one edge would skew a plain average.
    const c = polygonCentroid([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    expect(c.x).toBeCloseTo(5);
    expect(c.y).toBeCloseTo(5);
  });
});

describe('trimPolylineToOutline', () => {
  it('stops at the first crossing', () => {
    const outline = rectPolygon(rect(10, -5, 10, 10));
    expect(
      trimPolylineToOutline(
        [
          { x: 0, y: 0 },
          { x: 15, y: 0 },
        ],
        outline
      )
    ).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
  });

  it('leaves lines that never cross alone', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    ];
    expect(trimPolylineToOutline(line, rectPolygon(rect(10, 10, 5, 5)))).toBe(
      line
    );
  });
});

describe('misc', () => {
  it('measures overlap and length', () => {
    expect(intersectionArea(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(25);
    expect(intersectionArea(rect(0, 0, 10, 10), rect(10, 0, 5, 5))).toBe(0);
    expect(
      polylineLength([
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 4 },
      ])
    ).toBe(7);
  });
});
