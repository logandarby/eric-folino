import type { Cleanup } from '../../core/disposer.ts';
import { polygonCentroid } from '../../core/geometry.ts';
import { prefersReducedMotion } from '../../core/motion.ts';
import { ticker } from '../../core/ticker.ts';
import { siteConfig } from '../../site/site.config.ts';
import { blobShape, roundedPathData } from '../../svg/blob-shape.ts';
import { RadialJitter } from '../../svg/jitter.ts';
import { TAIL_CORNER_RADIUS } from './tails.ts';

/**
 * Makes every speech bubble called `name` (speech-bubble.tsx) boil like
 * the home page's blobs: every so often its body and tail snap to a fresh
 * jitter of their shapes. Not with reduced motion. Returns a function that
 * stops it.
 */
export function bindSpeechBubble(name: string): Cleanup {
  if (prefersReducedMotion()) return () => undefined;
  const { animation } = siteConfig;
  const jitter = new RadialJitter(animation.blobJitterAmount);
  const bubbles = [
    ...document.querySelectorAll(`[data-speech-bubble="${name}"]`),
  ].flatMap((el) => {
    const body = el.querySelector<SVGPathElement>('[data-shape]');
    const tail = el.querySelector<SVGPathElement>('[data-tail]');
    if (!body || !tail) return [];
    const shape = blobShape(
      body.dataset.shape ?? '',
      animation.blobMinPointSpacing
    );
    const points = (tail.dataset.tail ?? '').split(' ').map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    });
    return [{ el, shape, tail: { points, center: polygonCentroid(points) } }];
  });
  if (!bubbles.length) return () => undefined;
  return ticker.subscribe(animation.blobJitterIntervalMs, () => {
    for (const { el, shape, tail } of bubbles) {
      // The outline and fill layers get the same jitter.
      const d = roundedPathData(
        jitter.apply(shape.polygon, shape.center),
        animation.blobCornerRadius
      );
      const tailD = roundedPathData(
        jitter.apply(tail.points, tail.center),
        TAIL_CORNER_RADIUS
      );
      for (const path of el.querySelectorAll('[data-shape]')) {
        path.setAttribute('d', d);
      }
      for (const path of el.querySelectorAll('[data-tail]')) {
        path.setAttribute('d', tailD);
      }
    }
  });
}
