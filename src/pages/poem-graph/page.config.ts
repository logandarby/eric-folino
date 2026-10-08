import { definePage } from '../../site/define-page.ts';

/*
 * The web: the poems and how they link to each other, as a graph that
 * unlocks as they're read (see src/pages/poems/).
 */

export default definePage({
  id: 'poem-graph',
  path: '/poems/web/',
  title: 'The Web',
  description: 'The poems, and the words that link them.',
  noindex: true,
});
