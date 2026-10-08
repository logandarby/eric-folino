import { definePage } from '../../site/define-page.ts';
import { placeholder } from '../poems/graph.ts';

/* How the poems link to each other (see src/pages/poems/). */

export default definePage({
  id: 'poem-graph',
  path: '/poems/graph/',
  title: 'How the poems link',
  description: 'The poems, and the words that link them.',
  draft: true,
  noindex: true,
  placeholder,
});
