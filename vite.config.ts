import { defineConfig } from 'vitest/config';
import { cssOrder } from './build/css-order.ts';
import { pageInputs, sitePages } from './build/site-pages-plugin.ts';

export default defineConfig({
  base: '/',
  // Separate HTML pages, no single-page-app fallback to index.html.
  appType: 'mpa',
  // cssOrder after sitePages, to see the links it renders.
  plugins: [sitePages(), cssOrder()],
  // The HTML shells have no scripts for the dev server to scan, so point
  // it at the page scripts: it bundles their packages at startup rather
  // than finding them page by page, which reloads the page each time.
  optimizeDeps: {
    entries: ['src/pages/*/main.ts', 'src/app/*.ts'],
  },
  build: {
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: { passes: 2, drop_console: true, drop_debugger: true },
      format: { comments: false },
    },
    cssMinify: 'lightningcss',
    // Background variants must stay files for <picture> to pick between them.
    assetsInlineLimit: (file) =>
      file.includes('/assets/bg/') ? false : undefined,
    rolldownOptions: {
      input: pageInputs(import.meta.dirname),
      output: {
        // Each component's CSS in a file of its own. Left to itself, a
        // component only one page uses joins that page's sheets, and then
        // its layout's can't go between them (see build/css-order.ts).
        codeSplitting: {
          groups: [
            {
              debugName: 'component-css',
              name: (id) =>
                /[\\/]src[\\/]components[\\/]([^\\/]+)[\\/][^\\/]+\.css(\?|$)/.exec(
                  id
                )?.[1] ?? null,
            },
          ],
        },
      },
    },
  },
  test: {
    include: ['{src,build}/**/*.test.{ts,tsx}'],
  },
});
