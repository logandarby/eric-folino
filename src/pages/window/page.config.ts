import { palettes } from '../../gl/dither.ts';
import { definePage } from '../../site/define-page.ts';
import type { BlobConfig } from '../../site/blobs.ts';

/*
 * Window: a desk and chair by a window, cut out of their room, with Mars
 * going by outside. Not linked from anywhere yet, and kept out of search
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

  /**
   * The scene's look: Dithermark's "Pueblo" palette, with each dither
   * pixel `pixelSize` CSS pixels across. Palettes are in src/gl/dither.ts.
   */
  dither: { palette: palettes.pueblo, pixelSize: 1 },

  /**
   * The blobs (src/site/blobs.ts), saying something else here. Their
   * width and position are shares (%) of the desk picture, the same on
   * every screen, since the picture scales as a whole.
   */
  blobs: [
    {
      blob: 'pink',
      width: { wide: 30, compact: 30 },
      position: { wide: { x: 4, y: 12 }, compact: { x: 4, y: 12 } },
      dialog: {
        body: [
          {
            kind: 'quote',
            text: 'I cut the moon in the amount and atmosphere to mix the PSI container belt, but right now the experiment outflow supports a non-negligable hypothesis. What do you think?',
          },
          {
            kind: 'narration',
            text: "You don't have anything to add.",
          },
        ],
      },
    },
    {
      blob: 'yellow',
      width: { wide: 14, compact: 14 },
      position: { wide: { x: 8, y: 40 }, compact: { x: 8, y: 40 } },
      dialog: {
        body: [
          {
            kind: 'quote',
            text: "Looking out here, I can't seem to remember my name. Can you?",
          },
          {
            kind: 'narration',
            text: 'You think... {pause}Yeah you do, {pause}duh.',
          },
        ],
      },
    },
    {
      blob: 'blue',
      width: { wide: 9, compact: 9 },
      position: { wide: { x: 58, y: 55 }, compact: { x: 58, y: 55 } },
      dialog: {
        body: [
          {
            kind: 'quote',
            text: "I {shake}still{/shake} can't find them! Can you check under the desk?",
          },
          {
            kind: 'narration',
            text: "You really don't want to, but alas.",
          },
        ],
      },
    },
    {
      blob: 'green',
      width: { wide: 22, compact: 22 },
      position: { wide: { x: 74, y: 84 }, compact: { x: 74, y: 84 } },
      dialog: {
        body: [
          {
            kind: 'quote',
            text: '{wave}Ohohohoo!{/wave} It smells under here.',
          },
          {
            kind: 'narration',
            text: 'You sniff.{pause} Yep.',
          },
        ],
      },
    },
  ],
});
