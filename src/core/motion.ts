import { currentLayout } from './layout.ts';
import { siteConfig } from '../site.config.ts';

const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');

export const prefersReducedMotion = () => reducedMotionQuery.matches;

/** Scales a configured duration for the current layout and motion settings. */
export function duration(ms: number): number {
  if (prefersReducedMotion()) return 0;
  return currentLayout() === 'compact'
    ? ms * siteConfig.animation.compactSpeedFactor
    : ms;
}

/**
 * Runs a Web Animation and resolves when it finishes (or is cancelled).
 * Zero-duration animations resolve immediately.
 */
export function animate(
  el: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions & { duration: number }
): Promise<void> {
  if (options.duration <= 0) return Promise.resolve();
  const animation = el.animate(keyframes, { easing: 'ease-out', ...options });
  return animation.finished.then(
    () => undefined,
    () => undefined
  );
}
