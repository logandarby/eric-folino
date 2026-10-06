import { bootstrap } from '../app/bootstrap.ts';
import { Blob } from '../components/blob.ts';
import { $$ } from '../core/component.ts';
import { prefersReducedMotion } from '../core/motion.ts';
import { elementAnchor, type DialogAnchor } from '../dialog/anchor.ts';
import { siteConfig, type DialogContent } from '../site.config.ts';
import { RadialJitter } from '../svg/jitter.ts';

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
    toggleDialog(blob, siteConfig.blobs[blob.index].dialog)
  );
}

// The bus stop screen is part of the photo, so it gets a vignette instead of
// being lifted out of the dimmed page.
const screen = document.querySelector<HTMLButtonElement>('[data-screen]');
if (screen) {
  const anchor = elementAnchor(screen, 'vignette');
  screen.addEventListener('click', () =>
    toggleDialog(anchor, siteConfig.screen.dialog)
  );
}
