import type { Cleanup } from '../../../../core/disposer.ts';
import { ShaderCanvas } from '../../../../gl/shader-canvas.ts';
import fragment from './static-bloom.frag?raw';

/**
 * Slow, warped clouds in the title's colours, leaning towards the pointer,
 * with a film of grain. Calm on purpose: nothing flashes.
 */
export function mount(el: HTMLElement): Cleanup | undefined {
  const canvas = document.createElement('canvas');
  canvas.className = 'piece-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const shader = ShaderCanvas.create(canvas, {
    fragment,
    maxFps: 30,
    stillTime: 40,
  });
  // Without WebGL the element's fallback content stays.
  if (!shader) return;
  el.prepend(canvas);
  el.dataset.gl = 'on';
  return () => {
    shader.dispose();
    canvas.remove();
    delete el.dataset.gl;
  };
}
