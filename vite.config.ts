import { defineConfig } from 'vitest/config';
import { pageInputs, sitePages } from './build/site-pages-plugin.ts';

export default defineConfig({
  base: '/',
  // Separate HTML pages, no single-page-app fallback to index.html.
  appType: 'mpa',
  plugins: [sitePages()],
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
    },
  },
  test: {
    include: ['{src,build}/**/*.test.{ts,tsx}'],
  },
});
