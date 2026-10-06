import {
  bottom,
  center,
  clamp,
  inflate,
  intersectionArea,
  rect,
  right,
  type Rect,
  type Size,
} from '../core/geometry.ts';
import type { Side } from '../site/types.ts';

export type PlacementMode = 'floating' | 'docked';

export interface PlacementInput {
  /** The thing the dialog points at. */
  anchor: Rect;
  /** Measured dialog size. */
  size: Size;
  viewport: Rect;
  mode: PlacementMode;
  /** Min distance from viewport edges. */
  margin: number;
  /** Distance between dialog and anchor. */
  gap: number;
  /** Where the connector meets the dialog, measured in from its corner. */
  edgeInset: number;
  /** Sides to try, best first (floating mode). */
  sides: Side[];
  /** Areas the dialog should try not to cover. */
  avoid?: Rect[];
  /** Areas it's fine to cover a little of, e.g. dimmed decorations. */
  softAvoid?: Rect[];
  /**
   * Floating mode: distance from the viewport edges (beyond `margin`) the
   * dialog prefers to keep. Closer is allowed, just scored worse. 0 = off.
   */
  comfort?: number;
}

export interface PlacementResult {
  rect: Rect;
  /** Which side of the anchor the dialog ended up on. */
  side: Side;
}

type Align = 'start' | 'center' | 'end';
const ALIGNS: Align[] = ['start', 'center', 'end'];

// Scoring weights. Lower scores win.
const ANCHOR_OVERLAP_COST = 10_000; // per fraction of dialog area
const AVOID_OVERLAP_COST = 5_000; // per fraction of dialog area
const SOFT_AVOID_OVERLAP_COST = 800; // per fraction of dialog area
const SHIFT_COST = 1; // per px moved to fit the viewport
const SIDE_RANK_COST = 40;
const ALIGN_RANK_COST = 10;
const EDGE_CROWDING_COST = 80; // per edge the dialog is fully crowding

/**
 * Chooses where a dialog goes relative to its anchor.
 *
 * - `docked`: a sheet centred horizontally on the half of the viewport away
 *   from the anchor (its width comes from CSS).
 * - `floating`: tries each side × alignment, clamps it into the viewport
 *   (and, as a second option, into the viewport inset by `comfort`), and
 *   picks the candidate that best avoids covering the anchor and `avoid`
 *   areas, stays clear of the viewport edges, and moves least from its
 *   ideal spot.
 */
export function placeDialog(input: PlacementInput): PlacementResult {
  return input.mode === 'docked' ? dock(input) : float(input);
}

function dock({
  anchor,
  size,
  viewport,
  margin,
}: PlacementInput): PlacementResult {
  const width = Math.min(size.width, viewport.width - margin * 2);
  const anchorAbove = center(anchor).y < center(viewport).y;
  const y = anchorAbove
    ? bottom(viewport) - margin - size.height
    : viewport.y + margin;
  return {
    rect: rect(
      viewport.x + (viewport.width - width) / 2,
      Math.max(viewport.y + margin, y),
      width,
      size.height
    ),
    side: anchorAbove ? 'bottom' : 'top',
  };
}

function float(input: PlacementInput): PlacementResult {
  const {
    anchor,
    size,
    viewport,
    margin,
    sides,
    avoid = [],
    softAvoid = [],
    comfort = 0,
  } = input;
  const area = size.width * size.height || 1;
  const anchorZone = inflate(anchor, 4);
  const insets = comfort > 0 ? [margin, margin + comfort] : [margin];

  let best: (PlacementResult & { score: number }) | null = null;
  sides.forEach((side, sideRank) => {
    ALIGNS.forEach((align, alignRank) => {
      const ideal = idealRect(input, side, align);
      for (const inset of insets) {
        const fitted = fitInto(ideal, viewport, inset, margin);
        const shift =
          Math.abs(fitted.x - ideal.x) + Math.abs(fitted.y - ideal.y);
        const overlap = (rects: Rect[]) =>
          rects.reduce((sum, r) => sum + intersectionArea(fitted, r), 0);
        const score =
          (intersectionArea(fitted, anchorZone) / area) * ANCHOR_OVERLAP_COST +
          (overlap(avoid) / area) * AVOID_OVERLAP_COST +
          (overlap(softAvoid) / area) * SOFT_AVOID_OVERLAP_COST +
          edgeCrowding(fitted, viewport, margin, comfort) * EDGE_CROWDING_COST +
          shift * SHIFT_COST +
          sideRank * SIDE_RANK_COST +
          alignRank * ALIGN_RANK_COST;
        if (!best || score < best.score) best = { rect: fitted, side, score };
      }
    });
  });

  // `sides` is never empty in practice; fall back to docking if it is.
  if (!best) return dock(input);
  const { rect: chosen, side } = best;
  return { rect: chosen, side };
}

/**
 * Clamps `r` inside the viewport inset by `inset` on each axis where it
 * fits, falling back to the hard `margin` on an axis where it doesn't.
 */
function fitInto(r: Rect, viewport: Rect, inset: number, margin: number) {
  const axis = (pos: number, len: number, start: number, extent: number) => {
    const pad = extent - len >= inset * 2 ? inset : margin;
    return clamp(pos, start + pad, start + extent - pad - len);
  };
  return rect(
    axis(r.x, r.width, viewport.x, viewport.width),
    axis(r.y, r.height, viewport.y, viewport.height),
    r.width,
    r.height
  );
}

/**
 * Fuzzy "how crowded against the viewport edges" score, 0..4: each edge
 * contributes its degree of being too close, easing from 1 (at the margin)
 * to 0 (at `comfort` beyond it). Summed, so corners count double.
 */
export function edgeCrowding(
  r: Rect,
  viewport: Rect,
  margin: number,
  comfort: number
): number {
  if (comfort <= 0) return 0;
  const gaps = [
    r.x - viewport.x,
    r.y - viewport.y,
    right(viewport) - right(r),
    bottom(viewport) - bottom(r),
  ];
  return gaps.reduce(
    (sum, gap) => sum + (1 - smoothstep((gap - margin) / comfort)),
    0
  );
}

const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

function idealRect(
  { anchor, size, gap, edgeInset }: PlacementInput,
  side: Side,
  align: Align
): Rect {
  const c = center(anchor);
  const { width: w, height: h } = size;
  if (side === 'left' || side === 'right') {
    const x = side === 'left' ? anchor.x - gap - w : right(anchor) + gap;
    const y =
      align === 'start'
        ? c.y - edgeInset
        : align === 'center'
          ? c.y - h / 2
          : c.y - h + edgeInset;
    return rect(x, y, w, h);
  }
  const y = side === 'top' ? anchor.y - gap - h : bottom(anchor) + gap;
  const x =
    align === 'start'
      ? c.x - edgeInset
      : align === 'center'
        ? c.x - w / 2
        : c.x - w + edgeInset;
  return rect(x, y, w, h);
}
