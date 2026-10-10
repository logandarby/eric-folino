import { cameFromSite } from '../../app/router.ts';
import type { Cleanup } from '../../core/disposer.ts';

/**
 * Makes the page's back-link.tsx go back to the last page, if it was one
 * of the site's; otherwise its link goes home.
 */
export function mountBackLink(): Cleanup {
  const link = document.querySelector<HTMLElement>('[data-back-link]');
  if (!link) return () => undefined;
  const onClick = (e: MouseEvent) => {
    if (!cameFromSite()) return;
    e.preventDefault();
    history.back();
  };
  link.addEventListener('click', onClick);
  return () => link.removeEventListener('click', onClick);
}
