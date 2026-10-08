import { stylesheet } from '../../../build/jsx/assets.ts';
import type { Child } from '../../../build/jsx/jsx-runtime.ts';
import { VoidLayout } from '../../layouts/void.tsx';
import type { PageConfig } from '../../site/types.ts';
import {
  findPoem,
  graph,
  lineId,
  linkHref,
  type PoemLink,
} from '../poems/graph.ts';

/**
 * One poem, line for line, with its links on their words. Hovering a link
 * shows the title of the poem it goes to; clicking it opens a dialog with
 * the line it lands on (see main.ts). Each line has an id for links to land
 * on, and the title says which poem it is, to mark it read.
 */
export default function PoemPage(page: PageConfig & { slug?: string }) {
  if (!page.slug) throw new Error(`Page "${page.id}" isn't a poem`);
  stylesheet(import.meta.url, '../poems/poems.css');
  stylesheet(import.meta.url, './poem.css');
  const poem = findPoem(page.slug);
  const out = graph.links.filter((l) => l.from === poem.slug);
  const line = (i: number) => <Line i={i} text={poem.lines[i]} out={out} />;

  return (
    <VoidLayout corner="bottom">
      <p>
        <a href="/poems/">Poems</a>
      </p>
      <h1 id={lineId(0)} data-poem={poem.slug}>
        {line(0)}
      </h1>
      {stanzas(poem.lines).map((stanza) =>
        // An empty stanza is an extra blank line, a longer pause.
        stanza.length === 0 ? (
          <p aria-hidden="true">
            <br />
          </p>
        ) : (
          <p>
            {stanza.map((i) => (
              <>
                <span id={lineId(i)} class="poem-line">
                  {line(i)}
                </span>
                <br />
              </>
            ))}
          </p>
        )
      )}
    </VoidLayout>
  );
}

/**
 * The lines after the title (by index), in stanzas. Each blank line past
 * the first between two stanzas is an empty stanza of its own.
 */
function stanzas(lines: string[]): number[][] {
  if (lines.length < 2) return [];
  const result: number[][] = [[]];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '') result.push([]);
    else result[result.length - 1].push(i);
  }
  return result;
}

/** Line `i`, with links on the words that have them. */
function Line({ i, text, out }: { i: number; text: string; out: PoemLink[] }) {
  const parts: Child[] = [];
  let at = 0;
  for (const link of out
    .filter((l) => l.word.line === i)
    .sort((a, b) => a.word.start - b.word.start)) {
    const { start, length } = link.word;
    const to = findPoem(link.to);
    parts.push(text.slice(at, start));
    parts.push(
      <a
        href={linkHref(link)}
        class="poem-link"
        title={to.lines[0]}
        data-poem-link
        data-to={to.lines[0]}
        data-line={link.line > 0 ? to.lines[link.line] : undefined}
      >
        {text.slice(start, start + length)}
      </a>
    );
    at = start + length;
  }
  parts.push(text.slice(at));
  return <>{parts}</>;
}
