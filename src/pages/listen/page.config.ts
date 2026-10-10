import { palettes } from '../../gl/dither.ts';
import { definePage } from '../../site/define-page.ts';

/*
 * Listen: put a tape in the deck and it plays through a Spotify embed,
 * which is the deck's screen. In the nav (site.config.ts).
 */

export interface Tape {
  title: string;
  /** What's written on its masking tape, if not the title. */
  label?: string;
  /** The track Spotify plays. */
  uri: string;
  /** Which cassette it's drawn as: art/cassette-<n>.webp. */
  art: number;
  /** The masking tape its title is written on: art/masking-tape-<n>.webp. */
  strip: number;
  /** How much the masking tape is turned, in degrees (clockwise). */
  tilt: number;
}

export default definePage<{
  tapes: Tape[];
  label: { y: number; width: number };
  hint: { text: string; blob: string };
  sounds: { handle: number; insert: number; key: number; eject: number };
  dither: { palette: string[]; pixelSize: number };
}>({
  id: 'listen',
  path: '/listen/',
  title: 'Listen',
  description: 'Put a tape in.',

  /** The tapes on the shelf, one single each. */
  tapes: [
    {
      title: 'Standby',
      uri: 'spotify:track:3LsbmFh0qLVrLleane46Pz',
      art: 1,
      strip: 15,
      tilt: -3,
    },
    {
      title: 'The World Began This Morning',
      label: 'TWBTM',
      uri: 'spotify:track:49kZ3jyYjgoptpKJnGUphG',
      art: 2,
      strip: 68,
      tilt: 2,
    },
    {
      title: 'Frail Things',
      uri: 'spotify:track:2qaNqkPDXnfp2Yjvxd7z6E',
      art: 3,
      strip: 17,
      tilt: -1.5,
    },
  ],

  /**
   * Where the masking tape goes on a cassette, as shares of it: its
   * centre's height, and its width.
   */
  label: { y: 0.27, width: 0.84 },

  /**
   * The speech bubble over the shelf until a tape first goes in: what it
   * says, and which of the home page's blobs (src/assets/blobs/) it's
   * shaped like.
   */
  hint: { text: 'Click to drop the cassette in and play!', blob: 'pink' },

  /**
   * The deck's sounds' volumes (src/assets/audio/cassette/), on top of the
   * site's sound settings: picking up a tape (hover, one of six), putting
   * it in, pressing PLAY or STOP, and ejecting it. 1 is the file as
   * recorded; above that is louder. They're set so all four peak about
   * the same: the click's file is much louder than the others.
   */
  sounds: { handle: 2.5, insert: 3, key: 1, eject: 2.5 },

  /**
   * The scene's look: Dithermark's "Pueblo" palette, with each dither
   * pixel `pixelSize` CSS pixels across. Palettes are in src/gl/dither.ts.
   */
  dither: { palette: palettes.pueblo, pixelSize: 2 },
});
