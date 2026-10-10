import { palettes } from '../../gl/dither.ts';
import type { BlobConfig } from '../../site/blobs.ts';
import { definePage } from '../../site/define-page.ts';

/*
 * Secret: a fridge on the moon, with a TV on it and polaroids stuck to it,
 * each leading to another page. The nav's "Secret" leads here. Kept out
 * of search engines. The art is made from assets-src/secret/ by
 * `npm run secret`.
 */

/** A polaroid on the fridge, leading to a page. */
export interface Polaroid {
  /** The page it leads to. */
  href: string;
  /** Written under the photo, in Cordata. Also the link's name. */
  caption: string;
  /**
   * Its photo, a file in art/photos/ (any shape: it's cropped to a
   * square). Without one, it's not developed yet.
   */
  photo?: string;
  /** Its top left, as a share (%) of the fridge's width and height. */
  x: number;
  y: number;
  /** Its width, as a share (%) of the fridge's width. */
  width: number;
  /** How much it's turned, in degrees (clockwise). */
  tilt: number;
}

export default definePage<{
  fridge: { alt: string };
  /** The TV on top of the fridge. */
  tv: {
    alt: string;
    /** Its width, and how far it's in from the fridge's left, as shares of the fridge's width. */
    width: number;
    x: number;
    /**
     * How far down it's sat on the fridge, as a share of its own height,
     * so its feet are on the top rather than in front of it.
     */
    sink: number;
    /** How much it's turned, in degrees (clockwise). */
    tilt: number;
  };
  /**
   * The moon, a panorama the view pans across and back, taking `seconds`
   * each way (it holds still if motion is reduced), shown at `brightness`
   * (1 as photographed) so the fridge stands out.
   */
  moon: { alt: string; seconds: number; brightness: number };
  polaroids: Polaroid[];
  blobs: BlobConfig[];
  /** The captions' size, as a share of a polaroid's width. */
  caption: { size: number };
  /**
   * The polaroids' paper sounds' volume (src/assets/audio/paper/), on top
   * of the site's sound settings: one of paper-1 to 7 at random on hover,
   * and paper-click on a click, with the site's own click. 1 is the file as recorded. Each
   * fades out over its last `fadeOut` seconds.
   */
  sounds: { paper: number; fadeOut: number };
  dither: { palette: string[]; pixelSize: number };
}>({
  id: 'secret',
  path: '/secret/',
  title: 'Secret',
  description: 'A fridge on the moon.',
  noindex: true,

  fridge: { alt: 'A cream fridge' },
  tv: {
    alt: 'An orange TV',
    width: 0.55,
    x: 0.22,
    sink: 0.02,
    tilt: -3,
  },
  moon: { alt: 'The surface of the moon', seconds: 100, brightness: 0.45 },

  polaroids: [
    {
      href: '/window/',
      caption: 'THE WINDOW',
      photo: 'window.webp',
      x: 50,
      y: 3,
      width: 46,
      tilt: 4,
    },
    {
      href: '/iris/',
      caption: 'THE EYES',
      photo: 'iris.webp',
      x: 8,
      y: 42,
      width: 46,
      tilt: -5,
    },
    {
      href: '/mysteries/',
      caption: 'MYSTERIES?',
      photo: 'mysteries.webp',
      x: 46,
      y: 64,
      width: 46,
      tilt: 3,
    },
  ],

  /**
   * The blobs (src/site/blobs.ts), around the fridge. Their width and
   * position are shares (%) of the fridge with the TV on it: below 0 or
   * over 100 is beside it, on the moon. Phones have less room either side.
   */
  blobs: [
    {
      blob: 'pink',
      width: { wide: 55, compact: 27 },
      position: { wide: { x: -70, y: 88 }, compact: { x: -24, y: 94 } },
      dialog: {
        body: [
          {
            kind: 'quote',
            text: "Don't tell Health Canada I'm here.",
          },
        ],
      },
    },
    {
      blob: 'yellow',
      width: { wide: 30, compact: 15 },
      position: { wide: { x: -125, y: 84 }, compact: { x: -22, y: 85 } },
      dialog: {
        body: [
          {
            kind: 'quote',
            text: "I wonder what poetry the Taoists would've written here.",
          },

          {
            kind: 'narration',
            text: 'You are somewhat interested.',
          },
        ],
      },
    },
    {
      // On top of the fridge, beside the TV.
      blob: 'blue',
      width: { wide: 14, compact: 14 },
      position: { wide: { x: 80, y: 6.5 }, compact: { x: 80, y: 6.5 } },
      dialog: {
        body: [
          {
            kind: 'quote',
            text: "I can't believe I'm up here. Can someone get me down?",
          },
          {
            kind: 'narration',
            text: "You definitely can't.",
          },
        ],
      },
    },
    {
      blob: 'green',
      width: { wide: 50, compact: 25 },
      position: { wide: { x: 115, y: 86 }, compact: { x: 99, y: 92 } },
      dialog: {
        body: [
          {
            kind: 'quote',
            text: 'Is there any food here? {wave}Ohohoo!{/wave}',
          },
        ],
      },
    },
  ],

  caption: { size: 0.12 },

  sounds: { paper: 1, fadeOut: 0.15 },

  /**
   * The scene's look: Dithermark's "Pueblo" palette, with each dither
   * pixel `pixelSize` CSS pixels across. Palettes are in src/gl/dither.ts.
   */
  dither: { palette: palettes.pueblo, pixelSize: 2 },
});
