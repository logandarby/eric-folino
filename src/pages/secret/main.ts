import { bootstrap } from '../../app/bootstrap.ts';
import { $ } from '../../core/component.ts';
import { prefersReducedMotion } from '../../core/motion.ts';
import { elementAnchor } from '../../dialog/anchor.ts';
import page from './page.config.ts';

const { dialogs } = bootstrap();

const eye = $<HTMLButtonElement>('[data-eye]');
const iris = $<SVGGElement>('[data-eye-iris]', eye);
const anchor = elementAnchor(eye);

eye.addEventListener('click', () => {
  if (dialogs.isOpenFor(anchor)) void dialogs.close();
  else void dialogs.open({ anchor, content: page.eye.dialog });
});

/** How far the iris can look, in SVG units (the eye is 200 × 150). */
const REACH = { x: 42, y: 16 };

// The iris follows the pointer around the page.
let frame = 0;
window.addEventListener('pointermove', (e) => {
  if (prefersReducedMotion() || frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const box = eye.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    // Ease towards the edge of its reach as the pointer gets further away.
    const distance = Math.hypot(dx, dy) || 1;
    const pull = Math.min(1, distance / (box.width * 1.5));
    const x = (dx / distance) * pull * REACH.x;
    const y = (dy / distance) * pull * REACH.y;
    // CSS px on an SVG element are its own units.
    iris.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
  });
});
