export type TailDirection = 'down' | 'up' | 'left' | 'right';

/**
 * Each tail, as shares of the blob's box: two corners tucked inside the
 * blob, then the tip.
 */
export const TAILS: Record<TailDirection, [number, number][]> = {
  down: [
    [0.4, 0.8],
    [0.56, 0.8],
    [0.43, 1.4],
  ],
  up: [
    [0.4, 0.2],
    [0.56, 0.2],
    [0.43, -0.4],
  ],
  left: [
    [0.15, 0.4],
    [0.15, 0.66],
    [-0.22, 0.62],
  ],
  right: [
    [0.85, 0.4],
    [0.85, 0.66],
    [1.22, 0.62],
  ],
};
/** The tail's rounding, in the blob's units (the blob's is the site's). */
export const TAIL_CORNER_RADIUS = 4;
