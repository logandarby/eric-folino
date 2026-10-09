import { pageScript } from '../../app/router.ts';
import { bindHotspot } from '../../components/hotspot/hotspot.ts';
import { Disposer } from '../../core/disposer.ts';
import page from './page.config.ts';
import { playTv } from './tv.ts';

pageScript(import.meta.url, ({ dialogs }) => {
  const disposer = new Disposer();
  disposer.add(bindHotspot(dialogs, 'tv', page.tv.dialog));

  // "enter?" does what clicking the TV does.
  const hotspot = document.querySelector<HTMLElement>('[data-hotspot="tv"]');
  const cta = document.querySelector<HTMLElement>('[data-tv-cta]');
  if (cta) disposer.listen(cta, 'click', () => hotspot?.click());

  const tv = document.querySelector<HTMLElement>('[data-tv]');
  if (tv) disposer.add(playTv(tv, page.tv));
  return () => disposer.dispose();
});
