import { definePage } from '../../site/define-page.ts';
import {
  hushVoice,
  screenVoice,
  sillyVoice,
  softVoice,
} from '../../site/voices.ts';
import type {
  BlobConfig,
  HotspotConfig,
  MobileSocials,
} from '../../site/types.ts';

/*
 * The home page: the bus stop scene with clickable blobs and the clickable
 * screen.
 */

export default definePage<HomePage>({
  id: 'home',
  path: '/',
  title: null,
  description:
    'Eric Folino - Musician & Artist. Discover his latest music and updates.',

  blobs: [
    {
      svg: 'pink',
      label: 'Pink blob',
      width: { wide: 19.5, compact: 27 },
      position: { wide: { x: 14, y: 2 }, compact: { x: 6, y: 0 } },
      dialog: {
        title: 'THE INEFFABLE BLOB',
        voice: softVoice,
        body: [
          {
            kind: 'quote',
            text: '“I am not merely as an unknowable shape, but rather the vestibule of the unfeeling edges of reality.”',
          },
          {
            kind: 'narration',
            text: '*You feel as if this blob is your friend.',
          },
        ],
      },
    },
    {
      svg: 'yellow',
      label: 'Yellow blob',
      width: { wide: 11, compact: 13 },
      position: { wide: { x: 86.5, y: 7 }, compact: { x: 84, y: -4 } },
      dialog: {
        title: 'THE ATAVISTIC CLOD',
        voice: hushVoice,
        body: [
          {
            kind: 'quote',
            text: '“Beneath the covers, I am unable to label myself not a human.”',
          },
          {
            kind: 'narration',
            text: '*You recall a memory not quite yours.',
          },
        ],
      },
    },
    {
      svg: 'blue',
      label: 'Blue blob',
      width: { wide: 7.8, compact: 9 },
      position: { wide: { x: 2.5, y: 37 }, compact: { x: 6, y: 52 } },
      dialog: {
        title: 'THE PROGENITORIAL SMUDGE',
        body: [
          {
            kind: 'quote',
            text: "“Have you seen a silly splotch anywhere? I can't find them.”",
          },
          {
            kind: 'narration',
            text: '*You look down sheepishly at the sidewalk.',
          },
        ],
      },
    },
    {
      svg: 'green',
      label: 'Green blob',
      width: { wide: 17.5, compact: 23 },
      position: { wide: { x: 73.5, y: 75 }, compact: { x: 68, y: 66 } },
      dialog: {
        title: 'THE SILLY SPLOTCH',
        voice: sillyVoice,
        body: [
          {
            kind: 'quote',
            text: '“Hiiii! I am a little teeny tiny splotch. {wave}I love you!{/wave}”',
          },
          {
            kind: 'narration',
            text: '*You chuckle.',
          },
        ],
      },
    },
  ],

  /**
   * Where the social links go on mobile: 'corner' (buttons in the bottom
   * right corner) or 'title' (above the title, like on desktop).
   */
  mobileSocials: 'title',

  /**
   * The glowing bus stop screen in the background photo, clickable like the
   * blobs. Its position comes from the photo (see photo.json, made by
   * `npm run images`).
   */
  screen: {
    label: 'Bus stop screen',
    dialog: {
      title: "THE GHOST'S FINGERPRINT",
      voice: screenVoice,
      body: [
        {
          kind: 'quote',
          text: "{scramble:loop}{float}“I feel like we're one and the same.”{/float}{/scramble:loop}",
        },
        {
          kind: 'narration',
          text: '*You feel dizzy.',
        },
      ],
    },
  },
});

interface HomePage {
  blobs: BlobConfig[];
  screen: HotspotConfig;
  mobileSocials: MobileSocials;
}
