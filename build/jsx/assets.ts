import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Components declare the stylesheets they need while they render, so a
 * page links exactly the CSS for what's on it:
 *
 *   stylesheet(import.meta.url, './socials.css');
 *
 * The page renderer collects them (see build/render-page.tsx) and Vite
 * bundles the links like any hand-written ones.
 */

let collecting: { root: string; files: Set<string> } | null = null;

/** Links `file` (relative to the calling module) on the page being rendered. */
export function stylesheet(moduleUrl: string, file: string): void {
  if (!collecting) throw new Error('stylesheet() called outside a page render');
  const path = fileURLToPath(new URL(file, moduleUrl));
  collecting.files.add(
    `/${relative(collecting.root, path).split(sep).join('/')}`
  );
}

/**
 * Shared styles first, then components, then layouts (which may restyle the
 * components they arrange) and finally the page's own.
 */
const CASCADE = [
  '/src/styles/',
  '/src/components/',
  '/src/layouts/',
  '/src/pages/',
];
const rank = (url: string) => {
  const i = CASCADE.findIndex((prefix) => url.startsWith(prefix));
  return i === -1 ? CASCADE.length : i;
};

/** Runs `render`, returning what it made and the stylesheets it asked for. */
export function collectStylesheets<T>(
  root: string,
  render: () => T
): { result: T; stylesheets: string[] } {
  const files = new Set<string>();
  collecting = { root, files };
  try {
    const result = render();
    const stylesheets = [...files].sort((a, b) => rank(a) - rank(b));
    return { result, stylesheets };
  } finally {
    collecting = null;
  }
}
