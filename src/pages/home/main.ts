import { pageScript } from '../../app/router.ts';
import { Blob } from '../../components/blob/blob.ts';
import { bindListen } from '../../components/listen/listen.ts';
import { $$ } from '../../core/component.ts';
import { Disposer } from '../../core/disposer.ts';
import { prefersReducedMotion } from '../../core/motion.ts';
import { siteConfig } from '../../site/site.config.ts';
import { RadialJitter } from '../../svg/jitter.ts';
import songUrl from '../../assets/audio/standby.mp3';
import page from './page.config.ts';

pageScript(import.meta.url, ({ dialogs, sound }) => {
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

    // Clicking a blob opens its dialog, or closes it if it's already open.
    blob.events.on(
      'select',
      () =>
        void dialogs.toggle({
          anchor: blob,
          content: page.blobs[blob.index].dialog,
        })
    );
  }

  const listen = document.querySelector<HTMLElement>('[data-listen]');
  if (listen) {
    disposer.add(bindListen(listen, sound, page.listen, songUrl));
  }
  return () => disposer.dispose();
});
