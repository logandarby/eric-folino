/*
 * How every poem's page looks (src/pages/poem/).
 */

/**
 * Pixel-art frames from vilemagus (vilemagus.neocities.org/pages/assets.html),
 * free to use and kept in src/assets/borders/. Each is one colour on
 * transparent, cut into a 3×3 grid for `border-image`: the corners stay,
 * the edges repeat.
 */
export const borders = {
  vines: {
    /** Pixels in from each edge to cut the corners at. */
    slice: 18,
    /** How bright its colour is, 0–255, to turn it the right grey. */
    luminance: 88,
  },
  waves: { slice: 16, luminance: 255 },
} as const;

export type BorderName = keyof typeof borders;

export const poemConfig: {
  /** The frame around each poem. */
  border: {
    /** Which one (a name from `borders`), or null for none. */
    name: BorderName | null;
    /** Its grey, 0 (black) to 1 (white); low blends into the background. */
    shade: number;
    /** How many screen pixels each of its pixels takes up. */
    scale: number;
  };
} = {
  border: { name: 'vines', shade: 0.3, scale: 2 },
};
