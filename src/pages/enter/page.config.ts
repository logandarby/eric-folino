import type { CrtCollage } from '../../components/collage-video/collage-video.ts';
import { definePage } from '../../site/define-page.ts';
import type { HotspotConfig } from '../../site/types.ts';
import { screenVoice } from '../../site/voices.ts';

/*
 * Enter: an old TV in an empty room, playing the band through static, that asks if you'd
 * like to come in. Not linked from anywhere for now.
 */

/** The TV, with what it plays (see collage-video.ts). */
export interface TvConfig extends HotspotConfig, CrtCollage {
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
          text: '{fast}The TV tells you what to feel. You feel frantic.{/fast}',
        },
      ],
      actions: [{ label: 'yes', href: '/iris' }],
    },
    body: { x: 1538, y: 888, width: 726, height: 724 },
    cta: { text: 'enter?', size: 0.13 },
    look: 'crt',
    signal: { min: 0.72, max: 0.95 },
    photoSeconds: 0.5,
    static: { min: 0.15, max: 0.9, seconds: 1.2, shape: 2 },
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
