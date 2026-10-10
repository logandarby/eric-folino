import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { StageLayout } from '../src/layouts/stage.tsx';
import { Head, safeJson } from '../src/layouts/head.tsx';
import { siteConfig } from '../src/site/site.config.ts';
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
 *   main.ts    the browser entry, if the page has scripts of its own;
 *              it hands them to pageScript() (see src/app/router.ts)
 *
 * A page without page.tsx, or a draft when drafts are hidden, gets the
 * placeholder: the stage with its `placeholder` dialog. A `bare` page is
 * just its page.tsx, in the browser's own look.
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

  if (full && page.bare) return renderBare(page, view(page));

  const { result: body, stylesheets } = collectStylesheets(root, folder, () =>
    full ? view(page) : <PlaceholderPage page={page} />
  );

  const html = (
    <html lang="en" data-page={page.id}>
      <head>
        <Head page={page} />
        {/* data-tier is for the build (see build/css-order.ts). */}
        {[{ href: SHARED_STYLES, tier: 0 }, ...stylesheets].map(
          ({ href, tier }) => (
            <link rel="stylesheet" href={href} data-tier={tier} />
          )
        )}
        {entry && <script type="module" src={entry}></script>}
      </head>
      <body>
        {/* What changes from page to page (see src/app/router.ts). */}
        <div id="swup">{body}</div>
      </body>
    </html>
  );
  // Resizes any images the page used (see build/images.ts).
  return resolveImages(`<!doctype html>\n${html.value}`, { root });
}

/** A page with `bare` set: its markup, and only what <head> must have. */
function renderBare(page: PageConfig, body: Html): string {
  const html = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{page.title ?? siteConfig.siteName}</title>
        <meta name="description" content={page.description} />
        {page.noindex && <meta name="robots" content="noindex" />}
      </head>
      <body>{body}</body>
    </html>
  );
  return `<!doctype html>\n${html.value}`;
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
