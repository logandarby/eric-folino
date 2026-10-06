/**
 * Site-wide configuration. Content, layout and animation tuning live here so
 * they can be edited without touching component code.
 *
 * This file is imported both by the browser bundle and by the build-time HTML
 * templates (see build/), so it must stay plain data with no imports.
 *
 * Positions (x, y, width) are percentages of the hero "stage" box. Font sizes
 * are percentages of the stage width (CSS `cqw` units), so the whole
 * composition scales together.
 */

export type LayoutName = 'wide' | 'compact';

export interface DialogBlock {
  /** `quote` and `narration` render in Courier Prime (narration is italic). */
  kind: 'quote' | 'narration' | 'text';
  /**
   * May contain effect tags, e.g. 'You feel {wave}dizzy{/wave}.' Dialog
   * titles can use them too. Effects are skipped with reduced motion on.
   */
  text: string;
}

export interface DialogContent {
  title: string;
  body: DialogBlock[];
  /** How this dialog's text blips sound as it types; falls back to sound.blip.voice. */
  voice?: Partial<DialogVoice>;
}

/** The "talking" blip a dialog makes per typed letter. */
export interface DialogVoice {
  /** Base pitch in Hz; for 'noise', the centre of the breathy hiss. */
  pitch: number;
  /**
   * 'square' is chiptune-y, 'triangle' softer, 'sine' softest, 'sawtooth'
   * buzzy, and 'noise' whispers (pink noise; pitch is where it's centred).
   */
  wave: 'square' | 'triangle' | 'sine' | 'sawtooth' | 'noise';
  /** Fade-in per letter, in ms. Default 3. */
  attackMs?: number;
  /** Fade-out per letter, in ms. Default 40. */
  releaseMs?: number;
  /** Low-pass filter cutoff in Hz; lower is smoother and darker. Default 2400. Not for 'noise'. */
  cutoffHz?: number;
  /**
   * Stacks several copies of the wave, spread out in pitch, for a thicker,
   * wavering sound (like the screen's hum). Not for 'noise'.
   */
  unison?: {
    /** How many copies, 2 or more. */
    voices: number;
    /** Pitch spread between the lowest and highest copy, in cents. */
    spreadCents: number;
  };
}

interface SoundSettings {
  /** 0–1, before the channel and master volumes. */
  volume: number;
  /** Plays at most once per this many ms; extra plays are dropped. */
  minGapMs: number;
}

export interface SoundConfig {
  /**
   * On for first-time visitors (unless they prefer reduced motion). Either
   * way audio can only start after their first click or key press
   * (browser rule).
   */
  enabledByDefault: boolean;
  /** Master volume, 0–1. */
  volume: number;
  /** Volume per channel, 0–1: ui (hover, press, swoosh), voice (blips), ambient (hum). */
  channels: { ui: number; voice: number; ambient: number };
  /** Most one-shot sounds playing at once; the oldest is cut off beyond this. */
  maxVoices: number;
  /** Audio is suspended after this long with nothing playing, to save power. */
  idleSuspendMs: number;
  /** Tick when a button or link is hovered or tabbed to. */
  hover: SoundSettings & {
    /** The same element won't tick again within this many ms. */
    sameTargetGapMs: number;
  };
  /** Clunk when a button or link is pressed. */
  press: SoundSettings;
  /** Swoosh when a dialog opens / closes. */
  open: SoundSettings & { durationMs: number };
  close: SoundSettings & { durationMs: number };
  /** Per-letter voice blip as dialog text types out. */
  blip: SoundSettings & {
    voice: DialogVoice;
    /** Random pitch change per letter, as a fraction (0.08 = ±8%). */
    pitchJitter: number;
  };
  /** Electric hum while the bus stop screen is hovered or focused. */
  hum: {
    volume: number;
    /** Mains frequency in Hz. */
    pitch: number;
    fadeMs: number;
  };
}

export interface Placement {
  x: number;
  y: number;
}

export interface TextPlacement extends Placement {
  /** Percentage of the stage width (CSS `cqw`-style). */
  fontSize: number;
  /** Whether `x` is the element's left edge (default) or its centre. */
  align?: 'start' | 'center';
}

export interface BlobConfig {
  /** File name (without extension) in src/assets/blobs/. Colour comes from the SVG. */
  svg: string;
  /** Accessible name for the blob button. */
  label: string;
  /** Width as a percentage of the stage width. */
  width: Record<LayoutName, number>;
  position: Record<LayoutName, Placement>;
  /** Shown when the blob is clicked. */
  dialog: DialogContent;
}

export interface HotspotConfig {
  /** Accessible name for the button. */
  label: string;
  /** Shown when it's clicked. */
  dialog: DialogContent;
}

export interface StageLayout {
  /** Any CSS length. Height follows from `aspectRatio` (width / height). */
  width: string;
  aspectRatio: number;
  title: TextPlacement;
  nav: TextPlacement;
}

export interface PageConfig {
  id: string;
  path: string;
  /** Used for the <title> tag; `null` means just the site name. */
  title: string | null;
  description: string;
  /**
   * Show the clickable blobs around the title, the clickable screen and the
   * "?" button.
   */
  blobs?: boolean;
  /** Keep the page out of search engines. */
  noindex?: boolean;
  /**
   * Shown in a dialog pointing at this page's nav item (or the first nav
   * item when the page isn't in the nav). Used for mock pages.
   */
  placeholder?: DialogContent;
}

export type Side = 'left' | 'right' | 'top' | 'bottom';

export interface FlickerConfig {
  enabled: boolean;
  /** Random pause between flicker bursts. */
  minGapMs: number;
  maxGapMs: number;
  /** Blinks per burst, at most 3 to stay under the WCAG flash limit. */
  maxBlinks: number;
  /** Chance a blink is a long brown-out instead of a quick stutter. */
  brownoutChance: number;
  /** How dark the flicker blinks get (0 = no change, 1 = fully off). */
  flickerDepth: number;
  /** Chance an event is a smooth dim instead of a flicker burst. */
  dimChance: number;
  /** Total length of a dim: fade down, hold, fade back up. */
  dimDurationMs: number;
  /** How far a dim goes (0 = no change, 1 = fully off). */
  dimDepth: number;
}

export interface MotionEffectConfig {
  /** One full cycle of a letter's movement. */
  periodMs: number;
  /** How far letters move, in em so it scales with the text. */
  amplitudeEm: number;
  /** Delay between one letter and the next, which makes the ripple. */
  staggerMs: number;
}

/** Tuning for the dialog text tags. See src/text/README.md. */
export interface TextEffectsConfig {
  wave: MotionEffectConfig;
  float: MotionEffectConfig;
  shake: {
    /** How long each jittered position holds. */
    intervalMs: number;
    amplitudeEm: number;
  };
  scramble: {
    /** How long a letter scrambles after typing in, before settling. */
    durationMs: number;
    /** How often scrambling letters change symbol. */
    intervalMs: number;
    /** {scramble:loop}: chance per letter per second of a glitch. */
    glitchesPerSecond: number;
    glitchMs: number;
    /** Symbols a scrambling letter cycles through. */
    symbols: string;
  };
  pacing: {
    /** {slow} with no number types this many times slower. */
    slowFactor: number;
    /** {fast} with no number types this many times faster. */
    fastFactor: number;
    /** {pause} with no number waits this long. */
    pauseMs: number;
  };
}

export interface SiteConfig {
  siteName: string;
  /** Appended to the site name in the home page <title>. */
  siteTagline: string;
  siteUrl: string;
  defaultDescription: string;
  title: string;
  titleTiltDeg: number;
  palette: string[];
  nav: { label: string; href: string }[];
  pages: PageConfig[];
  layout: { compactQuery: string };
  background: {
    portraitQuery: string;
    landscapeZoom: number;
    landscapeFocus: string;
    flicker: FlickerConfig;
  };
  stage: Record<LayoutName, StageLayout>;
  animation: {
    blobJitterIntervalMs: number;
    blobJitterAmount: number;
    blobCornerRadius: number;
    blobMinPointSpacing: number;
    titleColorCycleIntervalMs: number;
    typewriterCharMs: number;
    textEffects: TextEffectsConfig;
    spotlightFadeMs: number;
    connectorDrawMs: number;
    dialogOpenMs: number;
    dialogCloseMs: number;
    compactSpeedFactor: number;
  };
  dialog: {
    maxWidth: number;
    viewportMargin: number;
    anchorGap: number;
    edgeComfort: number;
    dimOpacity: number;
    blurPx: number;
    sidePreference: Side[];
  };
  sound: SoundConfig;
  blobs: BlobConfig[];
  screen: HotspotConfig;
  help: HotspotConfig;
  textDemo: {
    /** Key that opens the demo (KeyboardEvent.key). */
    key: string;
    /** Off: only works on the dev server. */
    inProduction: boolean;
    dialog: DialogContent;
  };
}

/*
 * Voices for dialog text blips. Give a dialog one with `voice: hushVoice`;
 * dialogs without one use `sound.blip.voice`.
 */

/** Soft and high: the default. */
export const softVoice: DialogVoice = { pitch: 620, wave: 'sine' };
/** Chirpy chiptune square wave. */
export const sillyVoice: DialogVoice = { pitch: 440, wave: 'square' };
/** Low and buzzy, like an old machine typing. */
export const typewriterVoice: DialogVoice = { pitch: 170, wave: 'sawtooth' };
/**
 * The bus stop screen: a smooth, droning stack of detuned saws, pitched at
 * a harmonic of its 60 Hz hum. Letters ease in and linger like the hush
 * voice, so they blend into one wavering drone, and the filter is low to
 * keep the saws from buzzing.
 */
export const screenVoice: DialogVoice = {
  pitch: 80,
  wave: 'sawtooth',
  attackMs: 30,
  releaseMs: 130,
  cutoffHz: 1100,
  unison: { voices: 3, spreadCents: 24 },
};
/** A hushed whisper: soft breaths of pink noise. */
export const hushVoice: DialogVoice = { pitch: 1400, wave: 'noise' };

export const siteConfig: SiteConfig = {
  siteName: 'Eric Folino',
  siteTagline: 'Musician & Artist',
  siteUrl: 'https://ericfolino.com',
  defaultDescription:
    'Eric Folino - Musician & Artist. Discover his latest music and updates.',

  title: 'ERIC FOLINO?',
  /** Tilt of the title box, in degrees (positive = clockwise). */
  titleTiltDeg: 3,
  /** Colours cycled through the title letters, in order. */
  palette: ['#F0B2F3', '#55F49D', '#F0E05A', '#64CBE0'],

  nav: [
    { label: 'HOME', href: '/' },
    { label: 'ABOUT', href: '/about/' },
    { label: 'SECRET', href: '/secret/' },
  ],

  pages: [
    {
      id: 'home',
      path: '/',
      title: null,
      description:
        'Eric Folino - Musician & Artist. Discover his latest music and updates.',
      blobs: true,
    },
    {
      id: 'about',
      path: '/about/',
      title: 'About',
      description: 'About Eric Folino.',
      placeholder: {
        title: 'ABOUT',
        body: [
          {
            kind: 'quote',
            text: '“This page is still being assembled by little critters somewhere in the dark.”',
          },
          { kind: 'narration', text: '*You hear a voice beckoning you back.' },
        ],
      },
    },
    {
      id: 'secret',
      path: '/secret/',
      title: 'Secret',
      description: 'Nothing to see here.',
      placeholder: {
        title: 'SECRET',
        voice: hushVoice,
        body: [
          { kind: 'quote', text: '“Not yet.”' },
          {
            kind: 'narration',
            text: '*You get the feeling you are being watched.',
          },
        ],
      },
    },
    {
      id: 'not-found',
      path: '/404.html',
      title: 'Lost',
      description: 'Page not found.',
      noindex: true,
      placeholder: {
        title: 'LOST?',
        body: [
          { kind: 'quote', text: '“There is nothing at this address.”' },
          { kind: 'narration', text: '*Perhaps you should head HOME.' },
        ],
      },
    },
  ],

  layout: {
    /** When this media query matches, the `compact` (mobile) layout is used. */
    compactQuery: '(max-width: 640px), (max-aspect-ratio: 4/5)',
  },

  background: {
    /** When this matches, the portrait crop of the background is served. */
    portraitQuery: '(max-aspect-ratio: 4/5)',
    /**
     * Framing of the landscape photo, matched to the Figma design: scaled
     * past "cover" by this factor and anchored at this point (CSS
     * object-position), which puts the lit bus stop middle-left.
     */
    landscapeZoom: 1.27,
    landscapeFocus: '85% 97%',
    /**
     * The bus stop ad light flickers now and then. The "lights off" image
     * is made by `npm run images` (see LIGHTS_OFF in build-images.mjs).
     */
    flicker: {
      enabled: true,
      minGapMs: 2500,
      maxGapMs: 8000,
      maxBlinks: 3,
      brownoutChance: 0.2,
      flickerDepth: 0.55,
      dimChance: 0.2,
      dimDurationMs: 1000,
      dimDepth: 0.25,
    },
  },

  stage: {
    wide: {
      width: 'min(47vw, 115dvh)',
      aspectRatio: 385 / 255,
      title: { x: 18, y: 34, fontSize: 8.2 },
      nav: { x: 18.5, y: 60, fontSize: 5 },
    },
    compact: {
      width: 'min(92vw, 52dvh)',
      aspectRatio: 1,
      title: { x: 50, y: 27, fontSize: 10.2, align: 'center' },
      nav: { x: 22, y: 52, fontSize: 6.6 },
    },
  },

  animation: {
    /** How often the blobs "boil" to a new shape. */
    blobJitterIntervalMs: 500,
    /** Max distance each blob point moves, as a fraction of the blob's average radius. */
    blobJitterAmount: 0.035,
    /**
     * Corner rounding, like border-radius, in the SVG's own units. Each
     * corner is cut back by up to this much along its edges (at most half an
     * edge), so large values give fully smooth outlines. 0 = sharp.
     */
    blobCornerRadius: 20,
    /**
     * Closest two neighbouring outline points may be, as a fraction of the
     * blob's average radius. Points closer than this are dropped, which keeps
     * the boiling smooth instead of fuzzy. 0 = keep every point.
     */
    blobMinPointSpacing: 0.3,
    /** How often the title colours step forward. */
    titleColorCycleIntervalMs: 500,
    /** Time per character in dialog text. */
    typewriterCharMs: 22,
    /**
     * Dialog text tags like {wave} and {slow} (full list and syntax in
     * src/text/README.md). {rainbow} uses `palette` and
     * `titleColorCycleIntervalMs`, so it matches the title.
     */
    textEffects: {
      wave: { periodMs: 1400, amplitudeEm: 0.12, staggerMs: 110 },
      float: { periodMs: 3600, amplitudeEm: 0.16, staggerMs: 300 },
      shake: { intervalMs: 60, amplitudeEm: 0.05 },
      scramble: {
        durationMs: 320,
        intervalMs: 60,
        glitchesPerSecond: 0.12,
        glitchMs: 200,
        symbols: '!<>-_\\/[]=+*^?#%&@ABCDEFGHJKLMNPQRSTUVWXYZ0123456789',
      },
      pacing: { slowFactor: 3, fastFactor: 3, pauseMs: 500 },
    },
    spotlightFadeMs: 160,
    connectorDrawMs: 180,
    dialogOpenMs: 260,
    dialogCloseMs: 160,
    /** Multiplier on dialog animation durations in the compact layout. */
    compactSpeedFactor: 0.8,
  },

  dialog: {
    /** Max width of a floating dialog, in px. */
    maxWidth: 400,
    /** Minimum distance from the viewport edges, in px. */
    viewportMargin: 16,
    /** Gap between the dialog and the thing it points at, in px. */
    anchorGap: 40,
    /**
     * Desktop dialogs prefer to stay at least this far from the screen
     * edges (beyond viewportMargin), as a fraction of the smaller screen
     * side. 0 = no preference. Mobile docked sheets ignore this.
     */
    edgeComfort: 0.08,
    /** Opacity of the black layer that dims everything but the target. */
    dimOpacity: 0.7,
    /** Frosted-glass blur behind the dim layer (0 = none). */
    blurPx: 6,
    /** Preferred sides for floating dialogs, best first. */
    sidePreference: ['left', 'right', 'bottom', 'top'],
  },

  /**
   * Game-style UI sounds, all synthesized (no audio files). Kept quiet on
   * purpose; see src/sound/README.md for what each one is made of.
   */
  sound: {
    enabledByDefault: true,
    volume: 0.4,
    channels: { ui: 0.7, voice: 0.45, ambient: 0.6 },
    maxVoices: 8,
    idleSuspendMs: 30_000,
    hover: { volume: 0.1, minGapMs: 50, sameTargetGapMs: 150 },
    press: { volume: 0.3, minGapMs: 80 },
    open: { volume: 0.5, minGapMs: 120, durationMs: 300 },
    close: { volume: 0.35, minGapMs: 120, durationMs: 200 },
    blip: {
      volume: 0.5,
      minGapMs: 45,
      voice: softVoice,
      pitchJitter: 0.08,
    },
    hum: { volume: 0.5, pitch: 60, fadeMs: 180 },
  },

  blobs: [
    {
      svg: 'pink',
      label: 'Pink blob',
      width: { wide: 19.5, compact: 27 },
      position: { wide: { x: 14, y: 2 }, compact: { x: 6, y: 3 } },
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
      position: { wide: { x: 86.5, y: 7 }, compact: { x: 80, y: 0 } },
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

  /**
   * The "?" button in the corner (top left on desktop, bottom left on
   * mobile), hinting that the page has things to find.
   */
  help: {
    label: 'What is this place?',
    dialog: {
      title: '???',
      body: [
        {
          kind: 'quote',
          text: '“Not everything here is what it seems.{pause} Some things are {wave}listening{/wave}.”',
        },
        {
          kind: 'narration',
          text: '*You sense that if you click around, you might uncover a few {scramble:loop}secrets{/scramble}.',
        },
        {
          kind: 'narration',
          text: '*If the noises bother you, the speaker beside this button silences them. So does pressing M.',
        },
      ],
    },
  },

  /**
   * A dialog showing every text effect, opened by pressing `key` on any
   * page. Handy when writing dialog text. Each line shows its tag, then the
   * effect.
   */
  textDemo: {
    key: '`',
    inProduction: false,
    dialog: {
      title: '{rainbow}TEXT EFFECTS{/rainbow}',
      body: [
        {
          kind: 'text',
          text: '{{wave} {wave}Letters ripple like water.{/wave}',
        },
        {
          kind: 'text',
          text: '{{float} {float}Drifting, drifting, drifting…{/float}',
        },
        {
          kind: 'text',
          text: '{{shake} {shake}Something is very wrong.{/shake}',
        },
        {
          kind: 'text',
          text: '{{rainbow} {rainbow}All the colours of the title.{/rainbow}',
        },
        {
          kind: 'text',
          text: '{{scramble} {scramble}Decoding transmission…{/scramble}',
        },
        {
          kind: 'text',
          text: '{{scramble:loop} {scramble:loop}A glitch that never quite ends.{/scramble}',
        },
        { kind: 'text', text: '{{slow} {slow}Taking my time…{/slow}' },
        {
          kind: 'text',
          text: '{{fast} {fast}Andthenrushingthroughitallatonce!{/fast}',
        },
        { kind: 'text', text: '{{pause} Wait for it…{pause:900} there.' },
        {
          kind: 'narration',
          text: '*{rainbow}{wave}Effects{/wave} {shake}can{/shake} {float}stack{/float}{/rainbow}.',
        },
      ],
    },
  },
};
