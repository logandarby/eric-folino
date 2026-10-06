/**
 * Site-wide configuration: identity, nav, the stage layout, animation and
 * dialog tuning. Settings for one page live in that page's folder
 * (src/pages/<id>/page.config.ts); sound is in sound.config.ts and social
 * links in socials.ts.
 *
 * Imported both by the browser bundle and by the build-time templates, so
 * it must stay plain data.
 *
 * Positions (x, y, width) are percentages of the hero "stage" box. Font sizes
 * are percentages of the stage width (CSS `cqw` units), so the whole
 * composition scales together.
 */

import type { SiteConfig } from './types.ts';

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
    { label: 'EPK', href: '/epk/' },
    { label: 'SECRET', href: '/secret/' },
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
      socials: { x: 82, y: 22, fontSize: 4.8, align: 'end' },
    },
    compact: {
      width: 'min(92vw, 52dvh)',
      aspectRatio: 1,
      title: { x: 50, y: 27, fontSize: 10.2, align: 'center' },
      nav: { x: 22, y: 52, fontSize: 6.6 },
      socials: { x: 91, y: 17, fontSize: 5.6, align: 'end' },
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
