import type { Point } from '../core/geometry.ts';
import type { PathCommand } from './path.ts';

/**
 * Turns a polygon into a closed path with rounded corners, like CSS
 * border-radius. Each corner is cut back by up to `radius` along both of its
 * edges (never more than half an edge, so neighbouring corners can't
 * overlap) and replaced with a quadratic curve through the original corner.
 * When every cut reaches half an edge the outline becomes fully smooth.
 */
export function roundPolygon(points: Point[], radius: number): PathCommand[] {
  const n = points.length;
  if (n < 3 || radius <= 0) {
    return [
      ...points.map((p, i): PathCommand => ({
        type: i === 0 ? 'M' : 'L',
        points: [p],
      })),
      { type: 'Z', points: [] },
    ];
  }

  const out: PathCommand[] = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const corner = points[i];
    const next = points[(i + 1) % n];
    const start = towards(corner, prev, radius);
    const end = towards(corner, next, radius);
    out.push({ type: i === 0 ? 'M' : 'L', points: [start] });
    out.push({ type: 'Q', points: [corner, end] });
  }
  out.push({ type: 'Z', points: [] });
  return out;
}

/** Point `distance` from `from` toward `to`, capped at half the way. */
function towards(from: Point, to: Point, distance: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-9) return from;
  const t = Math.min(distance, length / 2) / length;
  return { x: from.x + dx * t, y: from.y + dy * t };
}
