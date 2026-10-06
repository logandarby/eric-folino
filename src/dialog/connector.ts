import {
  bottom,
  clamp,
  polylineLength,
  right,
  trimPolylineToOutline,
  type Point,
  type Rect,
} from '../core/geometry.ts';

export interface ConnectorOptions {
  /** How far from a dialog corner the line may attach. */
  edgeInset: number;
  /** Shortest first segment worth drawing out of a side edge. */
  minRun: number;
  /** Distance kept from things the line detours around. */
  clearance: number;
  /** Rects the line should not cross (the target itself excluded). */
  obstacles?: Rect[];
}

export interface ConnectorTarget {
  rect: Rect;
  center: Point;
  /** Closed polygon the line stops at. */
  outline: Point[];
}

// Route scoring. Lower wins.
const CROSSING_COST = 10_000;
const BEND_COST = 30;

/**
 * Routes a line of horizontal and vertical segments from the edge of
 * `dialog` to `target`, ending where it first touches the target's outline.
 *
 * Candidates are the direct route (straight, or an L that turns once
 * toward the target centre) plus detours that run alongside the target or
 * an obstacle before turning in. The winner crosses the fewest obstacles,
 * then has the fewest bends and the shortest length. Returns [] if the
 * target is inside the dialog.
 */
export function routeConnector(
  dialog: Rect,
  target: ConnectorTarget,
  options: ConnectorOptions
): Point[] {
  const obstacles = options.obstacles ?? [];
  let best: Point[] = [];
  let bestCost = Infinity;
  for (const route of candidateRoutes(dialog, target, options)) {
    const trimmed = trimPolylineToOutline(route, target.outline);
    if (trimmed.length < 2) continue;
    const cost =
      crossings(trimmed, obstacles) * CROSSING_COST +
      (trimmed.length - 2) * BEND_COST +
      polylineLength(trimmed);
    if (cost < bestCost) {
      best = trimmed;
      bestCost = cost;
    }
  }
  return best;
}

function candidateRoutes(
  dialog: Rect,
  target: ConnectorTarget,
  { edgeInset, minRun, clearance, obstacles = [] }: ConnectorOptions
): Point[][] {
  const c = target.center;
  const routes: Point[][] = [];

  const exitRight = c.x >= right(dialog) + minRun;
  const exitLeft = c.x <= dialog.x - minRun;
  if (exitRight || exitLeft) {
    const edgeX = exitRight ? right(dialog) : dialog.x;
    const minY = dialog.y + edgeInset;
    const maxY = bottom(dialog) - edgeInset;
    // Direct: straight across, or across then up/down into the centre.
    const y = clamp(c.y, minY, maxY);
    routes.push(
      Math.abs(y - c.y) < 0.5
        ? [{ x: edgeX, y }, c]
        : [{ x: edgeX, y }, { x: c.x, y }, c]
    );
    // Detours: run past the target/obstacles horizontally, then turn in
    // vertically to enter from above or below.
    for (const y0 of detourLanes(target.rect, obstacles, clearance, 'y')) {
      if (y0 >= minY && y0 <= maxY) {
        routes.push([{ x: edgeX, y: y0 }, { x: c.x, y: y0 }, c]);
      }
    }
    return routes;
  }

  const exitTop = c.y < dialog.y;
  const exitBottom = c.y > bottom(dialog);
  if (!exitTop && !exitBottom) return routes;

  const edgeY = exitTop ? dialog.y : bottom(dialog);
  const minX = dialog.x + edgeInset;
  const maxX = right(dialog) - edgeInset;
  const x = clamp(c.x, minX, maxX);
  routes.push(
    Math.abs(x - c.x) < 0.5
      ? [{ x, y: edgeY }, c]
      : [{ x, y: edgeY }, { x, y: c.y }, c]
  );
  for (const x0 of detourLanes(target.rect, obstacles, clearance, 'x')) {
    if (x0 >= minX && x0 <= maxX) {
      routes.push([{ x: x0, y: edgeY }, { x: x0, y: c.y }, c]);
    }
  }
  return routes;
}

/** Coordinates just outside the target and each obstacle along one axis. */
function detourLanes(
  target: Rect,
  obstacles: Rect[],
  clearance: number,
  axis: 'x' | 'y'
): number[] {
  return [target, ...obstacles].flatMap((r) =>
    axis === 'x'
      ? [r.x - clearance, right(r) + clearance]
      : [r.y - clearance, bottom(r) + clearance]
  );
}

/** Number of obstacles any (axis-aligned) segment passes through. */
export function crossings(points: Point[], obstacles: Rect[]): number {
  let count = 0;
  for (const r of obstacles) {
    for (let i = 0; i < points.length - 1; i++) {
      if (segmentHitsRect(points[i], points[i + 1], r)) {
        count++;
        break;
      }
    }
  }
  return count;
}

function segmentHitsRect(a: Point, b: Point, r: Rect): boolean {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  // Strict comparisons: grazing an edge doesn't count.
  return maxX > r.x && minX < right(r) && maxY > r.y && minY < bottom(r);
}
