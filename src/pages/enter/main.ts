import { bootstrap } from '../../app/bootstrap.ts';
import { bindHotspot } from '../../components/hotspot/hotspot.ts';
import page from './page.config.ts';
import { playTv } from './tv.ts';

const { dialogs } = bootstrap();

bindHotspot(dialogs, 'tv', page.tv.dialog);

// "enter?" does what clicking the TV does.
const hotspot = document.querySelector<HTMLElement>('[data-hotspot="tv"]');
document
  .querySelector('[data-tv-cta]')
  ?.addEventListener('click', () => hotspot?.click());

const tv = document.querySelector<HTMLElement>('[data-tv]');
if (tv) playTv(tv, page.tv);
