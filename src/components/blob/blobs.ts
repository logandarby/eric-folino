import { $$ } from '../../core/component.ts';
import { Disposer, type Cleanup } from '../../core/disposer.ts';
import { prefersReducedMotion } from '../../core/motion.ts';
import type { DialogManager } from '../../dialog/manager.ts';
import { blobDialog, type BlobConfig } from '../../site/blobs.ts';
import { siteConfig } from '../../site/site.config.ts';
import { RadialJitter } from '../../svg/jitter.ts';
import { Blob } from './blob.ts';

/**
 * Brings the page's blob.tsx buttons to life: they boil, and clicking one
 * opens its dialog from `blobs` (see blobDialog), or closes it if it's already open.
 */
export function bindBlobs(
  dialogs: DialogManager,
  blobs: BlobConfig[]
): Cleanup {
  const disposer = new Disposer();
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
    disposer.add(() => blob.destroy());
    blob.events.on(
      'select',
      () =>
        void dialogs.toggle({
          anchor: blob,
          content: blobDialog(blobs[blob.index]),
        })
    );
  }
  return () => disposer.dispose();
}
