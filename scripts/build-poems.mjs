// Links the poems in src/pages/poems/content/ to each other, like a wiki.
// Run with `npm run poems` whenever a poem is added or changed. Output is
// committed, like the TV's. `npm run poems -- <slug>…` also re-reads those
// poems' cards, after changing the prompt, say.
//
// A link is a word in one poem that says something about another: a word
// in its title, or one of the things it's about. The link lands on the
// line that thing comes from (the title, for a title word).
//
// What each poem is about comes from a "card": a few themes, each with the
// line it comes from, and a few of the poem's own words that carry its
// meaning (only those can be links), each with what it suggests there
// ("sweat" → "dread"). A language model, run here on this machine, writes
// each card once; they're kept in src/pages/poems/cards/ and only
// rewritten when their poem changes. Edit one by hand to change what a
// poem is about. Cards are only used here: nothing a model wrote is shown
// on the site.
//
// A word is matched to titles and themes by how close in meaning it, or
// what it suggests, is to them (a second, much smaller model). What it
// suggests is what lets a plain word reach an idea. Each poem links to the poems it matches
// best, a link or a few, each on a different word. Then every poem gets at
// least one link out and one in: each that has none gets its best match
// left, however weak.
//
// Writes src/pages/poems/graph.json, and an HTML shell per poem at
// poems/<slug>/index.html (see build/site-pages-plugin.ts).

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from '@huggingface/transformers';
import compromise from 'compromise';
import { getLlama, LlamaChatSession, resolveModelFile } from 'node-llama-cpp';

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));

const CONTENT_DIR = path('../src/pages/poems/content/');
const CARDS_DIR = path('../src/pages/poems/cards/');
const GRAPH_FILE = path('../src/pages/poems/graph.json');
const SHELLS_DIR = path('../poems/');
/** Word meanings, kept between runs: only new words go through the model. */
const CACHE_FILE = path('../node_modules/.cache/poem-words.json');

/**
 * Writes the cards. About 4.7 GB, downloaded once per machine (to
 * ~/.node-llama-cpp/models/); runs on the CPU, or a GPU if there is one.
 */
const CARD_MODEL = 'hf:bartowski/Qwen2.5-7B-Instruct-GGUF:Q4_K_M';
/** How many themes and words a card has. Small cards, few links. */
const CARD_THEMES = { min: 2, max: 4 };
const CARD_WORDS = { min: 2, max: 5 };

/** Says how close two words are; small and quick, and good at it. */
const WORD_MODEL = 'Xenova/all-MiniLM-L6-v2';
/** How close in meaning (cosine similarity) a word must be to a theme… */
const THEME_MIN = 0.4;
/** …or to a word in a title, to link to it. */
const TITLE_MIN = 0.55;
/** Title matches count this many times over: they're tried first. */
const TITLE_WEIGHT = 1.5;
/** A poem gets one link for this many of its card's words… */
const WORDS_PER_LINK = 2;
/** …up to this many. */
const MAX_LINKS = 3;
/**
 * Most links into one poem, so poems about common things (solitude, say)
 * don't draw everything to them. Past it, links go to the next best poem.
 */
const MAX_LINKS_IN = 20;
/** A poem's closeness to another is the sum of its best this-many matches. */
const MATCHES_PER_SCORE = 3;
/** Shell folders the script must leave alone (pages of their own). */
const RESERVED = new Set(['graph']);

/** Words never worth a link, whatever the card says. */
const WEAK = new Set(
  `be have do get make go come let say thing way time part
  single again each still even only more less much enough nobody whole
  inside below beside further down closer never ever`.split(/\s+/)
);

async function main() {
  const poems = await readPoems();
  const reread = new Set(process.argv.slice(2));
  for (const slug of reread) {
    if (!poems.some((p) => p.slug === slug))
      throw new Error(`No poem "${slug}"`);
  }
  await readCards(poems, reread);
  const meaning = await embed([
    ...new Set(
      poems.flatMap((p) => [
        ...p.anchors.flatMap((a) => [a.word.root, a.suggests]),
        ...targets(p).map((t) => t.text),
      ])
    ),
  ]);

  const links = [];
  for (const poem of poems) {
    const budget = Math.min(
      MAX_LINKS,
      Math.ceil(poem.anchors.length / WORDS_PER_LINK)
    );
    const neighbours = poems
      .filter((other) => other !== poem)
      .map((other) => ({ other, matches: matches(poem, other, meaning) }))
      .filter(({ matches }) => matches.length > 0)
      .sort((a, b) => closeness(b.matches) - closeness(a.matches));
    for (const { other, matches } of neighbours) {
      if (links.filter((l) => l.from === poem.slug).length >= budget) break;
      if (full(links, other)) continue;
      const match = matches.find((m) => !usedWord(links, poem, m.word));
      if (match) links.push(link(poem, other, match));
    }
  }

  // These link nowhere yet: each gets its best link out that's left,
  // however weak.
  for (const poem of poems) {
    if (links.some((l) => l.from === poem.slug)) continue;
    const best = poems
      .filter((other) => other !== poem && !full(links, other))
      .flatMap((other) =>
        matches(poem, other, meaning, false)
          .filter((m) => !usedWord(links, poem, m.word))
          .map((match) => ({ other, match }))
      )
      .sort((a, b) => b.match.weight - a.match.weight)[0];
    if (best) links.push(link(poem, best.other, best.match));
    else console.warn(`"${poem.slug}" links nowhere: its card has no words`);
  }

  // Nothing links to these yet: each gets its best link in that's left,
  // however weak.
  for (const poem of poems) {
    if (links.some((l) => l.to === poem.slug)) continue;
    const best = poems
      .filter((other) => other !== poem)
      .flatMap((other) =>
        matches(other, poem, meaning, false)
          .filter((m) => !usedWord(links, other, m.word))
          .map((match) => ({ other, match }))
      )
      .sort((a, b) => b.match.weight - a.match.weight)[0];
    if (best) links.push(link(best.other, poem, best.match));
    else console.warn(`Nothing links to "${poem.slug}"`);
  }

  const graph = {
    poems: poems.map(({ slug, lines }) => ({ slug, lines })),
    // `via` is left out (undefined is dropped).
    links: links.map((l) => ({ ...l, via: undefined })),
  };
  await writeFile(GRAPH_FILE, JSON.stringify(graph, null, 2) + '\n');
  await writeShells(poems);

  for (const l of links) {
    console.log(
      `${l.from} "${l.word.text}" → ${l.to} ${l.via} (${l.score.toFixed(2)})`
    );
  }
}

/**
 * Every poem, as `{ slug, lines, words }`. The file's first line is the
 * title, which is `lines[0]`; the poem itself starts after the blank line
 * below it. `words` maps each word it could link from to where it first
 * appears.
 */
async function readPoems() {
  const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith('.md'));
  return Promise.all(
    files.sort().map(async (file) => {
      const slug = basename(file, '.md');
      if (RESERVED.has(slug)) throw new Error(`"${slug}" can't be a poem name`);
      const source = await readFile(CONTENT_DIR + file, 'utf8');
      const [title, ...rest] = source
        .trimEnd()
        .split(/\r?\n/)
        .map((line) => line.trimEnd());
      const lines = [title, ...rest.slice(rest[0] === '' ? 1 : 0)];
      const hash = createHash('sha256').update(source).digest('hex');
      return { slug, lines, hash, words: linkableWords(lines) };
    })
  );
}

/**
 * See readPoems. Keyed by the word as written, lower case; `root` is its
 * plain form ("lights" → "light").
 */
function linkableWords(lines) {
  const words = new Map();
  lines.forEach((text, line) => {
    const doc = compromise(text);
    doc.compute('root');
    for (const term of doc.json({ offset: true }).flatMap((s) => s.terms)) {
      const root = term.root ?? term.normal;
      const { start, length } = term.offset;
      const word = text.slice(start, start + length);
      if (!isLinkable(root, term.tags) || words.has(word.toLowerCase())) {
        continue;
      }
      words.set(word.toLowerCase(), { root, line, start, length, text: word });
    }
  });
  return words;
}

/** Nouns, verbs and adjectives that mean something on their own. */
function isLinkable(root, tags) {
  return (
    /^[a-z]{3,}$/.test(root) &&
    // Not noise like "Ffffffff".
    !/(.)\1\1/.test(root) &&
    !WEAK.has(root) &&
    tags.some((t) => t === 'Noun' || t === 'Verb' || t === 'Adjective') &&
    !tags.some((t) =>
      ['Pronoun', 'Possessive', 'Auxiliary', 'Copula', 'Modal'].includes(t)
    )
  );
}

/**
 * Gives each poem its card's `themes` and `anchors` (the words it can link
 * from, as `{ word, suggests }`), writing cards for poems that are new or
 * changed, or in `reread`, or whose cards are from before words had
 * `suggests`.
 */
async function readCards(poems, reread) {
  await mkdir(CARDS_DIR, { recursive: true });
  // Cards for poems that are gone.
  for (const file of await readdir(CARDS_DIR)) {
    if (!poems.some((p) => `${p.slug}.json` === file)) {
      await rm(CARDS_DIR + file);
    }
  }
  let model;
  for (const poem of poems) {
    const file = `${CARDS_DIR}${poem.slug}.json`;
    let card = await readFile(file, 'utf8')
      .then((json) => JSON.parse(json))
      .catch(() => null);
    if (
      card?.hash !== poem.hash ||
      reread.has(poem.slug) ||
      typeof card.words[0] === 'string'
    ) {
      console.log(`Reading "${poem.lines[0]}"…`);
      model ??= await loadCardModel();
      card = { hash: poem.hash, ...(await writeCard(model, poem)) };
      await writeFile(file, JSON.stringify(card, null, 2) + '\n');
    }
    poem.themes = card.themes;
    poem.anchors = [];
    for (const { word, suggests } of card.words) {
      const place = poem.words.get(word.toLowerCase());
      if (place && !poem.anchors.some((a) => a.word === place)) {
        // The model sometimes slips into another language; then the word
        // stands for itself.
        poem.anchors.push({
          word: place,
          suggests: /^[a-z ,'-]+$/i.test(suggests)
            ? suggests.toLowerCase()
            : place.root,
        });
      }
    }
  }
  await model?.llama.dispose();
}

async function loadCardModel() {
  const llama = await getLlama();
  const model = await llama.loadModel({
    modelPath: await resolveModelFile(CARD_MODEL),
  });
  return { llama, model };
}

/** Asks the model what `poem` is about: see the top of this file. */
async function writeCard({ llama, model }, poem) {
  const numbered = poem.lines.flatMap((text, line) =>
    line > 0 && text ? [{ line, text }] : []
  );
  // A poem that's only a title has no lines to read: its title's words
  // stand for themselves.
  if (numbered.length === 0) {
    return {
      themes: [],
      words: [...poem.words.values()].map((w) => ({
        word: w.text,
        suggests: w.root,
      })),
    };
  }
  const words = [...poem.words.values()].map((w) => w.text);
  const grammar = await llama.createGrammarForJsonSchema({
    type: 'object',
    properties: {
      themes: {
        type: 'array',
        minItems: CARD_THEMES.min,
        maxItems: CARD_THEMES.max,
        items: {
          type: 'object',
          properties: {
            theme: { type: 'string' },
            line: { enum: numbered.map((l) => l.line) },
          },
        },
      },
      // A poem with too few words to choose from gets them all.
      words: {
        type: 'array',
        minItems: Math.min(CARD_WORDS.min, words.length),
        maxItems: CARD_WORDS.max,
        items: {
          type: 'object',
          properties: {
            word: words.length > 0 ? { enum: words } : { type: 'string' },
            suggests: { type: 'string' },
          },
        },
      },
    },
  });
  const context = await model.createContext({ contextSize: 4096 });
  const session = new LlamaChatSession({
    contextSequence: context.getSequence(),
    systemPrompt:
      'You read poems closely, for a wiki that links poems by what they ' +
      'mean. You always answer in English.',
  });
  const answer = await session.prompt(
    `Title: ${poem.lines[0]}\n\n` +
      numbered.map((l) => `${l.line}: ${l.text}`).join('\n') +
      '\n\nAnswer in JSON: {"themes": [{"theme": …, "line": …}, …], ' +
      '"words": [{"word": …, "suggests": …}, …]}.\n' +
      `themes: ${CARD_THEMES.min} to ${CARD_THEMES.max} things this poem is ` +
      'about as a whole, each one or two plain English words (like "preserving" ' +
      'or "insomnia"), concrete and particular to this poem rather than ' +
      'vague (not "life" or "emotion"), each with the number of the line ' +
      'that shows it most.\n' +
      `words: ${CARD_WORDS.min} to ${CARD_WORDS.max} different words ` +
      "from the poem that carry what it's about, most telling first, each " +
      'with what it suggests in this poem, in one or two plain English words (like ' +
      '"sweat" suggesting "dread").',
    { grammar, temperature: 0 }
  );
  await context.dispose();
  return grammar.parse(answer);
}

/** What a link to `poem` can land on: its title's words, and its themes. */
const targets = (poem) => [
  ...[...poem.words.values()]
    .filter((w) => w.line === 0)
    .map((w) => ({ text: w.root, line: 0, title: true })),
  ...poem.themes.map((t) => ({ text: t.theme.toLowerCase(), line: t.line })),
];

/**
 * How `from` could link to `to`, best first: for each word `from` can link
 * from, the title word or theme of `to` closest in meaning to it or what it
 * suggests, if close enough (or however far, without `minimums`). `score` is how close;
 * `weight` is that with the title's pull, and is what matches are ranked
 * by.
 */
function matches(from, to, meaning, minimums = true) {
  const found = [];
  const closeTo = (text, target) =>
    text === target.text
      ? 1
      : cosine(meaning.get(text), meaning.get(target.text));
  for (const { word, suggests } of from.anchors) {
    let best = null;
    for (const target of targets(to)) {
      const score = Math.max(
        closeTo(word.root, target),
        closeTo(suggests, target)
      );
      if (minimums && score < (target.title ? TITLE_MIN : THEME_MIN)) {
        continue;
      }
      const weight = target.title ? score * TITLE_WEIGHT : score;
      if (!best || weight > best.weight) {
        best = { word, suggests, target, score, weight };
      }
    }
    if (best) found.push(best);
  }
  return found.sort((a, b) => b.weight - a.weight);
}

const closeness = (matches) =>
  matches.slice(0, MATCHES_PER_SCORE).reduce((sum, m) => sum + m.weight, 0);

/** Whether `poem` has as many links in as it can take. */
const full = (links, poem) =>
  links.filter((l) => l.to === poem.slug).length >= MAX_LINKS_IN;

/** Whether `poem` already has a link on `word`. */
const usedWord = (links, poem, word) =>
  links.some((l) => l.from === poem.slug && l.word.root === word.root);

/** `via` is only for the log: it's what a model wrote. */
const link = (from, to, { word, suggests, target, score }) => ({
  from: from.slug,
  to: to.slug,
  score: Number(score.toFixed(3)),
  word,
  line: target.line,
  via: `(${suggests}) ${target.title ? 'title' : 'theme'} "${target.text}"`,
});

const cosine = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

/** Each word's meaning, as a vector of length 1. */
async function embed(words) {
  const cache = await readFile(CACHE_FILE, 'utf8')
    .then((json) => JSON.parse(json))
    .catch(() => ({}));
  const known = cache[WORD_MODEL] ?? {};
  const fresh = words.filter((w) => !known[w]);
  if (fresh.length > 0) {
    console.log(`Reading the meaning of ${fresh.length} words…`);
    const model = await pipeline('feature-extraction', WORD_MODEL, {
      dtype: 'q8',
    });
    const vectors = await model(fresh, { pooling: 'mean', normalize: true });
    vectors.tolist().forEach((v, i) => (known[fresh[i]] = v));
    await mkdir(path('../node_modules/.cache/'), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify({ [WORD_MODEL]: known }));
  }
  return new Map(words.map((w) => [w, known[w]]));
}

/** An HTML shell per poem, and none for poems that are gone. */
async function writeShells(poems) {
  const slugs = new Set(poems.map((p) => p.slug));
  await mkdir(SHELLS_DIR, { recursive: true });
  for (const entry of await readdir(SHELLS_DIR, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      !slugs.has(entry.name) &&
      !RESERVED.has(entry.name)
    ) {
      await rm(SHELLS_DIR + entry.name, { recursive: true });
    }
  }
  for (const { slug } of poems) {
    await mkdir(SHELLS_DIR + slug, { recursive: true });
    await writeFile(
      `${SHELLS_DIR}${slug}/index.html`,
      `<!-- @page poem-${slug} -->\n<!-- Rendered from src/pages/poem/ by build/site-pages-plugin.ts. -->\n`
    );
  }
}

await main();
