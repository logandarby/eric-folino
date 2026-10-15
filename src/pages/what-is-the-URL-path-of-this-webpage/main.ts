import { pageScript } from '../../app/router.ts';
import { Disposer } from '../../core/disposer.ts';
import { hydrateIslands } from '../../core/islands.ts';
import { hideTooltip, showTooltip } from '../../dialog/tooltip.ts';

/**
 * The quote an anchor in the essay belongs to: a caption's is just above
 * it, and a bare anchor (one that only marks a place) is just above its.
 */
function quoteFor(id: string): HTMLElement | null {
  const anchor = document.getElementById(id);
  const line = anchor?.closest('p');
  if (!anchor || !line) return null;
  const quote = anchor.textContent
    ? line.previousElementSibling
    : line.nextElementSibling;
  return quote instanceof HTMLQuoteElement ? quote : null;
}

/**
 * Follows a link within the essay as a new history entry, so the browser's
 * Back returns to where the reader was. Swup would only scroll there and
 * swap the entry's address. The browser does the jump (it scrolls, keeps
 * the place it left, and updates :target); the entry it makes is then
 * marked as swup's like the rest, keeping what the router keeps in it,
 * or swup would ignore going back to it from another page.
 */
function followInPage(e: MouseEvent, link: HTMLAnchorElement): void {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return;
  }
  // Swup leaves links whose click was already handled.
  e.preventDefault();
  const state: unknown = history.state;
  location.hash = link.hash;
  history.replaceState(
    { ...(state ?? {}), url: location.href, random: Math.random() },
    ''
  );
}

/**
 * Links within the essay are history entries of their own (followInPage),
 * and those to its quotes show the quote in a tooltip over the link, on
 * mouse hover and keyboard focus, gone once followed. The copy buttons
 * (page.tsx) are islands.
 */
pageScript(import.meta.url, () => {
  const disposer = new Disposer();
  const links = document.querySelectorAll<HTMLAnchorElement>(
    '.self-reference__sheet a[href^="#"]'
  );
  for (const link of links) {
    disposer.listen(link, 'click', (e) => followInPage(e, link));
    const quote = quoteFor(decodeURIComponent(link.hash.slice(1)));
    if (!quote) continue;
    const text = (quote.textContent ?? '').replace(/\s+/g, ' ').trim();
    const show = () => showTooltip(text, () => link.getBoundingClientRect());
    disposer.listen(link, 'pointerenter', (e) => {
      if (e.pointerType === 'mouse') show();
    });
    disposer.listen(link, 'focus', () => {
      if (link.matches(':focus-visible')) show();
    });
    disposer.listen(link, 'pointerleave', hideTooltip);
    disposer.listen(link, 'blur', hideTooltip);
    disposer.listen(link, 'click', hideTooltip);
  }
  disposer.add(hideTooltip);
  disposer.add(
    hydrateIslands({
      'copy-button': () =>
        import('../../components/copy-button/copy-button.ts'),
    })
  );
  return () => disposer.dispose();
});
