import { definePage } from '../../site/define-page.ts';

/* Served by GitHub Pages for any address that doesn't exist. */

export default definePage({
  id: 'not-found',
  path: '/404.html',
  title: 'Lost',
  description: 'Page not found.',
  noindex: true,
  placeholder: {
    title: 'LOST?',
    body: [
      { kind: 'quote', text: '“There is nothing at this address.”' },
      { kind: 'narration', text: '*Perhaps you should head HOME.' },
    ],
  },
});
