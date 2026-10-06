import { readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';
import type { Connect, Plugin } from 'vite';
import { siteConfig } from '../src/site.config.ts';
import { findPage, pageFile, templates } from './templates.ts';

/**
 * Expands partial directives in the HTML page shells:
 *
 *   <!-- @page about -->   sets which page config the shell renders
 *   <!-- @head -->         meta tags, layout script, config CSS variables
 *   <!-- @background -->   responsive background <picture>
 *   <!-- @hero -->         title, nav and (if enabled) blobs
 *
 * Runs before Vite's own HTML processing, so asset URLs in the output are
 * hashed and bundled like hand-written ones.
 *
 * Also makes `vite` and `vite preview` answer unknown addresses with the
 * 404 page, the way GitHub Pages does in production.
 */
export function sitePages(): Plugin {
  let root = process.cwd();
  return {
    name: 'site-pages',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(
        notFound(root, (url) =>
          server.transformIndexHtml(
            url,
            readFileSync(resolve(root, NOT_FOUND_FILE), 'utf8')
          )
        )
      );
    },
    configurePreviewServer(server) {
      const outDir = resolve(root, server.config.build.outDir);
      server.middlewares.use(
        notFound(outDir, () =>
          readFileSync(resolve(outDir, NOT_FOUND_FILE), 'utf8')
        )
      );
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, { filename }) {
        const pageId = /<!--\s*@page\s+([\w-]+)\s*-->/.exec(html)?.[1];
        if (!pageId) {
          throw new Error(
            `${filename} is missing a <!-- @page id --> directive`
          );
        }
        const page = findPage(pageId);
        return html
          .replace(/<!--\s*@page\s+[\w-]+\s*-->\n?/, '')
          .replace(/<!--\s*@(\w+)\s*-->/g, (_, name: string) => {
            const template = templates[name];
            if (!template)
              throw new Error(`Unknown directive @${name} in ${filename}`);
            return template({ root, page });
          });
      },
    },
  };
}

/** Rollup inputs for every page in the config. */
export function pageInputs(root: string): Record<string, string> {
  return Object.fromEntries(
    siteConfig.pages.map((page) => [page.id, resolve(root, pageFile(page))])
  );
}

const NOT_FOUND_FILE = '404.html';

/**
 * Serves the 404 page for HTML requests that don't match a file under
 * `dir`, and redirects `/about` to `/about/` like GitHub Pages.
 */
function notFound(
  dir: string,
  render: (url: string) => string | Promise<string>
): Connect.NextHandleFunction {
  return (req: IncomingMessage, res: ServerResponse, next) => {
    const accept = req.headers.accept ?? '';
    if (req.method !== 'GET' || !accept.includes('text/html')) return next();

    const path = decodeURIComponent(
      new URL(req.url ?? '/', 'http://x').pathname
    );
    const file = join(dir, path.endsWith('/') ? `${path}index.html` : path);
    if (!file.startsWith(dir)) return next();
    if (isFile(file)) return next();
    if (!path.endsWith('/') && isFile(join(dir, path, 'index.html'))) {
      res.writeHead(301, { Location: `${path}/` }).end();
      return;
    }
    Promise.resolve(render(req.url ?? '/'))
      .then((html) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      })
      .catch(next);
  };
}

const isFile = (path: string) =>
  statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
