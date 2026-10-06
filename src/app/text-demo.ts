import { elementAnchor } from '../dialog/anchor.ts';
import type { DialogManager } from '../dialog/manager.ts';
import { siteConfig } from '../site.config.ts';

/**
 * Pressing the demo key (backtick by default) opens a dialog showing every
 * text effect, pointing at the title. Dev server only unless
 * `textDemo.inProduction` is on. Pressing it again closes the dialog.
 */
export function installTextDemo(
  dialogs: DialogManager,
  title: HTMLElement
): void {
  const { key, inProduction, dialog } = siteConfig.textDemo;
  if (!import.meta.env.DEV && !inProduction) return;

  const anchor = elementAnchor(title);
  // Lives as long as the page, so it's never removed.
  document.addEventListener('keydown', (e) => {
    if (e.key !== key || e.repeat || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    if (isTyping(e.target)) return;
    if (dialogs.isOpenFor(anchor)) {
      void dialogs.close();
    } else if (!dialogs.isOpen) {
      e.preventDefault();
      void dialogs.open({ anchor, content: dialog });
    }
  });
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement);
