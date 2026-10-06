import type { Point } from '../core/geometry.ts';

/** Produces a perturbed copy of a shape. Always works from the original. */
export interface JitterStrategy {
  apply(points: Point[], center: Point): Point[];
}

/**
 * Moves every point in or out along the line from the shape's centre
 * through that point, by up to `amount` × the shape's mean radius.
 * Coincident points get the same offset so shapes don't crack at seams.
 */
export class RadialJitter implements JitterStrategy {
  constructor(
    private readonly amount: number,
    private readonly random: () => number = Math.random
  ) {}

  apply(points: Point[], center: Point): Point[] {
    const meanRadius =
      points.reduce(
        (s, p) => s + Math.hypot(p.x - center.x, p.y - center.y),
        0
      ) / (points.length || 1);
    const maxOffset = meanRadius * this.amount;
    const offsets = new Map<string, number>();

    return points.map((p) => {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      const r = Math.hypot(dx, dy);
      if (r < 1e-9) return p;
      const key = `${p.x},${p.y}`;
      let offset = offsets.get(key);
      if (offset === undefined) {
        offset = (this.random() * 2 - 1) * maxOffset;
        offsets.set(key, offset);
      }
      const k = (r + offset) / r;
      return { x: center.x + dx * k, y: center.y + dy * k };
    });
  }
}
