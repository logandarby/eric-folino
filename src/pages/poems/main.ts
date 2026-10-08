import { bootstrap } from '../../app/bootstrap.ts';
import { graph, poemPath } from './graph.ts';
import { readPoems } from './read.ts';

bootstrap();

// "Begin" goes to a random poem, one not read yet while there are any.
const begin = document.querySelector<HTMLAnchorElement>('[data-random-poem]');
if (begin) {
  const read = readPoems();
  const unread = graph.poems.filter((p) => !read.has(p.slug));
  const choices = unread.length > 0 ? unread : graph.poems;
  const poem = choices[Math.floor(Math.random() * choices.length)];
  begin.href = poemPath(poem.slug);
}
