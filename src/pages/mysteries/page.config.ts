import { definePage } from '../../site/define-page.ts';

/*
 * Mysteries: links to strange things, here and elsewhere. A polaroid on
 * the secret page's fridge leads here. Kept out of search engines.
 */

/** A strange thing. */
export interface Mystery {
  label: string;
  /**
   * Where it is: a full address for somewhere else (opens in a new tab,
   * with the site's name under it), or a path for a page here.
   */
  href: string;
}

export default definePage<{
  /** Under the title. */
  text: string;
  mysteries: Mystery[];
}>({
  id: 'mysteries',
  path: '/mysteries/',
  title: 'Mysteries?',
  description: 'Mysteries.',
  noindex: true,

  text: 'Strange things.',

  mysteries: [
    {
      label: 'Ritual and the Consciousness Monoculture',
      href: 'https://ribbonfarm.com/2015/01/08/ritual-and-the-consciousness-monoculture/',
    },
    {
      label: 'Pluto and the Beheading of St. John the Baptist',
      href: 'https://ioannisgoldmouth.substack.com/p/pluto-and-the-beheading-of-st-john',
    },
    {
      label: 'The Self-Referencing Question-Answer (Mimethesis)',
      href: '/self-reference/',
    },
    {
      label: 'The Re-Verbasizer',
      href: 'https://logandarby.github.io/re-verbasizer/',
    },
  ],
});
