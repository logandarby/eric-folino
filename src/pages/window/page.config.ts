import { palettes } from '../../gl/dither.ts';
import { definePage } from '../../site/define-page.ts';
import type { BlobConfig } from '../../site/blobs.ts';

/*
 * Window: a desk and chair by a window, cut out of their room, with Mars
 * going by outside. The enter page's "yes" leads here (by way of the
 * secret page's window polaroid), the window on to the eyes (/iris/),
 * and its back link to the secret page. Kept out of search
 * engines.
 */

/** A box, as shares of the desk picture's width and height. */
export interface Share {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default definePage<{
  desk: {
    /** art/desk.webp's size: the room cut away, and the panes. */
    width: number;
    height: number;
    alt: string;
    /** Where the video plays, behind the panes (and the frame's edges). */
    window: Share;
  };
  /**
   * The window as a link, invisible but outlined on hover (or keyboard
   * focus), like the home page's bus stop screen. `box` is around its
   * frame, as shares of the desk picture.
   */
  link: { href: string; label: string; box: Share };
  dither: { palette: string[]; pixelSize: number };
  blobs: BlobConfig[];
}>({
  id: 'window',
  path: '/window/',
  title: 'Window',
  description: 'A desk by a window.',
  noindex: true,

  desk: {
    width: 824,
    height: 1500,
    alt: 'A wooden desk and chair by a window, looking out on Mars',
    window: { x: 0.475, y: 0.045, width: 0.44, height: 0.505 },
  },

  link: {
    href: '/iris/',
    label: 'Look out the window',
    box: { x: 0.4, y: 0, width: 0.59, height: 0.57 },
  },

  /**
   * The scene's look: Dithermark's "Pueblo" palette, with each dither
   * pixel `pixelSize` CSS pixels across. Palettes are in src/gl/dither.ts.
   */
  dither: { palette: palettes.pueblo, pixelSize: 1 },

  /**
   * The blobs (src/site/blobs.ts); what they say here is in
   * src/site/blob-dialogs.ts. Their width and position are shares (%) of
   * the desk picture, the same on every screen, since the picture scales
   * as a whole.
   */
  blobs: [
    {
      blob: 'pink',
      width: { wide: 30, compact: 30 },
      position: { wide: { x: 4, y: 12 }, compact: { x: 4, y: 12 } },
    },
    {
      blob: 'yellow',
      width: { wide: 14, compact: 14 },
      position: { wide: { x: 8, y: 40 }, compact: { x: 8, y: 40 } },
    },
    {
      blob: 'blue',
      width: { wide: 9, compact: 9 },
      position: { wide: { x: 58, y: 55 }, compact: { x: 58, y: 55 } },
    },
    {
      blob: 'green',
      width: { wide: 22, compact: 22 },
      position: { wide: { x: 74, y: 84 }, compact: { x: 74, y: 84 } },
    },
  ],
});
