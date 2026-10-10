/**
 * Types for the site and page configs. Kept apart from the values so that
 * any module can import them without pulling in content.
 */

export type LayoutName = 'wide' | 'compact';

export interface DialogBlock {
  /**
   * `quote` and `narration` render in Courier Prime (narration is italic).
   * Quotes get their quotation marks, and narration its leading asterisk,
   * when shown (src/dialog/block-text.ts): don't write them.
   */
  kind: 'quote' | 'narration' | 'text';
  /**
   * May contain effect tags, e.g. 'You feel {wave}dizzy{/wave}.' Dialog
   * titles can use them too. Effects are skipped with reduced motion on.
   */
  text: string;
}

/** A button along the bottom of a dialog. */
export interface DialogAction {
  label: string;
  /** Where it goes. Without one, it just closes the dialog. */
  href?: string;
}

export interface DialogContent {
  title: string;
  body: DialogBlock[];
  /** Buttons along the bottom, shown once the text has typed out. */
  actions?: DialogAction[];
  /**
   * Show the text all at once, uncovered by the window as it opens,
   * instead of typing it out. Text effects still play; pacing tags and
   * voice blips are skipped.
   */
  instant?: boolean;
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
  /** Electric hum while the bus stop screen is hovered or focused, or its dialog is open. */
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
  /** Whether `x` is the element's left edge (default), centre or right edge. */
  align?: 'start' | 'center' | 'end';
}

export interface HotspotConfig {
  /** Accessible name for the button. */
  label: string;
  /** Shown when it's clicked. */
  dialog: DialogContent;
}

/**
 * Where the social links go on mobile: a column of buttons in the bottom
 * right corner, or above the title as on desktop.
 */
export type MobileSocials = 'corner' | 'title';

export interface StageLayout {
  /** Any CSS length. Height follows from `aspectRatio` (width / height). */
  width: string;
  aspectRatio: number;
  title: TextPlacement;
  nav: TextPlacement;
  /** The social links (home page only), tilted to match the title. */
  socials: TextPlacement;
}

export interface PageConfig {
  id: string;
  /**
   * The folder in src/pages/ whose page.tsx renders it, when that isn't
   * its `id`: for pages made from one template, like each poem.
   */
  view?: string;
  path: string;
  /** Used for the <title> tag; `null` means just the site name. */
  title: string | null;
  description: string;
  /** Keep the page out of search engines. */
  noindex?: boolean;
  /**
   * Still being made. Drafts are built in full only on the dev server and
   * when building with SHOW_DRAFTS=1 (for staging); everywhere else they
   * show their `placeholder` instead.
   */
  draft?: boolean;
  /**
   * Shown in a dialog over the stage, pointing at this page's nav item (or
   * the first nav item when the page isn't in the nav). Pages without their
   * own page.tsx are just this; drafts fall back to it.
   */
  placeholder?: DialogContent;
  /**
   * A plain HTML document in the browser's own look: just its page.tsx
   * in <body>, without the site's styles, scripts, sounds or router. Links
   * to it need `data-no-swup`, so the browser loads it itself.
   */
  bare?: boolean;
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
  nav: {
    label: string;
    href: string;
    /** Left out on its own page, rather than shown as the current one. */
    hideWhenCurrent?: boolean;
  }[];
  layout: { compactQuery: string };
  background: {
    portraitQuery: string;
    landscapeZoom: number;
    landscapeFocus: string;
    portraitZoom: number;
    portraitFocus: string;
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
  help: HotspotConfig;
  textDemo: {
    /** Key that opens the demo (KeyboardEvent.key). */
    key: string;
    /** Off: only works on the dev server. */
    inProduction: boolean;
    dialog: DialogContent;
  };
}
