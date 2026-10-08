import data from './graph.json';

/*
 * The poems and the links between them, made by `npm run poems` (see
 * scripts/build-poems.mjs) from the files in content/.
 */

export interface Poem {
  slug: string;
  /** The title, then the poem's lines; '' between stanzas. */
  lines: string[];
}

/** A word in a poem: `lines[line]`, from `start`, `length` letters long. */
export interface WordPlace {
  /** Its plain form ("lights" → "light"). */
  root: string;
  line: number;
  start: number;
  length: number;
  text: string;
}

export interface PoemLink {
  from: string;
  to: string;
  /** How close in meaning the word is to what it matched in `to`. */
  score: number;
  /** Where the link is, in `from`. */
  word: WordPlace;
  /**
   * The line of `to` it lands on: one its word says something about, or 0,
   * the title, when the word is close to one of the title's.
   */
  line: number;
}

export const graph: { poems: Poem[]; links: PoemLink[] } = data;

export const poemPath = (slug: string) => `/poems/${slug}/`;

/** The page's id for line `n` of its poem, which links land on. */
export const lineId = (n: number) => `l-${n}`;

/** Where a link goes: the poem, at the line it lands on. */
export const linkHref = (link: PoemLink) =>
  `${poemPath(link.to)}#${lineId(link.line)}`;

export function findPoem(slug: string): Poem {
  const poem = graph.poems.find((p) => p.slug === slug);
  if (!poem) throw new Error(`No poem "${slug}"; try \`npm run poems\``);
  return poem;
}
