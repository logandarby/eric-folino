import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked, type Tokens } from 'marked';
import { isResizable, responsiveImage } from './images.ts';
import { escapeAttribute, raw, type Html } from './jsx/jsx-runtime.ts';

/*
 * Markdown content, rendered at build time. A file may start with simple
 * front matter, one `key: value` per line between `---` lines:
 *
 *   ---
 *   title: A conversation in the dark
 *   outlet: Some Zine
 *   ---
 *   The interview text…
 *
 * Markdown is written by the band, so HTML inside it is trusted.
 *
 * Images can be relative to the Markdown file (`![Alt](./media/photo.jpg)`)
 * or to the project (`/src/…`, or `/press/…` for files in public/). JPEGs,
 * PNGs and the like are resized automatically (see images.ts).
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

export interface MarkdownFile<Field extends string = string> {
  /** File name without `.md`. */
  slug: string;
  /** Front matter: the required fields, plus any others. */
  data: Record<Field, string> & Partial<Record<string, string>>;
  html: Html;
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Reads one Markdown file. `required` lists front matter fields it must
 * have; a missing one fails the build rather than leaving a gap on the page.
 */
export function readMarkdown<Field extends string = never>(
  file: URL | string,
  required: readonly Field[] = []
): MarkdownFile<Field> {
  const path = typeof file === 'string' ? file : fileURLToPath(file);
  const source = readFileSync(path, 'utf8');
  const match = FRONT_MATTER.exec(source);
  const data: Record<string, string> = {};
  for (const line of match?.[1].split(/\r?\n/) ?? []) {
    const field = /^([\w-]+):\s*(.*)$/.exec(line);
    if (field) data[field[1]] = field[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  for (const field of required) {
    if (!data[field])
      throw new Error(`${path} is missing "${field}" in its front matter`);
  }
  const body = match ? source.slice(match[0].length) : source;
  return {
    slug: basename(path, '.md'),
    data: data as MarkdownFile<Field>['data'],
    html: raw(markdownParser(path).parse(body, { async: false })),
  };
}

/** A Markdown parser whose images resolve relative to `file`. */
function markdownParser(file: string): Marked {
  return new Marked({
    renderer: {
      image({ href, text }: Tokens.Image): string {
        const path = localPath(href, file);
        if (path && isResizable(path)) {
          return responsiveImage(path, { alt: text }).value;
        }
        // Remote images, and formats not worth resizing (GIF, SVG).
        // Files in public/ are served at their own address; others by Vite.
        const inPublic =
          !path || path.startsWith(resolve(ROOT, 'public') + sep);
        const src = inPublic
          ? href
          : `/${relative(ROOT, path).split(sep).join('/')}`;
        return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(text)}" loading="lazy" decoding="async">`;
      },
    },
  });
}

/** The file an image address in `file` points to, or null if it isn't local. */
function localPath(href: string, file: string): string | null {
  if (/^([a-z]+:|\/\/)/i.test(href)) return null;
  const candidates = href.startsWith('/')
    ? [resolve(ROOT, `.${href}`), resolve(ROOT, `public${href}`)]
    : [resolve(dirname(file), href)];
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error(`${file}: image "${href}" not found`);
  return found;
}

/** Every `.md` file in a folder, except ones starting with `_` (examples, drafts). */
export function readMarkdownDir<Field extends string = never>(
  dir: URL,
  required: readonly Field[] = []
): MarkdownFile<Field>[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
    .sort()
    .map((name) => readMarkdown(new URL(name, dir), required));
}
