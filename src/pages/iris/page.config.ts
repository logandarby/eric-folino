import { palettes, PIXELATE } from '../../gl/dither.ts';
import { definePage } from '../../site/define-page.ts';
import type { DialogContent, HotspotConfig } from '../../site/types.ts';
import { hushVoice } from '../../site/voices.ts';

/*
 * Iris: four eyes on black that watch the pointer, over a wall of text.
 * Not linked from anywhere yet, and kept out of search engines.
 */

export interface EyeConfig extends HotspotConfig {
  /** Which of the two columns it sits in. */
  column: 'left' | 'right';
  /** Width, as a share of its column (CSS). Never under `--eye-min-width` (iris.css). */
  width: string;
  /** Pushed right within its column (CSS, % of the column). */
  x: string;
  /** Space above it (CSS). Different in each column, so they stagger. */
  y: string;
  /**
   * How far the iris can look, as a share of the eye's width and height.
   * Past the hole in the skin, it slips behind the skin.
   */
  reach: { x: number; y: number };
}

/** Placeholder text, to be written. */
const eyeDialog = (title: string, text: string, text2: string): DialogContent => ({
  title,
  voice: hushVoice,
  // instant: true,
  body: [{ kind: 'quote', text }, { kind: "narration", text: text2 }],
});

export default definePage<{
  eyes: EyeConfig[];
  backdrop: { text: string; lines: number };
  dither: { palette: string[]; scale: number; pixelSize: number };
}>({
  id: 'iris',
  path: '/iris/',
  title: 'More eyes',
  description: 'More eyes are good.',
  noindex: true,

  /** The text repeated behind the eyes, in lines spread down the page. */
  backdrop: { text: 'THE TV MAN IS CRAZY', lines: 20 },

  /**
   * The eyes' look, like Dithermark's "Imperial" palette with Pixelate 2,
   * with each dither pixel `pixelSize` CSS pixels across. Palettes are in
   * src/gl/dither.ts.
   */
  dither: { palette: palettes.imperial, scale: PIXELATE[2], pixelSize: 3.5 },

  /**
   * The eyes, in reading order. Each one's picture is eyes/eye-<n>.webp
   * (made by `npm run eyes`).
   */
  eyes: [
    {
      label: 'The first eye',
      dialog: eyeDialog('EYE I', 'The world is melting and it\'s dripping out my ears.', '*Are you Tiny Tim?'),
      column: 'left',
      width: '90%',
      x: '0%',
      y: '0vh',
      reach: { x: 0.17, y: 0.1 },
    },
    {
      label: 'The second eye',
      dialog: eyeDialog('EYE II', 'Is your body made of fabric, or is it just me?', '*You feel around a bit. Nope.'),
      column: 'right',
      width: '80%',
      x: '14%',
      y: '18vh',
      reach: { x: 0.16, y: 0.08 },
    },
    {
      label: 'The third eye',
      dialog: eyeDialog('EYE III', 'In a parking garage, I saw a stange entity...', '*Ok?'),
      column: 'left',
      width: '82%',
      x: '10%',
      y: '6vh',
      reach: { x: 0.15, y: 0.08 },
    },
    {
      label: 'The fourth eye',
      dialog: eyeDialog('EYE IV', '', '*Your hair is tied to the bedpost. You sense a cry for answers.'),
      column: 'right',
      width: '94%',
      x: '2%',
      y: '10vh',
      reach: { x: 0.19, y: 0.11 },
    },
  ],
});
