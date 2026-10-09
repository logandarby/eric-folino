import { definePage } from '../../site/define-page.ts';
import type { ListenConfig } from '../../components/listen/listen.ts';
import { hushVoice, sillyVoice, softVoice } from '../../site/voices.ts';
import type { BlobConfig, MobileSocials } from '../../site/types.ts';

/*
 * The home page: the bus stop scene with clickable blobs, and the screen
 * that plays our music.
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
        title: 'THE NONSENSICAL BLOB',
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
            text: "“Have you seen a silly splotch {shake}anywhere?{/shake} I can't find them.”",
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
   * The glowing bus stop screen in the background photo, which plays a
   * clip of the music with the collage video on the screen. Its position
   * comes from the photo (see photo.json, made by `npm run images`); the
   * song is src/assets/audio/standby.mp3.
   */
  listen: {
    label: 'Listen to “Standby”',
    cta: 'Listen?',
    song: { title: 'Standby', artist: 'Eric Folino', volume: 0.8 },
    // A lit ad panel: bright, blooming into the night.
    video: {
      look: 'panel',
      signal: { min: 0.9, max: 1 },
      photoSeconds: 0.5,
      bloom: { spread: 0.5, radius: 0.2, strength: 3, over: 0.25 },
      // The video's light on the pavement below it, and the colour it
      // gives the reflections.
      reflections: { light: 1.2, saturation: 0.3 },
      // Every photo about as light as the next, and a little faded.
      tone: { exposure: 0.65, maxGain: 5, saturation: 0.5, lift: 0.3 },
    },
  },
});

interface HomePage {
  blobs: BlobConfig[];
  listen: ListenConfig;
  mobileSocials: MobileSocials;
}
