import type { Point } from '../core/geometry.ts';

/**
 * Minimal SVG path support: parses `d` strings into absolute M/L/C/Q/Z
 * commands (H, V, S, T and relative forms are normalised), serialises them
 * back, and flattens them into polygons. Arcs are not supported.
 */

export type PathCommand =
  | { type: 'M' | 'L'; points: [Point] }
  | { type: 'Q'; points: [Point, Point] }
  | { type: 'C'; points: [Point, Point, Point] }
  | { type: 'Z'; points: [] };

const ARG_COUNT: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  Z: 0,
};

const isCommand = (token: string) => /^[a-zA-Z]$/.test(token);

const TOKEN = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

export function parsePath(d: string): PathCommand[] {
  const tokens = d.match(TOKEN) ?? [];
  const out: PathCommand[] = [];
  let i = 0;
  let cmd = '';
  let cur: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  // Last control point, for S/T reflection.
  let lastCubic: Point | null = null;
  let lastQuad: Point | null = null;

  const num = () => {
    const t = tokens[i++];
    if (t === undefined || isCommand(t)) {
      throw new Error(`Malformed path data near token ${i}: "${d}"`);
    }
    return parseFloat(t);
  };

  while (i < tokens.length) {
    if (isCommand(tokens[i])) {
      cmd = tokens[i++];
    } else if (!cmd) {
      throw new Error(`Path must start with a command: "${d}"`);
    }
    const upper = cmd.toUpperCase();
    if (!(upper in ARG_COUNT)) {
      throw new Error(`Unsupported path command "${cmd}"`);
    }
    const rel = cmd !== upper;
    const pt = (x: number, y: number): Point =>
      rel ? { x: cur.x + x, y: cur.y + y } : { x, y };

    switch (upper) {
      case 'M': {
        cur = pt(num(), num());
        start = cur;
        out.push({ type: 'M', points: [cur] });
        // Subsequent coordinate pairs are implicit line-tos.
        cmd = rel ? 'l' : 'L';
        lastCubic = lastQuad = null;
        break;
      }
      case 'L':
      case 'H':
      case 'V': {
        let next: Point;
        if (upper === 'H') {
          const x = num();
          next = { x: rel ? cur.x + x : x, y: cur.y };
        } else if (upper === 'V') {
          const y = num();
          next = { x: cur.x, y: rel ? cur.y + y : y };
        } else {
          next = pt(num(), num());
        }
        cur = next;
        out.push({ type: 'L', points: [cur] });
        lastCubic = lastQuad = null;
        break;
      }
      case 'C':
      case 'S': {
        const c1: Point =
          upper === 'C'
            ? pt(num(), num())
            : lastCubic
              ? { x: 2 * cur.x - lastCubic.x, y: 2 * cur.y - lastCubic.y }
              : cur;
        const c2 = pt(num(), num());
        const end = pt(num(), num());
        out.push({ type: 'C', points: [c1, c2, end] });
        cur = end;
        lastCubic = c2;
        lastQuad = null;
        break;
      }
      case 'Q':
      case 'T': {
        const c: Point =
          upper === 'Q'
            ? pt(num(), num())
            : lastQuad
              ? { x: 2 * cur.x - lastQuad.x, y: 2 * cur.y - lastQuad.y }
              : cur;
        const end = pt(num(), num());
        out.push({ type: 'Q', points: [c, end] });
        cur = end;
        lastQuad = c;
        lastCubic = null;
        break;
      }
      case 'Z': {
        out.push({ type: 'Z', points: [] });
        cur = start;
        lastCubic = lastQuad = null;
        break;
      }
    }
  }
  return out;
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

export function serializePath(commands: PathCommand[]): string {
  return commands
    .map((c) =>
      c.type === 'Z'
        ? 'Z'
        : c.type + c.points.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join(' ')
    )
    .join('');
}

/**
 * Approximates the first subpath as a polygon, sampling each curve into
 * `curveSegments` straight pieces.
 */
export function flattenPath(
  commands: PathCommand[],
  curveSegments = 8
): Point[] {
  const out: Point[] = [];
  let cur: Point = { x: 0, y: 0 };
  for (const c of commands) {
    if (c.type === 'M') {
      if (out.length) break; // only the first subpath
      cur = c.points[0];
      out.push(cur);
    } else if (c.type === 'L') {
      cur = c.points[0];
      out.push(cur);
    } else if (c.type === 'Q' || c.type === 'C') {
      const p0 = cur;
      for (let s = 1; s <= curveSegments; s++) {
        const t = s / curveSegments;
        out.push(
          c.type === 'Q'
            ? quadAt(p0, c.points[0], c.points[1], t)
            : cubicAt(p0, c.points[0], c.points[1], c.points[2], t)
        );
      }
      cur = c.points[c.points.length - 1];
    }
  }
  // Drop a closing point that duplicates the start.
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && first.x === last.x && first.y === last.y) out.pop();
  return out;
}

function quadAt(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}
