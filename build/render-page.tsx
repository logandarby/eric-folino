import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { StageLayout } from '../src/layouts/stage.tsx';
import { Head, safeJson } from '../src/layouts/head.tsx';
import type { PageConfig } from '../src/site/types.ts';
import { resolveImages } from './images.ts';
import { collectStylesheets } from './jsx/assets.ts';
import { raw, type Html } from './jsx/jsx-runtime.ts';

/*
 * Renders a whole page from its folder in src/pages/<id>/ (or <view>/, for
 * pages that share one, like the poems):
 *
 *   page.tsx   the markup (default export, rendered at build time, given
 *              the page's config)
 *   main.ts    the browser entry, if the page has scripts of its own
 *
 * A page without page.tsx, or a draft when drafts are hidden, gets the
 * placeholder: the stage with its `placeholder` dialog.
 *
 * Loaded through Vite's module pipeline by site-pages-plugin.ts (that's
 * what compiles the JSX), so it's fresh on every request in dev.
 */

type PageView = (page: PageConfig) => Html;

const views = import.meta.glob<PageView>('../src/pages/*/page.tsx', {
  eager: true,
  import: 'default',
});

const PLACEHOLDER_ENTRY = '/src/app/placeholder-page.ts';
const SHARED_STYLES = '/src/styles/main.css';

export interface RenderOptions {
  root: string;
  page: PageConfig;
  /** Render drafts in full rather than as their placeholder. */
  showDrafts: boolean;
}

export async function renderPage({
  root,
  page,
  showDrafts,
}: RenderOptions): Promise<string> {
  const folder = page.view ?? page.id;
  const view = views[`../src/pages/${folder}/page.tsx`] as PageView | undefined;
  const full = view !== undefined && (!page.draft || showDrafts);
  const ownEntry = `/src/pages/${folder}/main.ts`;
  const entry = full
    ? existsSync(resolve(root, `.${ownEntry}`)) && ownEntry
    : PLACEHOLDER_ENTRY;

  const { result: body, stylesheets } = collectStylesheets(root, () =>
    full ? view(page) : <PlaceholderPage page={page} />
  );

  const html = (
    <html lang="en" data-page={page.id}>
      <head>
        <Head page={page} />
        {[SHARED_STYLES, ...stylesheets].map((href) => (
          <link rel="stylesheet" href={href} />
        ))}
        {entry && <script type="module" src={entry}></script>}
      </head>
      <body>{body}</body>
    </html>
  );
  // Resizes any images the page used (see build/images.ts).
  return resolveImages(`<!doctype html>\n${html.value}`, { root });
}

/** The stage, plus the page's dialog as data for placeholder-page.ts. */
function PlaceholderPage({ page }: { page: PageConfig }) {
  if (!page.placeholder) {
    throw new Error(
      `Page "${page.id}" needs a page.tsx or a placeholder (or, as a draft, both)`
    );
  }
  return (
    <>
      <StageLayout page={page} />
      <script type="application/json" data-placeholder>
        {raw(safeJson(page.placeholder))}
      </script>
    </>
  );
}
