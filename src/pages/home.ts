import { bootstrap } from '../app/bootstrap.ts';
import { Blob } from '../components/blob.ts';
import { $$ } from '../core/component.ts';
import { prefersReducedMotion } from '../core/motion.ts';
import { siteConfig } from '../site.config.ts';
import { RadialJitter } from '../svg/jitter.ts';

const { dialogs } = bootstrap();
const { animation } = siteConfig;
const jitter = new RadialJitter(animation.blobJitterAmount);

for (const el of $$<HTMLButtonElement>('[data-blob]')) {
  const blob = new Blob(el, {
    jitter,
    cornerRadius: animation.blobCornerRadius,
    minPointSpacing: animation.blobMinPointSpacing,
    intervalMs: animation.blobJitterIntervalMs,
    animate: !prefersReducedMotion(),
  });

  blob.events.on('select', () => {
    if (dialogs.isOpenFor(blob)) {
      void dialogs.close();
      return;
    }
    void dialogs.open({
      anchor: blob,
      content: siteConfig.blobs[blob.index].dialog,
    });
  });
}
