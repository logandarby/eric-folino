import { h } from '../core/component.ts';
import type { TextEffectsConfig } from '../site.config.ts';
import { EFFECT_RENDERERS, type EffectContext } from './effects.ts';
import {
  compile,
  type GlyphEffect,
  type TextScript,
} from './markup/timeline.ts';
import { ScrambleController } from './scramble.ts';
import { Typewriter, type TimedGlyph } from './typewriter.ts';

export interface TextEngineOptions {
  /** Base time per character; 0 shows text at once (reduced motion). */
  charMs: number;
  effects: TextEffectsConfig;
  palette: readonly string[];
  rainbowIntervalMs: number;
  random?: () => number;
}

/** Text rendered by the engine, ready to insert and type out. */
export interface RenderedText {
  fragment: DocumentFragment;
  glyphs: TimedGlyph[];
  duration: number;
}

/**
 * Turns marked-up dialog text into DOM and typing (see src/text/README.md).
 * One engine per dialog: it owns the dialog's typewriter and any scripted
 * effects, and `dispose()` stops them all.
 *
 *   const engine = new TextEngine(options);
 *   const title = engine.render('{wave}Hello{/wave}');
 *   parent.append(title.fragment);
 *   void engine.typewriter([title]).play();
 */
export class TextEngine {
  private scramble: ScrambleController | null = null;
  private readonly context: EffectContext;

  constructor(private readonly options: TextEngineOptions) {
    const random = options.random ?? Math.random;
    this.context = {
      palette: options.palette,
      rainbowIntervalMs: options.rainbowIntervalMs,
      random,
      scrambler: () =>
        (this.scramble ??= new ScrambleController(
          options.effects.scramble,
          random
        )),
    };
  }

  render(source: string): RenderedText {
    const script = compile(source, {
      charMs: this.options.charMs,
      ...this.options.effects.pacing,
    });
    if (import.meta.env.DEV && script.diagnostics.length) {
      console.warn(
        `Dialog text "${source}":\n${script.diagnostics.join('\n')}`
      );
    }
    return { ...this.build(script), duration: script.duration };
  }

  /** One typewriter for several texts, typed one after another. */
  typewriter(texts: RenderedText[]): Typewriter {
    let offset = 0;
    const glyphs = texts.flatMap((text) => {
      const shifted = text.glyphs.map((g) => ({ ...g, at: g.at + offset }));
      offset += text.duration;
      return shifted;
    });
    const typewriter = new Typewriter(glyphs);
    typewriter.events.on('reveal', ({ el }) => this.scramble?.reveal(el));
    return typewriter;
  }

  dispose(): void {
    this.scramble?.dispose();
  }

  /**
   * Builds the DOM: the plain text for screen readers, and a hidden-from-
   * them visual copy made of one span per character, decorated by each
   * effect's renderer. Hidden characters still take up space, so the
   * dialog never changes size while typing.
   */
  private build(script: TextScript): Omit<RenderedText, 'duration'> {
    const visual = h('span', { 'aria-hidden': 'true' });
    const glyphs: TimedGlyph[] = [];
    // Words are kept whole so lines never break mid-word. A word can span
    // effects, e.g. half wavy.
    let word: HTMLElement | null = null;

    for (const glyph of script.glyphs) {
      const el = h('span', { class: 'tw-char' }, [glyph.text]);
      glyphs.push({ el, glyph, at: glyph.revealAt });
      if (glyph.isSpace) {
        word = null;
        visual.append(el);
        continue;
      }
      this.decorate(el, glyph.effects);
      if (!word) {
        word = h('span', { class: 'tw-word' });
        visual.append(word);
      }
      word.append(el);
    }

    const fragment = document.createDocumentFragment();
    fragment.append(h('span', { class: 'sr-only' }, [script.plain]), visual);
    return { fragment, glyphs };
  }

  private decorate(el: HTMLElement, effects: GlyphEffect[]) {
    if (!effects.length) return;
    el.classList.add('fx');
    const motion = effects.findLast((e) => EFFECT_RENDERERS[e.name].motion);
    for (const effect of effects) {
      const renderer = EFFECT_RENDERERS[effect.name];
      if (renderer.motion && effect !== motion) continue;
      renderer.apply(el, effect, this.context);
    }
    if (motion) el.classList.add('fx-move');
  }
}
