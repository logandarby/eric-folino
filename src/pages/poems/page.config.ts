import { definePage } from '../../site/define-page.ts';
import { graph, placeholder } from './graph.ts';

/*
 * The poems, a wiki of them: this page lists them all, and each has a page
 * of its own (src/pages/poem/) whose words link to the others. The graph
 * of links has a page too (src/pages/poem-graph/).
 *
 * A proof of concept, so drafts for now, and unstyled.
 */

export default definePage({
  id: 'poems',
  path: '/poems/',
  title: 'Poems',
  description: 'Poems, linked to each other by their words.',
  draft: true,
  noindex: true,
  placeholder,
});

/** A page per poem, all rendered by src/pages/poem/page.tsx. */
export const poemPages = graph.poems.map((poem) =>
  definePage<{ slug: string }>({
    id: `poem-${poem.slug}`,
    view: 'poem',
    path: `/poems/${poem.slug}/`,
    title: poem.lines[0],
    description: `${poem.lines[0]}, a poem.`,
    draft: true,
    noindex: true,
    placeholder,
    slug: poem.slug,
  })
);
