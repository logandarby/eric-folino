import { bootstrap } from '../../app/bootstrap.ts';
import { Blob } from '../../components/blob/blob.ts';
import { $$ } from '../../core/component.ts';
import { prefersReducedMotion } from '../../core/motion.ts';
import { elementAnchor, type DialogAnchor } from '../../dialog/anchor.ts';
import { siteConfig } from '../../site/site.config.ts';
import type { DialogContent } from '../../site/types.ts';
import { RadialJitter } from '../../svg/jitter.ts';
import page from './page.config.ts';

const { dialogs } = bootstrap();
const { animation } = siteConfig;
const jitter = new RadialJitter(animation.blobJitterAmount);

/** Clicking a thing opens its dialog, or closes it if it's already open. */
function toggleDialog(anchor: DialogAnchor, content: DialogContent) {
  if (dialogs.isOpenFor(anchor)) {
    void dialogs.close();
  } else {
    void dialogs.open({ anchor, content });
  }
}

for (const el of $$<HTMLButtonElement>('[data-blob]')) {
  const blob = new Blob(el, {
    jitter,
    cornerRadius: animation.blobCornerRadius,
    minPointSpacing: animation.blobMinPointSpacing,
    intervalMs: animation.blobJitterIntervalMs,
    animate: !prefersReducedMotion(),
  });

  blob.events.on('select', () =>
    toggleDialog(blob, page.blobs[blob.index].dialog)
  );
}

// The bus stop screen is part of the photo, so it gets a vignette instead of
// being lifted out of the dimmed page.
const screen = document.querySelector<HTMLButtonElement>('[data-screen]');
if (screen) {
  const anchor = elementAnchor(screen, 'vignette');
  screen.addEventListener('click', () =>
    toggleDialog(anchor, page.screen.dialog)
  );
}

// The "?" in the corner hints that there's more to click on.
const help = document.querySelector<HTMLButtonElement>('[data-help]');
if (help) {
  const anchor = elementAnchor(help);
  help.addEventListener('click', () => toggleDialog(anchor, page.help.dialog));
}
