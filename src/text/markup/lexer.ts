/**
 * Splits dialog markup into text and tag tokens. Knows the shape of a tag
 * but not which tags exist; that's the parser's job (see tags.ts).
 *
 *   {name}  {name:arg}  {/name}  and  {{ for a literal "{"
 */

export type Token =
  | { type: 'text'; text: string }
  | { type: 'open'; name: string; arg: string | undefined; source: string }
  | { type: 'close'; name: string; source: string };

const TAG = /\{(\/?)([a-z]+)(?::([^{}]*))?\}/y;

export function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let text = '';
  const flush = () => {
    if (text) tokens.push({ type: 'text', text });
    text = '';
  };

  let i = 0;
  while (i < source.length) {
    if (source.startsWith('{{', i)) {
      text += '{';
      i += 2;
      continue;
    }
    TAG.lastIndex = i;
    const match = source[i] === '{' ? TAG.exec(source) : null;
    if (!match) {
      text += source[i++];
      continue;
    }
    const [tag, closing, name, arg] = match;
    flush();
    tokens.push(
      closing
        ? { type: 'close', name, source: tag }
        : { type: 'open', name, arg, source: tag }
    );
    i += tag.length;
  }
  flush();
  return tokens;
}
