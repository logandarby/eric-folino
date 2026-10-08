import { definePage } from '../../site/define-page.ts';
import { graph } from './graph.ts';

/*
 * The web of poems: this page welcomes you to it, and each poem has a page
 * of its own (src/pages/poem/) whose words link to the others. The graph
 * of links has a page too (src/pages/poem-graph/), where poems unlock as
 * they're read.
 */

export default definePage({
  id: 'poems',
  path: '/poems/',
  title: 'Web of Poems',
  description: 'Poems, linked to each other by what they mean.',
  noindex: true,
});

/** A page per poem, all rendered by src/pages/poem/page.tsx. */
export const poemPages = graph.poems.map((poem) =>
  definePage<{ slug: string }>({
    id: `poem-${poem.slug}`,
    view: 'poem',
    path: `/poems/${poem.slug}/`,
    title: poem.lines[0],
    description: `${poem.lines[0]}, a poem.`,
    noindex: true,
    slug: poem.slug,
  })
);
