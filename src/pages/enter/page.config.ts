import { definePage } from '../../site/define-page.ts';
import type { HotspotConfig } from '../../site/types.ts';
import { screenVoice } from '../../site/voices.ts';

/*
 * Enter: an old TV in an empty room, playing static, that asks if you'd
 * like to come in. The nav's "Secret" leads here.
 */

export interface TvConfig extends HotspotConfig {
  /**
   * The TV, in pixels of the photo (assets-src/strange-tv.png): what the
   * invisible button covers. The screen's own place is found from the
   * photo's hole (tv/tv.json, made by `npm run tv`).
   */
  body: { x: number; y: number; width: number; height: number };
  /**
   * The call to enter, above the TV in the Cordata font. Clicking it does
   * what clicking the TV does.
   */
  cta: {
    text: string;
    /** Font size, as a share of the TV's width. */
    size: number;
  };
  /** How bright the static is, 0–1. It drifts slowly between the two. */
  signal: { min: number; max: number };
  /** The static's colour at full brightness, "#rrggbb". */
  tint: string;
  /** The CRT look over the picture (tv.frag), after daenavan's crt-threejs. */
  crt: {
    /** How much the glass bulges. */
    curvature: number;
    /** Scanlines down the screen (fewer on small screens, so they stay sharp). */
    scanlines: number;
    /** How dark the gaps between scanlines are, 0–1. */
    scanlineDepth: number;
    /** Colour fringing: how far red and blue drift apart, as a share of the width. */
    aberration: number;
    /** How dark the corners get. */
    vignette: number;
    /** How much the brightness wavers, 0–1. Kept tiny: it never flashes. */
    flicker: number;
  };
}

export default definePage<{ tv: TvConfig }>({
  id: 'enter',
  path: '/enter/',
  title: 'Enter',
  description: 'Enter the world of Eric Folino.',

  tv: {
    label: 'A strange TV',
    dialog: {
      title: 'THE STRANGE TV',
      voice: screenVoice,
      instant: true,
      body: [
        {
          kind: 'text',
          text: '{fast}enter the world of {rainbow}eric folino?{/rainbow}{/fast}',
        },
        {
          kind: 'narration',
          text: '{fast}*The TV tells you what to feel. You feel frantic.{/fast}',
        },
      ],
      actions: [{ label: 'yes', href: '/iris' }],
    },
    body: { x: 1538, y: 888, width: 726, height: 724 },
    cta: { text: 'enter?', size: 0.13 },
    signal: { min: 0.72, max: 0.95 },
    tint: '#d4b4ff',
    crt: {
      curvature: 0.18,
      scanlines: 180,
      scanlineDepth: 0.35,
      aberration: 0.003,
      vignette: 0.9,
      flicker: 0.02,
    },
  },
});
