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
import type { Side } from '../site.config.ts';

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
const SHIFT_COST = 1; // per px moved to fit the viewport
const SIDE_RANK_COST = 40;
const ALIGN_RANK_COST = 10;

/**
 * Chooses where a dialog goes relative to its anchor.
 *
 * - `docked`: a sheet centred horizontally on the half of the viewport away
 *   from the anchor (its width comes from CSS).
 * - `floating`: tries each side × alignment, clamps it into the viewport, and
 *   picks the candidate that best avoids covering the anchor and `avoid`
 *   areas while moving least from its ideal spot.
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
  const { anchor, size, viewport, margin, sides, avoid = [] } = input;
  const area = size.width * size.height || 1;
  const anchorZone = inflate(anchor, 4);

  let best: (PlacementResult & { score: number }) | null = null;
  sides.forEach((side, sideRank) => {
    ALIGNS.forEach((align, alignRank) => {
      const ideal = idealRect(input, side, align);
      const fitted = rect(
        clamp(
          ideal.x,
          viewport.x + margin,
          right(viewport) - margin - size.width
        ),
        clamp(
          ideal.y,
          viewport.y + margin,
          bottom(viewport) - margin - size.height
        ),
        size.width,
        size.height
      );
      const shift = Math.abs(fitted.x - ideal.x) + Math.abs(fitted.y - ideal.y);
      const avoidOverlap = avoid.reduce(
        (sum, r) => sum + intersectionArea(fitted, r),
        0
      );
      const score =
        (intersectionArea(fitted, anchorZone) / area) * ANCHOR_OVERLAP_COST +
        (avoidOverlap / area) * AVOID_OVERLAP_COST +
        shift * SHIFT_COST +
        sideRank * SIDE_RANK_COST +
        alignRank * ALIGN_RANK_COST;
      if (!best || score < best.score) best = { rect: fitted, side, score };
    });
  });

  // `sides` is never empty in practice; fall back to docking if it is.
  if (!best) return dock(input);
  const { rect: chosen, side } = best;
  return { rect: chosen, side };
}

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
