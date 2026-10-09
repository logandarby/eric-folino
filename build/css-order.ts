import type { OutputBundle } from 'rolldown';
import type { Plugin } from 'vite';
import { tierOf } from './jsx/assets.ts';

/*
 * Keeps a page's stylesheets in cascade order (see build/jsx/assets.ts),
 * so a later tier still overrides an earlier one of the same specificity.
 *
 * The dev server serves each <link> as written, but the build turns them
 * into imports and splits the CSS by chunk: a sheet many pages share gets
 * a file of its own, and Vite links those files in chunk order, not the
 * page's. That once put .poem (poems.css) after .poem--framed (poem.css)
 * and undid the frame's padding. So this puts the built links back in
 * tier order, and fails the build if it can't: when a built file holds
 * sheets from tiers that another file's sheets have to sit between.
 */
export function cssOrder(): Plugin[] {
  let root = '';
  let base = '/';
  // Each page's stylesheets and their tiers, by its HTML file.
  const tiers = new Map<string, Map<string, number>>();
  // The source sheets in each built CSS file.
  let sources = new Map<string, string[]>();
  return [
    {
      name: 'css-order:collect',
      apply: 'build',
      configResolved(config) {
        root = config.root;
        base = config.base;
      },
      transformIndexHtml: {
        // After site-pages renders the page, before Vite takes the links.
        order: 'pre',
        handler(html, { filename }) {
          const sheets = new Map<string, number>();
          for (const { tag, href } of stylesheetLinks(html)) {
            const tier = /\bdata-tier="(\d+)"/.exec(tag)?.[1];
            if (tier === undefined) {
              throw new Error(`${filename}: ${href} has no data-tier`);
            }
            sheets.set(root + href, Number(tier));
          }
          tiers.set(filename, sheets);
        },
      },
    },
    {
      name: 'css-order:sort',
      apply: 'build',
      generateBundle: {
        // Before Vite folds CSS-only chunks into the chunks importing them,
        // when each chunk lists just the CSS file made from its own sheets.
        order: 'pre',
        handler(_, bundle) {
          sources = sourcesByCssFile(bundle);
        },
      },
      transformIndexHtml: {
        order: 'post',
        handler(html, { filename }) {
          const sheets = tiers.get(filename);
          if (!sheets) return;
          const list = (files: string[]) =>
            files.map((f) => f.slice(root.length)).join(', ');
          const fail = (why: string): never => {
            throw new Error(`${filename}: CSS out of cascade order, ${why}`);
          };

          const links = stylesheetLinks(html).map((link) => {
            const files =
              sources.get(link.href.slice(base.length)) ??
              fail(`no chunk made ${link.href}`);
            // Rolldown may bundle in sheets the page didn't link, from
            // chunks it merged; they go by where they live.
            const linkTiers = files.map(
              (file) => sheets.get(file) ?? tierOf(file.slice(root.length))
            );
            linkTiers.forEach((tier, i) => {
              if (tier < linkTiers[i - 1]) {
                fail(`${link.href} has ${files[i]} after ${files[i - 1]}`);
              }
            });
            return {
              ...link,
              files,
              first: linkTiers[0],
              last: linkTiers[linkTiers.length - 1],
            };
          });

          // Stable, so links spanning the same tiers keep Vite's order.
          links.sort((a, b) => a.first - b.first || a.last - b.last);
          links.reduce((prev, link) => {
            if (link.first < prev.last) {
              fail(
                `${prev.href} (${list(prev.files)}) and ` +
                  `${link.href} (${list(link.files)}) have tiers that interleave`
              );
            }
            return link.last > prev.last ? link : prev;
          });

          // Put the sorted links where the built ones were.
          let i = 0;
          return html.replace(LINK_RE, (tag) =>
            isStylesheet(tag) ? links[i++].tag : tag
          );
        },
      },
    },
  ];
}

const LINK_RE = /<link\b[^>]*>/g;

const isStylesheet = (tag: string) => /\brel="stylesheet"/.test(tag);

function stylesheetLinks(html: string): { tag: string; href: string }[] {
  return [...html.matchAll(LINK_RE)]
    .map(([tag]) => ({ tag, href: /\bhref="([^"]+)"/.exec(tag)?.[1] ?? '' }))
    .filter(({ tag, href }) => isStylesheet(tag) && href.endsWith('.css'));
}

/** The source sheets in each built CSS file, in the order it holds them. */
function sourcesByCssFile(bundle: OutputBundle): Map<string, string[]> {
  const sources = new Map<string, string[]>();
  for (const chunk of Object.values(bundle)) {
    if (chunk.type !== 'chunk') continue;
    const css = chunk.moduleIds
      .map((id) => id.split('?')[0])
      .filter((id) => id.endsWith('.css'));
    const files = [...(chunk.viteMetadata?.importedCss ?? [])];
    if (files.length > 1) {
      throw new Error(`${chunk.fileName} has more than one CSS file`);
    }
    if (files.length === 1) sources.set(files[0], css);
  }
  return sources;
}
