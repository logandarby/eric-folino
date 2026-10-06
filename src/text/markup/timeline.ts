import { graphemes } from './graphemes.ts';
import { parse } from './parser.ts';
import type { EffectName } from './tags.ts';

export interface GlyphEffect {
  name: EffectName;
  arg: string | undefined;
  /**
   * Position of this glyph among the letters of its effect run (spaces
   * not counted). Effects stagger by it so letters move in sequence.
   */
  index: number;
}

export interface Glyph {
  /** One grapheme: what a reader sees as a single character. */
  text: string;
  isSpace: boolean;
  /** Outermost first. */
  effects: GlyphEffect[];
  /** When the typewriter shows it, in ms from the start of this text. */
  revealAt: number;
}

export interface TextScript {
  /** The text without tags, for screen readers. */
  plain: string;
  glyphs: Glyph[];
  /** When the last glyph (or trailing pause) is done, in ms. */
  duration: number;
  diagnostics: string[];
}

export interface PacingOptions {
  /** Base time per character. 0 = everything shows at once. */
  charMs: number;
  /** Defaults for {slow} and {fast} without an argument. */
  slowFactor: number;
  fastFactor: number;
  /** Default for {pause} without an argument. */
  pauseMs: number;
}

/**
 * Parses marked-up text and works out when each character appears. Doing
 * the timing up front gives the typewriter, effects that react to typing
 * (like scramble) and anything later (like voice blips) one shared
 * schedule, and keeps it testable without a browser.
 */
export function compile(source: string, pacing: PacingOptions): TextScript {
  const { pieces, diagnostics } = parse(source);
  const instant = pacing.charMs <= 0;
  const glyphs: Glyph[] = [];
  const letterCounts = new Map<number, number>();
  let plain = '';
  let time = 0;

  for (const piece of pieces) {
    if (piece.type === 'pause') {
      if (!instant) time += piece.ms ?? pacing.pauseMs;
      continue;
    }

    plain += piece.text;
    let charMs = pacing.charMs;
    if (piece.pace?.name === 'slow') {
      charMs *= piece.pace.factor ?? pacing.slowFactor;
    } else if (piece.pace?.name === 'fast') {
      charMs /= piece.pace.factor ?? pacing.fastFactor;
    }

    for (const text of graphemes(piece.text)) {
      const isSpace = /^\s+$/.test(text);
      const effects = piece.effects.map((span) => {
        const index = letterCounts.get(span.id) ?? 0;
        if (!isSpace) letterCounts.set(span.id, index + 1);
        return { name: span.name, arg: span.arg, index };
      });
      if (!instant) time += charMs;
      glyphs.push({ text, isSpace, effects, revealAt: time });
    }
  }

  return { plain, glyphs, duration: time, diagnostics };
}
