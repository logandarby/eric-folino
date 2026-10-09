import type { Cleanup } from '../core/disposer.ts';
import { elementAnchor } from '../dialog/anchor.ts';
import type { DialogManager } from '../dialog/manager.ts';
import { siteConfig } from '../site/site.config.ts';

/**
 * Pressing the demo key (backtick by default) opens a dialog showing every
 * text effect, pointing at the title. Dev server only unless
 * `textDemo.inProduction` is on. Pressing it again closes the dialog.
 * Returns a function that takes the key away again.
 */
export function installTextDemo(
  dialogs: DialogManager,
  title: HTMLElement
): Cleanup {
  const { key, inProduction, dialog } = siteConfig.textDemo;
  if (!import.meta.env.DEV && !inProduction) return () => undefined;

  const anchor = elementAnchor(title);
  const onKey = (e: KeyboardEvent) => {
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
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement);
