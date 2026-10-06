/**
 * Every tag the dialog text understands. The parser looks tags up here, so
 * adding one is a new entry (plus, for an effect, a renderer in
 * src/text/effects.ts, which the type system will ask for).
 *
 * - `effect`: changes how the wrapped letters look. Effects nest.
 * - `pacing`: changes how fast the wrapped letters type. The innermost wins.
 * - `instant`: happens at one point in the text, like a pause.
 */

export const EFFECT_NAMES = [
  'wave',
  'float',
  'shake',
  'rainbow',
  'scramble',
] as const;
export type EffectName = (typeof EFFECT_NAMES)[number];

export type PacingName = 'slow' | 'fast';

/** The result of parsing a tag's argument: a value, or why it's invalid. */
type ArgResult<T> = { value: T } | { error: string };

interface EffectTag {
  kind: 'effect';
  name: EffectName;
  parseArg(arg: string | undefined): ArgResult<string | undefined>;
}

interface PacingTag {
  kind: 'pacing';
  name: PacingName;
  /** Speed factor, or undefined for the configured default. */
  parseArg(arg: string | undefined): ArgResult<number | undefined>;
}

interface InstantTag {
  kind: 'instant';
  name: 'pause';
  /** Pause length in ms, or undefined for the configured default. */
  parseArg(arg: string | undefined): ArgResult<number | undefined>;
}

export type TagDefinition = EffectTag | PacingTag | InstantTag;

// Argument parsers ------------------------------------------------------------

const noArg = (arg: string | undefined): ArgResult<undefined> =>
  arg === undefined
    ? { value: undefined }
    : { error: `takes no argument, got "${arg}"` };

const oneOf =
  (...options: string[]) =>
  (arg: string | undefined): ArgResult<string | undefined> =>
    arg === undefined || options.includes(arg)
      ? { value: arg }
      : { error: `argument must be one of ${options.join(', ')}` };

const positiveNumber =
  (what: string) =>
  (arg: string | undefined): ArgResult<number | undefined> => {
    if (arg === undefined) return { value: undefined };
    const n = Number(arg);
    return arg.trim() !== '' && Number.isFinite(n) && n > 0
      ? { value: n }
      : { error: `argument must be a positive number (${what})` };
  };

// Registry --------------------------------------------------------------------

const effect = (
  name: EffectName,
  parseArg: EffectTag['parseArg'] = noArg
): EffectTag => ({ kind: 'effect', name, parseArg });

export const TAGS: ReadonlyMap<string, TagDefinition> = new Map(
  (
    [
      effect('wave'),
      effect('float'),
      effect('shake'),
      effect('rainbow'),
      effect('scramble', oneOf('loop')),
      {
        kind: 'pacing',
        name: 'slow',
        parseArg: positiveNumber('times slower'),
      },
      {
        kind: 'pacing',
        name: 'fast',
        parseArg: positiveNumber('times faster'),
      },
      { kind: 'instant', name: 'pause', parseArg: positiveNumber('ms') },
    ] satisfies TagDefinition[]
  ).map((tag) => [tag.name, tag])
);
