import { pageScript } from '../../app/router.ts';
import paper1Url from '../../assets/audio/paper/paper-1.mp3';
import paper2Url from '../../assets/audio/paper/paper-2.mp3';
import paper3Url from '../../assets/audio/paper/paper-3.mp3';
import paper4Url from '../../assets/audio/paper/paper-4.mp3';
import paper5Url from '../../assets/audio/paper/paper-5.mp3';
import paper6Url from '../../assets/audio/paper/paper-6.mp3';
import paper7Url from '../../assets/audio/paper/paper-7.mp3';
import paperClickUrl from '../../assets/audio/paper/paper-click.mp3';
import { bindBlobs } from '../../components/blob/blobs.ts';
import { Disposer } from '../../core/disposer.ts';
import { ditherImages } from '../../gl/dithered-images.ts';
import page from './page.config.ts';

/** A polaroid picked up: one of these, never the same twice running. */
const PAPER_URLS = [
  ...[paper1Url, paper2Url, paper3Url, paper4Url],
  ...[paper5Url, paper6Url, paper7Url],
];

pageScript(import.meta.url, ({ dialogs, sound }) => {
  const disposer = new Disposer();
  disposer.add(bindBlobs(dialogs, page.blobs));
  const root = document.querySelector<HTMLElement>('[data-secret]');
  if (!root) return () => disposer.dispose();
  disposer.add(ditherImages(root, page.dither));

  sound.preload([...PAPER_URLS, paperClickUrl]);
  const { paper: volume, fadeOut } = page.sounds;
  let last = -1;
  const rustle = () => {
    const choices = PAPER_URLS.length - (last < 0 ? 0 : 1);
    let i = Math.floor(Math.random() * choices);
    if (last >= 0 && i >= last) i++;
    last = i;
    sound.playSample(PAPER_URLS[i], volume, { fadeOut });
  };
  /** Taken off the fridge. */
  const click = () => sound.playSample(paperClickUrl, volume, { fadeOut });
  const polaroid = (target: EventTarget | null) =>
    target instanceof Element ? target.closest('.secret__polaroid') : null;

  // Picked up: hovered (touch has no hover), or reached with Tab.
  disposer.listen(root, 'pointerover', (e) => {
    const el = polaroid(e.target);
    if (el && e.pointerType !== 'touch' && el !== polaroid(e.relatedTarget)) {
      rustle();
    }
  });
  disposer.listen(root, 'focusin', (e) => {
    if (polaroid(e.target)?.matches(':focus-visible')) rustle();
  });
  // Taken off the fridge: pressed, or a key's click (no pointer).
  disposer.listen(root, 'pointerdown', (e) => {
    if (e.button === 0 && polaroid(e.target)) click();
  });
  disposer.listen(root, 'click', (e) => {
    if (e.detail === 0 && polaroid(e.target)) click();
  });

  return () => disposer.dispose();
});
