import { h } from '../../core/component.ts';
import { ShaderCanvas } from '../../gl/shader-canvas.ts';
import type { TvConfig } from './page.config.ts';
import fragment from './tv.frag?raw';

/** Seconds between the static's changes in brightness. */
const DRIFT_S = 1.6;

/**
 * Plays the TV's screen: a shader on a canvas behind the photo's hole
 * (tv.frag). Without WebGL the screen stays dark.
 *
 * Only the static plays for now. A video would be one more texture in
 * the shader.
 */
export function playTv(tv: HTMLElement, config: TvConfig): void {
  const screen = tv.querySelector<HTMLElement>('[data-tv-screen]');
  if (!screen) return;

  const { crt } = config;
  const canvas = h('canvas', { 'aria-hidden': 'true' });
  const shader = ShaderCanvas.create(canvas, {
    fragment,
    maxFps: 30,
    stillTime: 4.2,
    beforeDraw: (time) => {
      shader?.set('u_level', brightness(time, config.signal));
    },
  });
  if (!shader) return;
  shader.set('u_tint', ...rgb(config.tint));
  shader.set('u_curvature', crt.curvature);
  shader.set('u_scanlines', crt.scanlines);
  shader.set('u_scanline_depth', crt.scanlineDepth);
  shader.set('u_aberration', crt.aberration);
  shader.set('u_vignette', crt.vignette);
  shader.set('u_flicker', crt.flicker);
  screen.append(canvas);
  tv.dataset.gl = '';
}

/**
 * How bright the static is at `time` (seconds): wandering smoothly between
 * `min` and `max`, slowly enough that it never flashes.
 */
function brightness(time: number, { min, max }: TvConfig['signal']): number {
  const t = time / DRIFT_S;
  const i = Math.floor(t);
  const f = t - i;
  const ease = f * f * (3 - 2 * f);
  const a = random(i);
  const b = random(i + 1);
  return min + (max - min) * (a + (b - a) * ease);
}

/** A repeatable random number, 0–1, for an integer. */
function random(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** "#d4b4ff" → [0.83, 0.71, 1]. */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
