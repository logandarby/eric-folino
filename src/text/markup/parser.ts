import { lex } from './lexer.ts';
import { TAGS, type EffectName, type PacingName } from './tags.ts';

/** One use of an effect tag. `id` tells apart two runs of the same effect. */
export interface EffectSpan {
  id: number;
  name: EffectName;
  arg: string | undefined;
}

export interface PaceSpan {
  name: PacingName;
  /** undefined = the configured default factor. */
  factor: number | undefined;
}

export type Piece =
  | {
      type: 'text';
      text: string;
      /** Outermost first. */
      effects: EffectSpan[];
      /** The innermost pacing tag, if any. */
      pace: PaceSpan | null;
    }
  | { type: 'pause'; ms: number | undefined };

export interface ParseResult {
  pieces: Piece[];
  /** Problems found, e.g. unknown tags. The text still renders. */
  diagnostics: string[];
}

type Open =
  | { kind: 'effect'; span: EffectSpan }
  | { kind: 'pacing'; name: PacingName; pace: PaceSpan };

/**
 * Turns marked-up text into pieces of styled text and pauses.
 *
 * Forgiving by design, since a typo in the config shouldn't break the page:
 * - a closing tag closes the most recent matching open tag, even if others
 *   were opened after it;
 * - an unclosed tag runs to the end;
 * - a stray closing tag is dropped;
 * - an unknown tag or bad argument stays as literal text.
 * Each of these except the unclosed tag is reported in `diagnostics`.
 */
export function parse(source: string): ParseResult {
  const pieces: Piece[] = [];
  const diagnostics: string[] = [];
  const stack: Open[] = [];
  let nextId = 0;

  const pushText = (text: string) => {
    const effects = stack.flatMap((o) => (o.kind === 'effect' ? [o.span] : []));
    const pacing = stack.findLast((o) => o.kind === 'pacing');
    const pace = pacing?.kind === 'pacing' ? pacing.pace : null;
    const last = pieces.at(-1);
    // Literal tag text can land next to text with the same style: merge.
    if (
      last?.type === 'text' &&
      last.pace === pace &&
      last.effects.length === effects.length &&
      last.effects.every((e, i) => e === effects[i])
    ) {
      last.text += text;
    } else {
      pieces.push({ type: 'text', text, effects, pace });
    }
  };

  for (const token of lex(source)) {
    if (token.type === 'text') {
      pushText(token.text);
      continue;
    }

    const tag = TAGS.get(token.name);
    if (!tag) {
      diagnostics.push(`Unknown tag ${token.source}`);
      pushText(token.source);
      continue;
    }

    if (token.type === 'close') {
      const index = stack.findLastIndex((o) =>
        o.kind === 'effect' ? o.span.name === token.name : o.name === token.name
      );
      if (index === -1) {
        diagnostics.push(`${token.source} has no matching opening tag`);
      } else {
        stack.splice(index, 1);
      }
      continue;
    }

    // Invalid argument: report it and keep the tag as literal text.
    const valid = <T>(
      arg: { value: T } | { error: string }
    ): arg is {
      value: T;
    } => {
      if ('value' in arg) return true;
      diagnostics.push(`${token.source}: ${arg.error}`);
      pushText(token.source);
      return false;
    };

    switch (tag.kind) {
      case 'effect': {
        const arg = tag.parseArg(token.arg);
        if (!valid(arg)) break;
        const span = { id: nextId++, name: tag.name, arg: arg.value };
        stack.push({ kind: 'effect', span });
        break;
      }
      case 'pacing': {
        const arg = tag.parseArg(token.arg);
        if (!valid(arg)) break;
        const pace = { name: tag.name, factor: arg.value };
        stack.push({ kind: 'pacing', name: tag.name, pace });
        break;
      }
      case 'instant': {
        const arg = tag.parseArg(token.arg);
        if (valid(arg)) pieces.push({ type: 'pause', ms: arg.value });
        break;
      }
    }
  }

  return { pieces, diagnostics };
}
