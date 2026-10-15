import { $$ } from '../../core/component.ts';
import { Disposer, type Cleanup } from '../../core/disposer.ts';
import { prefersReducedMotion } from '../../core/motion.ts';
import type { DialogManager } from '../../dialog/manager.ts';
import type { BlobScene } from '../../site/blob-dialogs.ts';
import { blobDialog, type BlobConfig } from '../../site/blobs.ts';
import { siteConfig } from '../../site/site.config.ts';
import { RadialJitter } from '../../svg/jitter.ts';
import { Blob } from './blob.ts';

/**
 * Brings the page's blob.tsx buttons to life: they boil, and clicking one
 * opens what it says in `scene` (from src/site/blob-dialogs.ts, see
 * blobDialog), or closes it if it's already open.
 */
export function bindBlobs(
  dialogs: DialogManager,
  blobs: BlobConfig[],
  scene: BlobScene
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
    const name = blobs[blob.index].blob;
    const line = scene[name];
    if (!line) throw new Error(`The ${name} blob has nothing to say here`);
    const content = blobDialog(name, line);
    blob.events.on(
      'select',
      () => void dialogs.toggle({ anchor: blob, content })
    );
  }
  return () => disposer.dispose();
}
