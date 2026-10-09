import { bootstrap } from '../../app/bootstrap.ts';
import { loaded } from '../../components/loading/loading.ts';
import { favourites } from '../poems/favourites.ts';
import { graph, poemPath } from '../poems/graph.ts';

bootstrap();

/** How much of a long first line the list shows. */
const PREVIEW_LENGTH = 60;

const list = document.querySelector<HTMLElement>('[data-favourites]');
const empty = document.querySelector<HTMLElement>('[data-favourites-empty]');

// Starred poems that are gone are left out.
const poems = favourites().flatMap((slug) =>
  graph.poems.filter((p) => p.slug === slug)
);

loaded();
if (empty) empty.hidden = poems.length > 0;
if (list && poems.length > 0) {
  for (const poem of poems) {
    const link = document.createElement('a');
    link.href = poemPath(poem.slug);
    link.textContent = poem.lines[0];
    const item = document.createElement('li');
    item.append(link);
    const first = poem.lines.slice(1).find((l) => l.trim() !== '');
    if (first) {
      const preview = document.createElement('span');
      preview.className = 'poems-favourites-line';
      preview.textContent = `${shorten(first)}...`;
      item.append(preview);
    }
    list.append(item);
  }
  list.hidden = false;
}

/** The start of `line`, cut at a word if it's long, without end punctuation. */
function shorten(line: string): string {
  let text = line.trim();
  if (text.length > PREVIEW_LENGTH) {
    const cut = text.lastIndexOf(' ', PREVIEW_LENGTH);
    text = text.slice(0, cut > 0 ? cut : PREVIEW_LENGTH);
  }
  return text.replace(/[\s.,;:!?—–-]+$/, '');
}
