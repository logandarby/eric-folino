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

/** A stylesheet the page links, and where it falls in the cascade. */
export interface Stylesheet {
  href: string;
  tier: number;
}

/**
 * Shared styles first, then components, then layouts (which may restyle the
 * components they arrange), then sheets borrowed from other pages and
 * finally the page's own. Sheets in the same tier style different things,
 * so their order among themselves doesn't matter; the build keeps the
 * tiers in order (see build/css-order.ts).
 */
const CASCADE = [
  '/src/styles/',
  '/src/components/',
  '/src/layouts/',
  '/src/pages/',
];
/**
 * The tier of the sheet at `href`, as linked by the page in
 * src/pages/<ownFolder>/ (or by another page, if not given).
 */
export const tierOf = (href: string, ownFolder?: string) => {
  if (ownFolder && href.startsWith(`/src/pages/${ownFolder}/`)) {
    return CASCADE.length;
  }
  const i = CASCADE.findIndex((prefix) => href.startsWith(prefix));
  return i === -1 ? CASCADE.length + 1 : i;
};

/**
 * Runs `render` for the page in src/pages/<ownFolder>/, returning what it
 * made and the stylesheets it asked for, in cascade order.
 */
export function collectStylesheets<T>(
  root: string,
  ownFolder: string,
  render: () => T
): { result: T; stylesheets: Stylesheet[] } {
  const files = new Set<string>();
  collecting = { root, files };
  try {
    const result = render();
    const stylesheets = [...files]
      .map((href) => ({ href, tier: tierOf(href, ownFolder) }))
      .sort((a, b) => a.tier - b.tier);
    return { result, stylesheets };
  } finally {
    collecting = null;
  }
}
