import type { DialogManager } from '../../dialog/manager.ts';
import { elementAnchor } from '../../dialog/anchor.ts';
import type { DialogContent } from '../../site/types.ts';

/**
 * Makes the hotspot called `name` (hotspot.tsx) open `content`, or close
 * it again. A hotspot is part of a picture rather than a thing of its own,
 * so its dialog dims the page around it with a soft vignette instead of
 * lifting it out.
 */
export function bindHotspot(
  dialogs: DialogManager,
  name: string,
  content: DialogContent
): void {
  const el = document.querySelector<HTMLElement>(`[data-hotspot="${name}"]`);
  if (!el) return;
  const anchor = elementAnchor(el, 'vignette');
  el.addEventListener('click', () => void dialogs.toggle({ anchor, content }));
}
