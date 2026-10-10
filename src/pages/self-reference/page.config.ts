import { definePage } from '../../site/define-page.ts';

/*
 * Self-Reference: an essay on the self-referencing question-answer (the
 * mimethesis), as a plain page in the browser's own look. The mysteries
 * page links here. Kept out of search engines.
 */

export default definePage<{
  /** The essay, a paragraph each, until it's written. */
  paragraphs: string[];
}>({
  id: 'self-reference',
  path: '/self-reference/',
  title: 'The Self-Referencing Question-Answer (Mimethesis)',
  description: 'On the self-referencing question-answer: the mimethesis.',
  noindex: true,
  bare: true,

  paragraphs: ['To be written.'],
});
