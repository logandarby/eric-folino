import { definePage } from '../../site/define-page.ts';

/*
 * The poems this visitor has starred (see src/pages/poems/favourites.ts).
 * main.ts fills in the list; it's only in their browser.
 */

export default definePage({
  id: 'poem-favourites',
  path: '/poems/favourites/',
  title: 'Favourites',
  description: 'The poems you starred.',
  noindex: true,
});
