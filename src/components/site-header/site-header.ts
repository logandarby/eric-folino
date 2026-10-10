import { Disposer, type Cleanup } from '../../core/disposer.ts';

/**
 * Makes the header's menu button (site-header.tsx) open and close the nav
 * on phones. It closes again on Escape, on a click outside it, and on
 * following a link. Returns a function that undoes it.
 */
export function bindSiteHeader(header: HTMLElement): Cleanup {
  const disposer = new Disposer();
  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  if (!toggle) return () => undefined;
  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    header.toggleAttribute('data-open', open);
  };
  const isOpen = () => header.hasAttribute('data-open');
  disposer.listen(toggle, 'click', () => setOpen(!isOpen()));
  disposer.listen(header, 'click', (e) => {
    if ((e.target as Element).closest('a[href]')) setOpen(false);
  });
  disposer.listen(document, 'click', (e) => {
    if (isOpen() && !header.contains(e.target as Node)) setOpen(false);
  });
  disposer.listen(document, 'keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  });
  return () => disposer.dispose();
}
