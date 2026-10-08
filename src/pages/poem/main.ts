import { bootstrap } from '../../app/bootstrap.ts';
import { $$ } from '../../core/component.ts';
import { elementAnchor } from '../../dialog/anchor.ts';
import type { DialogContent } from '../../site/types.ts';
import { markRead } from '../poems/read.ts';

/** The dialog's button that follows the link. */
const FOLLOW_LABEL = 'read';

const { dialogs } = bootstrap();

// Unlocks it on the graph page.
const slug = document.querySelector<HTMLElement>('[data-poem]')?.dataset.poem;
if (slug) markRead(slug);

/**
 * A link opens a dialog first: the poem it goes to, the line it lands on,
 * and a button to go there. Without scripts it's a plain link. Modified
 * clicks (a new tab, say) still go straight there.
 */
for (const link of $$<HTMLAnchorElement>('[data-poem-link]')) {
  const anchor = elementAnchor(link);
  const { to = '', line } = link.dataset;
  const content: DialogContent = {
    title: `→ ${literal(to)}`,
    instant: true,
    // A link to the title has no line to show but the title itself.
    body: line ? [{ kind: 'narration', text: `“${literal(line)}”` }] : [],
    actions: [{ label: FOLLOW_LABEL, href: link.href }],
  };
  link.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    void dialogs.toggle({ anchor, content });
  });
}

/** Poem text in a dialog, with any `{` kept as written (not a text effect). */
function literal(text: string): string {
  return text.replaceAll('{', '{{');
}
