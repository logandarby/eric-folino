export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

export const rect = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
});

export const right = (r: Rect) => r.x + r.width;
export const bottom = (r: Rect) => r.y + r.height;
export const center = (r: Rect): Point => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
});

export const fromDOMRect = (r: DOMRectReadOnly): Rect =>
  rect(r.left, r.top, r.width, r.height);

export const clamp = (value: number, min: number, max: number) =>
  max < min ? (min + max) / 2 : Math.min(max, Math.max(min, value));

export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export function intersectionArea(a: Rect, b: Rect): number {
  const w = Math.min(right(a), right(b)) - Math.max(a.x, b.x);
  const h = Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

export function inflate(r: Rect, by: number): Rect {
  return rect(r.x - by, r.y - by, r.width + by * 2, r.height + by * 2);
}

/** Corners of a rect as a closed polygon, clockwise from top-left. */
export function rectPolygon(r: Rect): Point[] {
  return [
    { x: r.x, y: r.y },
    { x: right(r), y: r.y },
    { x: right(r), y: bottom(r) },
    { x: r.x, y: bottom(r) },
  ];
}

/** Area-weighted centroid of a simple polygon (shoelace formula). */
export function polygonCentroid(points: Point[]): Point {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(area) < 1e-9) {
    // Degenerate polygon: fall back to the vertex average.
    const n = points.length || 1;
    return {
      x: points.reduce((s, p) => s + p.x, 0) / n,
      y: points.reduce((s, p) => s + p.y, 0) / n,
    };
  }
  area /= 2;
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

/** Intersection point of segments p1→p2 and p3→p4, with `t` along p1→p2. */
export function segmentIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): { point: Point; t: number } | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { point: { x: p1.x + t * d1x, y: p1.y + t * d1y }, t };
}

/**
 * Truncates a polyline at the first point where it crosses `outline`
 * (a closed polygon). Returns the polyline unchanged if it never crosses.
 */
export function trimPolylineToOutline(
  polyline: Point[],
  outline: Point[]
): Point[] {
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    let best: { point: Point; t: number } | null = null;
    for (let j = 0; j < outline.length; j++) {
      const hit = segmentIntersection(
        a,
        b,
        outline[j],
        outline[(j + 1) % outline.length]
      );
      if (hit && (!best || hit.t < best.t)) best = hit;
    }
    if (best) return [...polyline.slice(0, i + 1), best.point];
  }
  return polyline;
}

export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}
