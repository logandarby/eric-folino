import type { EffectName } from './markup/tags.ts';
import type { GlyphEffect } from './markup/timeline.ts';
import type { ScrambleController } from './scramble.ts';

/** What an effect renderer can use while decorating a letter. */
export interface EffectContext {
  palette: readonly string[];
  rainbowIntervalMs: number;
  random: () => number;
  /** The dialog's scramble controller, created on first use. */
  scrambler(): ScrambleController;
}

/**
 * How one effect is drawn (one strategy per tag). Renderers only add
 * classes and CSS variables to a letter's span; the animation itself lives
 * in src/styles/text-effects.css, where the browser runs it off the main
 * thread. The exception is scramble, which needs a controller to change
 * characters.
 */
export interface EffectRenderer {
  /**
   * Motion effects all move the letter, so a letter gets only one: the
   * innermost. Other effects (colour, scramble) combine freely.
   */
  motion: boolean;
  apply(el: HTMLElement, effect: GlyphEffect, ctx: EffectContext): void;
}

const SHAKE_VARIANTS = 3;

/** Wave and float: CSS staggers each letter by its index in the run. */
const staggered = (name: string): EffectRenderer => ({
  motion: true,
  apply(el, effect) {
    el.classList.add(`fx-${name}`);
    el.style.setProperty('--fx-i', String(effect.index));
  },
});

export const EFFECT_RENDERERS: Record<EffectName, EffectRenderer> = {
  wave: staggered('wave'),
  float: staggered('float'),

  // Random jitter pattern and phase per letter, so no two shake in step.
  shake: {
    motion: true,
    apply(el, _effect, { random }) {
      el.classList.add('fx-shake');
      const variant = Math.floor(random() * SHAKE_VARIANTS);
      el.style.setProperty('--fx-shake', `text-shake-${variant}`);
      el.style.setProperty('--fx-seed', random().toFixed(3));
    },
  },

  // Colours step through the palette like the title: letter i shows colour
  // (i - step), so they travel forward. The static colour is what shows
  // with reduced motion.
  rainbow: {
    motion: false,
    apply(el, { index }, { palette, rainbowIntervalMs }) {
      const n = palette.length;
      el.classList.add('fx-rainbow');
      el.style.setProperty('--fx-rainbow-color', palette[index % n]);
      el.style.setProperty(
        '--fx-rainbow-delay',
        `${-((n - (index % n)) % n) * rainbowIntervalMs}ms`
      );
    },
  },

  scramble: {
    motion: false,
    apply(el, { arg }, { scrambler }) {
      el.classList.add('fx-scramble');
      scrambler().add(el, arg === 'loop' ? 'loop' : 'decode');
    },
  },
};
