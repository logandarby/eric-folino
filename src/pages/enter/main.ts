import { pageScript } from '../../app/router.ts';
import { playCollage } from '../../components/collage-video/collage-video.ts';
import { bindHotspot } from '../../components/hotspot/hotspot.ts';
import { Disposer } from '../../core/disposer.ts';
import page from './page.config.ts';

pageScript(import.meta.url, ({ dialogs }) => {
  const disposer = new Disposer();
  disposer.add(bindHotspot(dialogs, 'tv', page.tv.dialog));

  // "enter?" does what clicking the TV does.
  const hotspot = document.querySelector<HTMLElement>('[data-hotspot="tv"]');
  const cta = document.querySelector<HTMLElement>('[data-tv-cta]');
  if (cta) disposer.listen(cta, 'click', () => hotspot?.click());

  // The screen plays behind the photo's hole.
  const screen = document.querySelector<HTMLElement>('[data-tv-screen]');
  if (screen) {
    const player = playCollage(screen, page.tv);
    disposer.add(() => player.dispose());
  }
  return () => disposer.dispose();
});
