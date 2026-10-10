import SwupA11yPlugin from '@swup/a11y-plugin';
import SwupScrollPlugin from '@swup/scroll-plugin';
import Swup from 'swup';
import type { Cleanup } from '../core/disposer.ts';
import { hideTooltip } from '../dialog/tooltip.ts';
import {
  mountLayout,
  startSite,
  type PageOptions,
  type Site,
} from './bootstrap.ts';
import { updateHead } from './head.ts';

/*
 * Going from page to page without leaving the document, so what lasts the
 * whole visit does: above all the sound, which browsers only let start
 * after a click or key press on the page itself. Swup fetches the next
 * page and swaps the body's #swup, and keeps the history, scrolling and
 * focus as a normal visit would; head.ts brings over its stylesheets. Without scripts, or if anything fails, links are links.
 *
 * Each page's main.ts hands its setup to `pageScript()` instead of running
 * it, and returns what undoes it: listeners on the window or document,
 * timers, animation loops, WebGL. The router runs it when the page shows
 * and undoes it when the page goes. A page's script loads the first time
 * the page shows; after that it's kept, and runs again from its setup.
 */

/** A page's setup. What it returns undoes it. */
// Pages with nothing to undo return nothing.
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type MountPage = (site: Site) => Cleanup | void;

interface PageEntry {
  mount: MountPage;
  options: PageOptions;
}

/** Each page script that has loaded, by its URL. */
const entries = new Map<string, PageEntry>();
let started: ReturnType<typeof startSite> | null = null;
/** Undoes the page showing now. */
let unmount: Cleanup | null = null;
/** Counts pages shown, so a script that loads late can tell it's too late. */
let shown = 0;

/**
 * Says what a page's script does: `mount` sets it up and returns what
 * undoes it. Called from the page's main.ts with its own URL:
 *
 *   pageScript(import.meta.url, ({ dialogs }) => { …; return cleanup; });
 *
 * The first page of a visit also starts the site and the router.
 */
export function pageScript(
  url: string,
  mount: MountPage,
  options: PageOptions = {}
): void {
  entries.set(url, { mount, options });
  // Later ones are loaded by the router, which shows them itself.
  if (started) return;
  started = startSite();
  startRouter(started.site);
  void show(entryUrl(document));
}

/**
 * Whether the history entry before this one is one of the site's pages, so
 * `history.back()` stays on the site. Each entry remembers it (`fromSite`
 * in its state), so it holds after going back and forward too.
 */
export function cameFromSite(): boolean {
  return historyState().fromSite === true;
}

function historyState(): Record<string, unknown> {
  return (history.state as Record<string, unknown> | null) ?? {};
}

/** Notes on this history entry whether a site page came before it. */
function markEntry(fromSite: boolean): void {
  history.replaceState({ ...historyState(), fromSite }, '');
}

function startRouter(site: Site): void {
  const swup = new Swup({
    // Pages swap at once, with no transition.
    animationSelector: false,
    ignoreVisit: (url, { el, event } = {}) =>
      // A link whose own click handler took it over (a dialog first).
      event?.defaultPrevented === true ||
      Boolean(el?.closest('[data-no-swup], [download]')) ||
      !isPage(url),
    plugins: [
      new SwupScrollPlugin({
        animateScroll: {
          betweenPages: false,
          samePageWithHash: false,
          samePage: false,
        },
      }),
      // Announces the new page and moves focus to it.
      new SwupA11yPlugin(),
    ],
  });
  // The first page: from the site if a page of it linked here. A reload
  // keeps what its entry already says.
  if (typeof historyState().fromSite !== 'boolean') {
    markEntry(sameOrigin(document.referrer));
  }
  // A new page from a link here comes after one of the site's. Swup has
  // made its entry by now; going back and forth, entries keep their own.
  swup.hooks.on('content:replace', (visit) => {
    if (!visit.history.popstate && visit.history.action === 'push') {
      markEntry(true);
    }
  });
  swup.hooks.on('visit:start', () => {
    void site.dialogs.close({ animate: false });
  });
  swup.hooks.before('content:replace', async (visit) => {
    // The swap waits for the next page's stylesheets.
    if (visit.to.document) await updateHead(visit.to.document);
    hide();
  });
  swup.hooks.on('content:replace', (visit) => {
    void show(visit.to.document ? entryUrl(visit.to.document) : null);
  });
}

/** Sets up the page now showing, loading its script if it's new. */
async function show(url: string | null): Promise<void> {
  const id = ++shown;
  if (url && !entries.has(url)) {
    try {
      await import(/* @vite-ignore */ url);
    } catch {
      // Offline, say: load the page the usual way.
      location.reload();
      return;
    }
  }
  if (id !== shown || !started) return;
  // A page without a script of its own still has the layout's.
  const entry = url
    ? entries.get(url)
    : { mount: () => undefined, options: {} };
  if (!entry) {
    console.warn(`${url} didn't call pageScript(import.meta.url, …)`);
    return;
  }
  const { site } = started;
  const cleanups = [mountLayout(site, entry.options), entry.mount(site)];
  unmount = () => {
    for (const cleanup of cleanups.reverse()) cleanup?.();
  };
}

/** Undoes the page that's going, before its content does. */
function hide(): void {
  // A script still loading for it mustn't set it up after all.
  shown++;
  unmount?.();
  unmount = null;
  hideTooltip();
  started?.releaseSounds();
}

/**
 * The URL of a page's own script (see build/render-page.tsx), if it has
 * one: its last module script, but for the dev server's. (A script that
 * many pages share is built with the chunks it needs as scripts before
 * it.)
 */
function entryUrl(doc: Document): string | null {
  const src = [...doc.head.querySelectorAll('script[type="module"][src]')]
    .map((script) => script.getAttribute('src') ?? '')
    .filter((src) => !src.startsWith('/@vite/'))
    .at(-1);
  return src ? new URL(src, location.href).href : null;
}

/** Whether `url` is a page, rather than a file (a zip, an image). */
function isPage(url: string): boolean {
  const { pathname } = new URL(url, location.href);
  return !/\.\w+$/.test(pathname) || pathname.endsWith('.html');
}

/** Whether `url` (a referrer, say) is on this site. */
function sameOrigin(url: string): boolean {
  try {
    return new URL(url).origin === location.origin;
  } catch {
    // Empty, or not a URL.
    return false;
  }
}
