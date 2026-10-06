import { distance, type Point } from '../core/geometry.ts';

/** Fewest points a simplified outline may keep. */
const MIN_POINTS = 5;

/**
 * Drops polygon points that sit closer than `minSpacing` to the previously
 * kept point (including across the closing seam). Clusters of near-duplicate
 * points jitter independently and read as fuzz; spacing them out lets
 * corner rounding produce a clean curve. Relaxes the spacing if it would
 * leave fewer than a handful of points.
 */
export function simplifyPolygon(points: Point[], minSpacing: number): Point[] {
  if (points.length <= MIN_POINTS || minSpacing <= 0) return points;

  const kept = [points[0]];
  for (const p of points.slice(1)) {
    if (distance(p, kept[kept.length - 1]) >= minSpacing) kept.push(p);
  }
  while (
    kept.length > 1 &&
    distance(kept[kept.length - 1], kept[0]) < minSpacing
  ) {
    kept.pop();
  }
  return kept.length >= MIN_POINTS
    ? kept
    : simplifyPolygon(points, minSpacing / 2);
}
