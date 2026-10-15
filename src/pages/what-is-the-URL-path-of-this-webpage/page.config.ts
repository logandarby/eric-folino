import { definePage } from '../../site/define-page.ts';

/*
 * Self-Reference: an essay on the self-referencing question-answer (the
 * mimethesis), written in essay.md and set in Libron on a sheet over the
 * light pages' cream and Bayer tile, with a pretend comments section
 * under it. Its path is one of its examples. The mysteries page links
 * here, and its back link back there. Kept out of search engines.
 */

/** A reply to a comment. Replies don't have replies of their own. */
export interface Reply {
  author: string;
  /** Shown as written, so "3 days ago" is fine. */
  date: string;
  text: string;
}

export interface Comment extends Reply {
  replies?: Reply[];
}

export default definePage<{
  comments: {
    /** What the (taped-over, never usable) comment box says when empty. */
    placeholder: string;
    /** What's printed on the two strips of tape across the box. */
    tape: [string, string];
    /** The comments, top to bottom. */
    list: Comment[];
  };
}>({
  id: 'what-is-the-URL-path-of-this-webpage',
  path: '/what-is-the-URL-path-of-this-webpage/',
  title: 'The Self-Referencing Question-Answer (Mimethesis)',
  description: 'On the self-referencing question-answer: the mimethesis.',
  noindex: true,

  comments: {
    placeholder: "What's a comment that was never posted?",
    tape: ["you can't post", 'AAAAAAAAAAAAAAAAAAAAAAAA'],
    list: [
      {
        author: 'ferret_smellino',
        date: '2 days ago',
        text: 'im ferret smellino and i looooove you',
        replies: [
          {
            author: 'feet_man_huge',
            date: '1 day ago',
            text: 'who asked',
          },
        ],
      },
      {
        author: 'dill_molson',
        date: '2 weeks ago',
        text: 'dill molson',
      },
      {
        author: 'bathman_chez',
        date: '5 years ago',
        text: 'where is my guitar?',
        replies: [
          {
            author: 'bathman_chez',
            date: '1 day ago',
            text: 'oh nvm found it',
          },
        ],
      },
      {
        author: 'bowling_stankby',
        date: '10 years ago',
        text: 'h',
        replies: [
          {
            author: 'bowling_stankby',
            date: '10 years ago',
            text: 'sry typo',
          },
        ],
      },
    ],
  },
});
