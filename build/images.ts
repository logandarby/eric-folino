import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { basename, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { escapeAttribute, raw, type Html } from './jsx/jsx-runtime.ts';

/*
 * Responsive images, made at build time. Anywhere in a page:
 *
 *   responsiveImage('/abs/path/photo.jpg', { alt: '…', sizes: '…' })
 *
 * becomes a <picture> offering AVIF and WebP at several widths (never wider
 * than the original), with a JPEG fallback, lazy loading and the image's
 * width and height so the page doesn't jump as it loads. Markdown images
 * get this automatically (see markdown.ts).
 *
 * Rendering is synchronous but resizing isn't, so this leaves a
 * placeholder comment that `resolveImages` swaps for the finished markup
 * once the page is rendered. Resized files are cached by content, so each
 * size is only made once.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Inside node_modules: ignored by git, and wiped by a clean install. */
export const DEFAULT_CACHE_DIR = resolve(
  ROOT,
  'node_modules/.cache/responsive-images'
);

const WIDTHS = [480, 800, 1200, 1600, 2400];
/** The fallback <img> for browsers without AVIF or WebP. */
const FALLBACK_WIDTH = 1200;
const FORMATS = {
  avif: { quality: 50, effort: 4 },
  webp: { quality: 75 },
  jpeg: { quality: 78, mozjpeg: true },
} as const;
type Format = keyof typeof FORMATS;

/** Formats sharp can read and that are worth resizing. GIFs and SVGs pass through. */
const RESIZABLE = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.tif',
  '.tiff',
]);

export interface ImageOptions {
  alt: string;
  /**
   * How wide the image shows, as an <img sizes> value, so the browser can
   * pick a file. Default: the width of a text column.
   */
  sizes?: string;
  class?: string;
  /** Load straight away instead of when scrolled near. For images at the top of a page. */
  eager?: boolean;
}

interface Placeholder extends ImageOptions {
  file: string;
}

const PLACEHOLDER = /<!--responsive-image:([\w-]+)-->/g;

export const isResizable = (file: string): boolean =>
  RESIZABLE.has(extname(file).toLowerCase());

/** A responsive version of the image at `file` (an absolute path). */
export function responsiveImage(file: string, options: ImageOptions): Html {
  const data: Placeholder = { file, ...options };
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  return raw(`<!--responsive-image:${encoded}-->`);
}

/** Replaces every responsiveImage placeholder in `html` with its <picture>. */
export async function resolveImages(
  html: string,
  { root, cacheDir = DEFAULT_CACHE_DIR }: { root: string; cacheDir?: string }
): Promise<string> {
  const found = [...html.matchAll(PLACEHOLDER)];
  if (found.length === 0) return html;
  mkdirSync(cacheDir, { recursive: true });
  const pictures = await Promise.all(
    found.map(([, encoded]) => {
      const data = JSON.parse(
        Buffer.from(encoded, 'base64url').toString()
      ) as Placeholder;
      return picture(data, root, cacheDir);
    })
  );
  let i = 0;
  return html.replace(PLACEHOLDER, () => pictures[i++]);
}

async function picture(
  { file, alt, sizes, class: cls, eager }: Placeholder,
  root: string,
  cacheDir: string
): Promise<string> {
  if (!existsSync(file)) throw new Error(`Image not found: ${file}`);
  const source = readFileSync(file);
  const meta = await sharp(source).metadata();
  // Phone photos are often stored sideways with an EXIF note to turn them;
  // .rotate() applies it, so the reported size must be turned too.
  const turned = (meta.orientation ?? 1) >= 5;
  const width = turned ? meta.height : meta.width;
  const height = turned ? meta.width : meta.height;
  if (!width || !height) throw new Error(`Can't read the size of ${file}`);

  const widths = [
    ...new Set([
      ...WIDTHS.filter((w) => w < width),
      Math.min(width, WIDTHS.at(-1) ?? width),
    ]),
  ];
  const hash = createHash('sha1')
    .update(source)
    .update(JSON.stringify(FORMATS))
    .digest('hex')
    .slice(0, 8);
  const name = basename(file, extname(file)).replace(/[^\w-]+/g, '-');
  const url = (path: string) => `/${relative(root, path).split(sep).join('/')}`;

  const make = async (w: number, format: Format) => {
    const out = resolve(cacheDir, `${name}-${hash}-${w}.${format}`);
    await writeOnce(out, async (tmp) => {
      await sharp(source)
        .rotate()
        .resize({ width: w })
        .toFormat(format, FORMATS[format])
        .toFile(tmp);
    });
    return `${url(out)} ${w}w`;
  };

  const fallbackWidth =
    widths.filter((w) => w <= FALLBACK_WIDTH).at(-1) ?? widths[0];
  const [avif, webp, fallback] = await Promise.all([
    Promise.all(widths.map((w) => make(w, 'avif'))),
    Promise.all(widths.map((w) => make(w, 'webp'))),
    make(fallbackWidth, 'jpeg'),
  ]);

  const sizesAttr = escapeAttribute(sizes ?? '(min-width: 800px) 740px, 100vw');
  const img = [
    `<img src="${fallback.split(' ')[0]}"`,
    `alt="${escapeAttribute(alt)}"`,
    `width="${width}" height="${height}"`,
    eager ? 'fetchpriority="high"' : 'loading="lazy"',
    'decoding="async"',
    cls ? `class="${escapeAttribute(cls)}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    `<picture>` +
    `<source type="image/avif" srcset="${avif.join(', ')}" sizes="${sizesAttr}">` +
    `<source type="image/webp" srcset="${webp.join(', ')}" sizes="${sizesAttr}">` +
    `${img}></picture>`
  );
}

/** Files being made right now, so overlapping renders share the work. */
const pending = new Map<string, Promise<void>>();

/**
 * Makes `out` unless it already exists. It's written under a temporary
 * name and then renamed, so a half-written file is never mistaken for a
 * finished one (say, if a build is stopped part way).
 */
function writeOnce(
  out: string,
  write: (tmp: string) => Promise<void>
): Promise<void> {
  if (existsSync(out)) return Promise.resolve();
  let job = pending.get(out);
  if (!job) {
    const tmp = `${out}.${process.pid}.tmp`;
    job = write(tmp)
      .then(() => renameSync(tmp, out))
      .finally(() => pending.delete(out));
    pending.set(out, job);
  }
  return job;
}
