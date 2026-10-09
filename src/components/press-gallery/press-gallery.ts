import { $$ } from '../../core/component.ts';
import type { Cleanup } from '../../core/disposer.ts';
import { animate, duration } from '../../core/motion.ts';
import { siteConfig } from '../../site/site.config.ts';

/** How large the photo can show: the whole width, on a phone. */
const PREVIEW_SIZES = '100vw';

/**
 * Island: a photo in press-gallery.tsx opens large in its preview, over the
 * page dimmed as a dialog's spotlight dims it, with a way back and its
 * download. Modified clicks (a new tab, say) still open the original.
 */
export function mount(el: HTMLElement): Cleanup | undefined {
  const dialog = el.querySelector<HTMLDialogElement>('.photo-preview');
  const photo = dialog?.querySelector('[data-photo]');
  const download = dialog?.querySelector('[data-download]');
  if (!dialog || !photo || !download) return;

  /** The photo's link in the gallery, to go back to. */
  let from: HTMLElement | null = null;
  let closing = false;

  const fade = (to: 'in' | 'out') => {
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];
    if (to === 'out') keyframes.reverse();
    const options = {
      duration: duration(siteConfig.animation.spotlightFadeMs),
      fill: 'forwards' as const,
    };
    return Promise.all([
      animate(dialog, keyframes, options),
      animate(dialog, keyframes, { ...options, pseudoElement: '::backdrop' }),
    ]);
  };

  const open = (link: HTMLAnchorElement) => {
    const figure = link.closest('figure');
    const picture = link.querySelector('picture');
    const tile = picture?.querySelector('img');
    if (!figure || !picture || !tile) return;
    // The same picture, at the size it shows now: the browser picks a
    // larger file from its sources. Until that loads, the tile's shows.
    const large = picture.cloneNode(true) as HTMLPictureElement;
    for (const source of large.querySelectorAll('source, img')) {
      source.setAttribute('sizes', PREVIEW_SIZES);
    }
    const img = large.querySelector('img');
    img?.removeAttribute('loading');
    if (img && tile.currentSrc) {
      img.style.backgroundImage = `url("${tile.currentSrc}")`;
    }
    photo.replaceChildren(large);
    const button = figure.querySelector('.press-gallery__download');
    download.replaceChildren(button?.cloneNode(true) ?? '');
    dialog.setAttribute('aria-label', tile.alt || 'Photo');

    from = link;
    closing = false;
    dialog.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    dialog.showModal();
    void fade('in');
  };

  const close = async () => {
    if (closing || !dialog.open) return;
    closing = true;
    await fade('out');
    // Opened again while it faded.
    if (!closing) return;
    dialog.close();
  };

  const onClick = (e: MouseEvent) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>(
      '.press-gallery__view'
    );
    if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) {
      return;
    }
    e.preventDefault();
    open(link);
  };

  // A click anywhere but the photo and its buttons goes back too.
  const onDialogClick = (e: MouseEvent) => {
    const target = e.target as Element;
    if (target.closest('[data-close]') || !target.closest('img, a, button')) {
      void close();
    }
  };

  // Escape fades out like the rest, rather than vanishing.
  const onCancel = (e: Event) => {
    e.preventDefault();
    void close();
  };

  const onClose = () => {
    closing = false;
    dialog.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    photo.replaceChildren();
    download.replaceChildren();
    from?.focus();
    from = null;
  };

  const links = $$<HTMLAnchorElement>('.press-gallery__view', el);
  links.forEach((link) => link.setAttribute('aria-haspopup', 'dialog'));
  el.addEventListener('click', onClick);
  dialog.addEventListener('click', onDialogClick);
  dialog.addEventListener('cancel', onCancel);
  dialog.addEventListener('close', onClose);
  return () => {
    el.removeEventListener('click', onClick);
    dialog.removeEventListener('click', onDialogClick);
    dialog.removeEventListener('cancel', onCancel);
    dialog.removeEventListener('close', onClose);
    from = null;
    if (dialog.open) dialog.close();
  };
}
