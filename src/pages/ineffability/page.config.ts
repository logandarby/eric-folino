import { definePage } from '../../site/define-page.ts';

/*
 * Ineffability: a block of text in Eric, our own cryptic font (fonts.css),
 * on the light pages' cream. The mysteries page links here, and its back
 * link back there. Kept out of search engines.
 */

export default definePage<{
  /** The block of cipher text in the middle, a paragraph each. */
  cipher: string[];
  /** Which of its paragraphs (counting from 1) are inset; the rest are light. */
  inset: number[];
}>({
  id: 'ineffability',
  path: '/ineffability/',
  title: 'Ineffability',
  description: 'unknowable',
  noindex: true,

  cipher: [
    'Ineffability is the quality of something that surpasses the capacity of language to express it.',
    'The present is ineffable.',
    'Only through what we have known can we grasp the unknown.',
    'Only through anachronistic images of the past can we understand the present.',
    'But remember...',
    'Images deceive.',
  ],
  inset: [2, 6],
});
