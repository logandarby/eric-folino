import { describe, expect, it } from 'vitest';
import { graphemes } from './graphemes.ts';
import { lex } from './lexer.ts';
import { parse } from './parser.ts';
import { compile, type PacingOptions } from './timeline.ts';

const pacing: PacingOptions = {
  charMs: 10,
  slowFactor: 3,
  fastFactor: 2,
  pauseMs: 500,
};

/** Text of each piece with the names of its effects, for compact asserts. */
const summary = (source: string) =>
  parse(source).pieces.map((p) =>
    p.type === 'pause'
      ? `pause:${p.ms ?? 'default'}`
      : `${p.text}|${p.effects.map((e) => e.name).join('+')}|${p.pace?.name ?? ''}`
  );

describe('lex', () => {
  it('finds tags, arguments and closing tags', () => {
    expect(lex('a{wave}b{/wave}{pause:300}')).toEqual([
      { type: 'text', text: 'a' },
      { type: 'open', name: 'wave', arg: undefined, source: '{wave}' },
      { type: 'text', text: 'b' },
      { type: 'close', name: 'wave', source: '{/wave}' },
      { type: 'open', name: 'pause', arg: '300', source: '{pause:300}' },
    ]);
  });

  it('treats {{ as a literal brace and leaves other braces alone', () => {
    expect(lex('{{wave} { x } }')).toEqual([
      { type: 'text', text: '{wave} { x } }' },
    ]);
  });
});

describe('parse', () => {
  it('leaves plain text alone', () => {
    expect(summary('Hello there.')).toEqual(['Hello there.||']);
  });

  it('nests effects', () => {
    expect(summary('{rainbow}a{shake}b{/shake}c{/rainbow}d')).toEqual([
      'a|rainbow|',
      'b|rainbow+shake|',
      'c|rainbow|',
      'd||',
    ]);
  });

  it('closes the most recent matching tag, even out of order', () => {
    expect(summary('{wave}a{shake}b{/wave}c{/shake}')).toEqual([
      'a|wave|',
      'b|wave+shake|',
      'c|shake|',
    ]);
  });

  it('runs unclosed tags to the end without complaint', () => {
    const result = parse('{float}forever');
    expect(summary('{float}forever')).toEqual(['forever|float|']);
    expect(result.diagnostics).toEqual([]);
  });

  it('drops stray closing tags, with a diagnostic', () => {
    const result = parse('a{/wave}b');
    expect(summary('a{/wave}b')).toEqual(['ab||']);
    expect(result.diagnostics).toHaveLength(1);
  });

  it('keeps unknown tags as text, with a diagnostic', () => {
    const result = parse('a {wobble}b{/wobble}');
    expect(summary('a {wobble}b{/wobble}')).toEqual(['a {wobble}b{/wobble}||']);
    expect(result.diagnostics).toHaveLength(2);
  });

  it('validates arguments', () => {
    expect(parse('{scramble:loop}x').diagnostics).toEqual([]);
    expect(parse('{slow:2.5}x{fast:4}y{pause:100}').diagnostics).toEqual([]);
    for (const bad of [
      '{scramble:sometimes}',
      '{slow:0}',
      '{fast:-1}',
      '{pause:soon}',
      '{pause:}',
      '{wave:3}',
    ]) {
      const result = parse(`${bad}x`);
      expect(result.diagnostics, bad).toHaveLength(1);
      expect(summary(`${bad}x`), bad).toEqual([`${bad}x||`]);
    }
  });

  it('uses the innermost pacing tag', () => {
    expect(summary('{slow}a{fast}b{/fast}c{/slow}')).toEqual([
      'a||slow',
      'b||fast',
      'c||slow',
    ]);
  });

  it('turns pauses into pieces', () => {
    expect(summary('a{pause}b{pause:250}')).toEqual([
      'a||',
      'pause:default',
      'b||',
      'pause:250',
    ]);
  });
});

describe('graphemes', () => {
  it('keeps emoji and combining marks together', () => {
    expect(graphemes('ok👍🏽é')).toEqual(['o', 'k', '👍🏽', 'é']);
  });
});

describe('compile', () => {
  it('gives the plain text for screen readers', () => {
    expect(compile('{wave}hi{/wave} {pause}you{{', pacing).plain).toBe(
      'hi you{'
    );
  });

  it('times characters, slow and fast runs, and pauses', () => {
    const script = compile('ab{slow}c{/slow}{fast}d{/fast}{pause}e', pacing);
    expect(script.glyphs.map((g) => g.revealAt)).toEqual([
      10, // a
      20, // b
      50, // c: 3x slower
      55, // d: 2x faster
      565, // e: after the 500 ms pause
    ]);
    expect(script.duration).toBe(565);
  });

  it('honours explicit factors and pause lengths', () => {
    const script = compile('{slow:5}a{/slow}{pause:40}b', pacing);
    expect(script.glyphs.map((g) => g.revealAt)).toEqual([50, 100]);
  });

  it('shows everything at once when charMs is 0, ignoring pauses', () => {
    const script = compile('a{pause:900}{slow}b', { ...pacing, charMs: 0 });
    expect(script.glyphs.map((g) => g.revealAt)).toEqual([0, 0]);
    expect(script.duration).toBe(0);
  });

  it('numbers letters within each effect run, skipping spaces', () => {
    const script = compile('x{wave}ab c{rainbow}d{/rainbow}{/wave}', pacing);
    const wave = script.glyphs.map(
      (g) => g.effects.find((e) => e.name === 'wave')?.index
    );
    expect(wave).toEqual([undefined, 0, 1, 2, 2, 3]);
    expect(script.glyphs[5].effects.map((e) => [e.name, e.index])).toEqual([
      ['wave', 3],
      ['rainbow', 0],
    ]);
    expect(script.glyphs[3].isSpace).toBe(true);
  });

  it('carries effect arguments to the glyphs', () => {
    const script = compile('{scramble:loop}a', pacing);
    expect(script.glyphs[0].effects).toEqual([
      { name: 'scramble', arg: 'loop', index: 0 },
    ]);
  });
});
