import epk from './epk/page.config.ts';
import home from './home/page.config.ts';
import notFound from './not-found/page.config.ts';
import secret from './secret/page.config.ts';
import type { PageConfig } from '../site/types.ts';

/**
 * Every page on the site. Adding a page: make a folder here with a
 * page.config.ts (and usually a page.tsx and main.ts, see README), add it
 * to this list and give it an HTML shell at its path.
 *
 * Build-time and tests only: the browser imports a page's own config, so
 * one page's content (or secrets) never ends up in another's bundle.
 */
export const pages: PageConfig[] = [home, epk, secret, notFound];
