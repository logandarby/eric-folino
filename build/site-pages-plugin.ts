import {
  cpSync,
  createReadStream,
  existsSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { runnerImport, type Connect, type Plugin } from 'vite';
import { pages } from '../src/pages/pages.ts';
import { siteConfig } from '../src/site/site.config.ts';
import type { PageConfig } from '../src/site/types.ts';
import { PUBLISHED_DIR, publishedPath } from './published-files.ts';
import type { renderPage } from './render-page.tsx';

type Renderer = { renderPage: typeof renderPage };

const RENDERER = '/build/render-page.tsx';

/**
 * Builds every page from its folder in src/pages/ (see render-page.tsx).
 * Each page has an HTML shell at its path holding just
 * `<!-- @page id -->`; the whole document is rendered in its place before
 * Vite's own HTML processing, so asset URLs in it are hashed and bundled
 * like hand-written ones.
 *
 * The renderer is loaded through Vite's module pipeline rather than
 * imported here, because that's what compiles its JSX, and on the dev
 * server it means template edits show up on the next reload.
 *
 * Drafts render in full on the dev server and with SHOW_DRAFTS=1.
 *
 * Files pages publish at fixed addresses (see published-files.ts) are
 * served on the dev server and copied into the build.
 *
 * Also writes sitemap.xml, and makes `vite` and `vite preview` answer
 * unknown addresses with the 404 page, the way GitHub Pages does in
 * production.
 */
export function sitePages(): Plugin {
  let root = process.cwd();
  let showDrafts = false;
  let building = false;
  let loadRenderer: () => Promise<Renderer>;
  return {
    name: 'site-pages',
    configResolved(config) {
      root = config.root;
      building = config.command === 'build';
      showDrafts =
        config.command === 'serve' || Boolean(process.env.SHOW_DRAFTS);
      let built: Promise<Renderer> | undefined;
      loadRenderer = () =>
        (built ??= runnerImport<Renderer>(resolve(root, '.' + RENDERER), {
          root,
          configFile: false,
          logLevel: 'warn',
        }).then((r) => r.module));
    },
    configureServer(server) {
      loadRenderer = () => server.ssrLoadModule(RENDERER) as Promise<Renderer>;
      // Templates only run on the server, so Vite can't hot-update them;
      // reload the page instead.
      server.watcher.on('change', (file) => {
        if (/\.(tsx|md)$/.test(file) || file.includes('/src/site/')) {
          server.ws.send({ type: 'full-reload' });
        }
      });
      server.middlewares.use(servePublished);
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
      async handler(html, { filename }) {
        const pageId = /<!--\s*@page\s+([\w-]+)\s*-->/.exec(html)?.[1];
        if (!pageId) {
          throw new Error(
            `${filename} is missing a <!-- @page id --> directive`
          );
        }
        const { renderPage } = await loadRenderer();
        return renderPage({ root, page: findPage(pageId), showDrafts });
      },
    },
    buildStart() {
      // Start clean, so files a page no longer publishes don't linger.
      if (building) rmSync(PUBLISHED_DIR, { recursive: true, force: true });
    },
    writeBundle({ dir }) {
      if (!dir || !existsSync(PUBLISHED_DIR)) return;
      cpSync(PUBLISHED_DIR, dir, {
        recursive: true,
        // Leave out bookkeeping files (see publishMade).
        filter: (file) => !/\.(key|tmp)$/.test(file),
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: sitemap(showDrafts),
      });
    },
  };
}

function findPage(id: string): PageConfig {
  const page = pages.find((p) => p.id === id);
  if (!page) throw new Error(`No page "${id}" in src/pages/pages.ts`);
  return page;
}

/** HTML file for a page path: "/" → "index.html", "/about/" → "about/index.html". */
export function pageFile(page: PageConfig): string {
  const path = page.path.replace(/^\//, '');
  return path === '' || path.endsWith('/') ? `${path}index.html` : path;
}

/** Indexable pages; hidden drafts only show a placeholder, so they're left out. */
function sitemap(showDrafts: boolean): string {
  const urls = pages
    .filter((p) => !p.noindex && (!p.draft || showDrafts))
    .map((p) => `  <url><loc>${siteConfig.siteUrl}${p.path}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/** Rollup inputs for every page in the config. */
export function pageInputs(root: string): Record<string, string> {
  return Object.fromEntries(
    pages.map((page) => [page.id, resolve(root, pageFile(page))])
  );
}

const NOT_FOUND_FILE = '404.html';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.zip': 'application/zip',
};

/** Dev server: answers requests for files pages have published. */
const servePublished: Connect.NextHandleFunction = (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const url = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  let file: string;
  try {
    file = publishedPath(url);
  } catch {
    return next();
  }
  if (!isFile(file) || /\.(key|tmp)$/.test(file)) return next();
  res.writeHead(200, {
    'Content-Type':
      CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': statSync(file).size,
  });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).pipe(res);
};

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
