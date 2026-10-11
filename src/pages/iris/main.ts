import { pageScript } from '../../app/router.ts';
import { mountBackLink } from '../../components/back-link/back-link.ts';
import { $$ } from '../../core/component.ts';
import { Disposer, type Cleanup } from '../../core/disposer.ts';
import { prefersReducedMotion } from '../../core/motion.ts';
import { ticker } from '../../core/ticker.ts';
import { elementAnchor, type DialogAnchor } from '../../dialog/anchor.ts';
import { EyeShader } from './eye.ts';
import irises from './eyes/eyes.json';
import page from './page.config.ts';

/** How quickly an iris catches up with the pointer, in ms (smaller is snappier). */
const EASE_MS = 90;
/** How quickly a pupil opens and closes, in ms (smaller is snappier). */
const DILATE_MS = 120;

interface Eye {
  el: HTMLElement;
  reach: { x: number; y: number };
  shader: EyeShader | null;
  /** Where the iris is looking now, as drawn. */
  look: { x: number; y: number };
  /** How open its pupil is now, as drawn: 0 as drawn, 1 wide. */
  dilate: number;
  /** What its dialog opens on: while that's open, it stares ahead, wide-eyed. */
  anchor: DialogAnchor;
}

pageScript(import.meta.url, ({ dialogs }) => {
  const disposer = new Disposer();
  let stopped = false;
  disposer.add(mountBackLink());

  // The backdrop's text: one of them, at random, then shown.
  const { texts } = page.backdrop;
  const text = texts[Math.floor(Math.random() * texts.length)];
  for (const el of $$('[data-iris-text]')) el.textContent = text;
  document
    .querySelector('[data-iris-backdrop]')
    ?.setAttribute('data-ready', '');

  const eyes: Eye[] = $$('[data-eye]').map((el) => {
    const config = page.eyes[Number(el.dataset.eye)];
    const anchor = elementAnchor(el);
    disposer.listen(
      el,
      'click',
      () => void dialogs.toggle({ anchor, content: config.dialog })
    );
    return {
      el,
      reach: config.reach,
      shader: null,
      look: { x: 0, y: 0 },
      dilate: 0,
      anchor,
    };
  });

  // The irises ease towards the pointer, but a clicked eye stares straight
  // ahead with its pupil open, while its dialog is. The loop runs only
  // while one is still on its way; scrolling moves the eyes under the
  // pointer, so it wakes the loop too.
  let pointer: { x: number; y: number } | null = null;
  let stopFollowing: Cleanup | null = null;
  /** The anchor of the eye whose dialog is open, if one is. */
  let staring: DialogAnchor | null = null;

  const startFollowing = () => {
    if (prefersReducedMotion()) {
      // No easing: straight there.
      follow(Infinity);
      return;
    }
    stopFollowing ??= ticker.subscribe(0, follow);
  };

  disposer.add(
    dialogs.events.on('open', ({ anchor }) => {
      staring = anchor;
      startFollowing();
    })
  );
  disposer.add(
    dialogs.events.on('close', () => {
      staring = null;
      startFollowing();
    })
  );

  disposer.listen(
    window,
    'pointermove',
    (e) => {
      pointer = { x: e.clientX, y: e.clientY };
      startFollowing();
    },
    { passive: true }
  );
  disposer.listen(window, 'scroll', startFollowing, { passive: true });

  for (const eye of eyes) {
    const { iris } = irises[Number(eye.el.dataset.eye)];
    void EyeShader.create(eye.el, page.dither, iris).then((shader) => {
      // The page went while its picture loaded.
      if (stopped) {
        shader?.dispose();
        return;
      }
      eye.shader = shader;
      startFollowing();
    });
  }

  function follow(dt: number): void {
    const ease = 1 - Math.exp(-dt / EASE_MS);
    const easeDilate = 1 - Math.exp(-dt / DILATE_MS);
    let moving = false;
    for (const eye of eyes) {
      if (!eye.shader) continue;
      const box = eye.el.getBoundingClientRect();
      // Off screen, it can catch up when it's back.
      if (box.bottom < 0 || box.top > innerHeight) continue;
      const stares = eye.anchor === staring;
      // With motion reduced, they don't follow the pointer.
      const to = prefersReducedMotion() ? null : pointer;
      const target = stares
        ? { x: 0, y: 0 }
        : to
          ? lookAt(box, to, eye.reach)
          : eye.look;
      const dx = target.x - eye.look.x;
      const dy = target.y - eye.look.y;
      const dd = (stares ? 1 : 0) - eye.dilate;
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dd) < 1e-4) continue;
      eye.look.x += dx * ease;
      eye.look.y += dy * ease;
      eye.dilate += dd * easeDilate;
      eye.shader.look(eye.look.x, eye.look.y, eye.dilate);
      moving = true;
    }
    if (!moving) {
      stopFollowing?.();
      stopFollowing = null;
    }
  }

  return () => {
    stopped = true;
    disposer.dispose();
    stopFollowing?.();
    for (const eye of eyes) eye.shader?.dispose();
  };
});

/**
 * Where an eye in `box` looks for a pointer at `to`: towards it, reaching
 * further the further away it is, up to `reach` at about an eye's width.
 */
function lookAt(
  box: DOMRect,
  to: { x: number; y: number },
  reach: { x: number; y: number }
): { x: number; y: number } {
  const dx = to.x - (box.left + box.width / 2);
  const dy = to.y - (box.top + box.height / 2);
  const distance = Math.hypot(dx, dy) || 1;
  const pull = Math.min(1, distance / box.width) / distance;
  return { x: dx * pull * reach.x, y: dy * pull * reach.y };
}
