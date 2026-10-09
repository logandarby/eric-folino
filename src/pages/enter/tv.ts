import { h } from '../../core/component.ts';
import type { Cleanup } from '../../core/disposer.ts';
import { ShaderCanvas } from '../../gl/shader-canvas.ts';
import collage from './collage.json';
import collageUrl from './collage.webp';
import type { TvConfig } from './page.config.ts';
import fragment from './tv.frag?raw';

/** Seconds between the picture's changes in brightness. */
const DRIFT_S = 1.6;

/**
 * Plays the TV's screen: a shader on a canvas behind the photo's hole
 * (tv.frag), cutting between photos of the band with static fading in
 * and out over them. Without WebGL, or if the photos won't load, the
 * screen stays dark. Returns a function that turns it off.
 */
export function playTv(tv: HTMLElement, config: TvConfig): Cleanup {
  const screen = tv.querySelector<HTMLElement>('[data-tv-screen]');
  if (!screen) return () => undefined;
  let stopped = false;
  let shader: ShaderCanvas | null = null;
  const photos = new Image();
  photos.src = collageUrl;
  photos.decode().then(
    () => {
      if (!stopped) shader = start(screen, photos, config);
    },
    () => undefined
  );
  return () => {
    stopped = true;
    shader?.dispose();
  };
}

function start(
  screen: HTMLElement,
  photos: HTMLImageElement,
  config: TvConfig
): ShaderCanvas | null {
  const { crt } = config;
  const canvas = h('canvas', { 'aria-hidden': 'true' });
  const shader = ShaderCanvas.create(canvas, {
    fragment,
    textures: { u_collage: photos },
    maxFps: 30,
    stillTime: 4.2,
    beforeDraw: (time) => {
      shader?.set('u_level', drift(time, DRIFT_S, config.signal));
      shader?.set('u_noise', staticAmount(time, config.static));
      // In order, round and round (the order is shuffled when it's made).
      shader?.set(
        'u_frame',
        Math.floor(time / config.photoSeconds) % collage.count
      );
    },
  });
  if (!shader) return null;
  shader.set('u_frames', collage.columns, collage.rows);
  shader.set('u_tint', ...rgb(config.tint));
  shader.set('u_curvature', crt.curvature);
  shader.set('u_scanlines', crt.scanlines);
  shader.set('u_scanline_depth', crt.scanlineDepth);
  shader.set('u_aberration', crt.aberration);
  shader.set('u_vignette', crt.vignette);
  shader.set('u_flicker', crt.flicker);
  screen.append(canvas);
  screen.closest<HTMLElement>('[data-tv]')?.setAttribute('data-gl', '');
  return shader;
}

/**
 * A value at `time` (seconds) wandering smoothly between `min` and `max`,
 * to a new random one every `seconds`, slowly enough that it never flashes.
 * `shape` bends the randomness: above 1, it mostly stays near `min`.
 */
function drift(
  time: number,
  seconds: number,
  { min, max }: { min: number; max: number },
  shape = 1,
  seed = 0
): number {
  const t = time / seconds;
  const i = Math.floor(t);
  const f = t - i;
  const ease = f * f * (3 - 2 * f);
  const a = random(i + seed) ** shape;
  const b = random(i + 1 + seed) ** shape;
  return min + (max - min) * (a + (b - a) * ease);
}

/**
 * How much static covers the photo at `time`: mostly a little, now and
 * then fading up to hide it and back.
 */
function staticAmount(time: number, config: TvConfig['static']): number {
  return drift(time, config.seconds, config, config.shape, 1000);
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
