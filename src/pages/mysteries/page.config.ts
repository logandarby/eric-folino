import { definePage } from '../../site/define-page.ts';
import type { LayoutName } from '../../site/types.ts';

/** A background shader: warp.frag or corridor.frag. */
export type MysteriesShader = 'warp' | 'corridor';

/*
 * Mysteries: links to strange things, here and elsewhere. A polaroid on
 * the secret page's fridge leads here, and its back link back there.
 * Kept out of search engines.
 */

/** A strange thing. */
export interface Mystery {
  label: string;
  /**
   * Where it is: a full address for somewhere else (opens in a new tab,
   * with the site's name under it), or a path for a page here.
   */
  href: string;
}

export default definePage<{
  /** Under the title. */
  text: string;
  mysteries: Mystery[];
  background: {
    shader: MysteriesShader;
    /** How fast it moves: 1 as written in the shader. */
    speed: number;
    palette: string[];
    pixelSize: number;
    /**
     * Darker behind the text block, so the text reads: an oval round it,
     * `opacity` (0–1) in the middle, fading out to `spread` CSS pixels
     * past its edges. On phones the block fills most of the screen, so
     * less of both.
     */
    shade: Record<LayoutName, { opacity: number; spread: number }>;
  };
}>({
  id: 'mysteries',
  path: '/mysteries/',
  title: 'Mysteries',
  description: 'Mysteries.',
  noindex: true,
  irisWipe: 'light',

  text: '',

  mysteries: [
    {
      label: 'Ineffability',
      href: '/ineffability/',
    },
    {
      label: 'The Self-Referencing Question-Answer (Mimethesis)',
      href: '/self-reference/',
    },
    {
      label: 'Ritual and the Consciousness Monoculture',
      href: 'https://ribbonfarm.com/2015/01/08/ritual-and-the-consciousness-monoculture/',
    },
  ],

  /**
   * The moving picture behind it all, dithered to `palette` with each
   * dither pixel `pixelSize` CSS pixels across. Kept dark, so the text
   * reads over it. To compare them, `?bg=warp` or `?bg=corridor` on the
   * address picks one for that visit.
   */
  background: {
    shader: 'warp',
    speed: 1,
    // Pueblo's darkest colours, and black.
    palette: ['#000000', '#060338', '#252645', '#203e8a', '#7a3046', '#2d4130'],
    pixelSize: 3,
    shade: {
      wide: { opacity: 0.65, spread: 160 },
      compact: { opacity: 0.45, spread: 60 },
    },
  },
});
