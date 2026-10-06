import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Files a page publishes at a fixed address, like press photos at
 * /press/photo.jpg, which need to keep their names (unlike assets Vite
 * bundles, whose names change with their content). Pages write them here
 * while rendering; the site-pages plugin serves this folder on the dev
 * server and copies it into the build.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

export const PUBLISHED_DIR = resolve(
  ROOT,
  'node_modules/.cache/published-files'
);

/** Where a URL path like "/press/a.jpg" lives inside PUBLISHED_DIR. */
export function publishedPath(url: string, dir = PUBLISHED_DIR): string {
  const path = resolve(dir, `.${url}`);
  if (!path.startsWith(dir + sep))
    throw new Error(`Bad published path: ${url}`);
  return path;
}

/** Publishes a copy of `source` (an absolute path) at `url`. Returns `url`. */
export function publishCopy(
  url: string,
  source: string,
  dir = PUBLISHED_DIR
): string {
  const out = publishedPath(url, dir);
  const from = statSync(source);
  const to = existsSync(out) ? statSync(out) : null;
  if (!to || to.size !== from.size || to.mtimeMs < from.mtimeMs) {
    mkdirSync(dirname(out), { recursive: true });
    copyFileSync(source, `${out}.tmp`);
    renameSync(`${out}.tmp`, out);
  }
  return url;
}

/**
 * Publishes a file made from `inputs` (absolute paths) at `url`, calling
 * `make` only when an input has changed since the last time.
 */
export function publishMade(
  url: string,
  inputs: string[],
  make: () => Uint8Array,
  dir = PUBLISHED_DIR
): string {
  const out = publishedPath(url, dir);
  const keyFile = `${out}.key`;
  const key = createHash('sha1')
    .update(
      JSON.stringify(
        inputs.map((file) => {
          const { size, mtimeMs } = statSync(file);
          return [file, size, mtimeMs];
        })
      )
    )
    .digest('hex');
  const current = existsSync(keyFile) && readFileSync(keyFile, 'utf8') === key;
  if (!current || !existsSync(out)) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(`${out}.tmp`, make());
    renameSync(`${out}.tmp`, out);
    writeFileSync(keyFile, key);
  }
  return url;
}
