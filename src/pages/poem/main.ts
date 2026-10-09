import { pageScript } from '../../app/router.ts';
import { $$ } from '../../core/component.ts';
import type { Cleanup } from '../../core/disposer.ts';
import { elementAnchor } from '../../dialog/anchor.ts';
import { tooltip } from '../../dialog/tooltip.ts';
import type { DialogContent } from '../../site/types.ts';
import { favourites, setFavourite } from '../poems/favourites.ts';
import { markRead } from '../poems/read.ts';

/** The dialog's button that follows the link. */
const FOLLOW_LABEL = 'read';

pageScript(import.meta.url, ({ dialogs }) => {
  let untooltip: Cleanup | undefined;

  // Unlocks it on the web.
  const slug = document.querySelector<HTMLElement>('[data-poem]')?.dataset.poem;
  if (slug) markRead(slug);

  // The star by the title keeps the poem in favourites (see favourites.ts).
  const star = document.querySelector<HTMLButtonElement>('[data-favourite]');
  if (slug && star) {
    const show = (on: boolean) => {
      star.setAttribute('aria-pressed', String(on));
    };
    show(favourites().includes(slug));
    star.hidden = false;
    untooltip = tooltip(star, () =>
      star.getAttribute('aria-pressed') === 'true' ? 'Favourited' : 'Favourite'
    );
    star.addEventListener('click', () => {
      const on = star.getAttribute('aria-pressed') !== 'true';
      setFavourite(slug, on);
      show(on);
    });
  }

  // A link opens a dialog first: the poem it goes to, the line it lands
  // on, and a button to go there. Without scripts it's a plain link.
  // Modified clicks (a new tab, say) still go straight there.
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

  return () => untooltip?.();
});

/** Poem text in a dialog, with any `{` kept as written (not a text effect). */
function literal(text: string): string {
  return text.replaceAll('{', '{{');
}
