import { $$ } from '../core/component.ts';
import { elementAnchor } from '../dialog/anchor.ts';
import type { DialogContent } from '../site/types.ts';
import { pageScript } from './router.ts';

/*
 * Entry for placeholder pages (the 404, and drafts outside the dev server):
 * a non-modal dialog pointing at the page's own nav item, or the first nav
 * item for pages outside the nav. The build writes the dialog into the
 * page as JSON (see build/render-page.tsx), so this bundle carries no
 * page's content. The router closes the dialog when the page goes.
 */

pageScript(import.meta.url, ({ dialogs }) => {
  const data = document.querySelector('[data-placeholder]');
  const content = JSON.parse(
    data?.textContent ?? 'null'
  ) as DialogContent | null;
  const pageId = document.documentElement.dataset.page;
  const navLinks = $$<HTMLAnchorElement>('[data-nav]');
  const anchorEl =
    navLinks.find((a) => a.dataset.nav === pageId) ?? navLinks[0];

  if (content && anchorEl) {
    void dialogs.open({
      anchor: elementAnchor(anchorEl),
      content,
      modal: false,
      closable: false,
    });
  }
});
