import { bootstrap } from '../app/bootstrap.ts';
import { $$ } from '../core/component.ts';
import { elementAnchor } from '../dialog/anchor.ts';

/*
 * Mock pages: a non-modal dialog pointing at the page's own nav item
 * (or the first nav item for pages outside the nav, like the 404).
 */

const { page, dialogs } = bootstrap();
const navLinks = $$<HTMLAnchorElement>('[data-nav]');
const anchorEl = navLinks.find((a) => a.dataset.nav === page.id) ?? navLinks[0];

if (page.placeholder && anchorEl) {
  void dialogs.open({
    anchor: elementAnchor(anchorEl),
    content: page.placeholder,
    modal: false,
    closable: false,
  });
}
