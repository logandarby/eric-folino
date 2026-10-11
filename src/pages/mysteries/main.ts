import { pageScript } from '../../app/router.ts';
import { mountBackLink } from '../../components/back-link/back-link.ts';
import { Disposer } from '../../core/disposer.ts';
import { ditherGlsl } from '../../gl/dither.ts';
import { ShaderCanvas } from '../../gl/shader-canvas.ts';
import corridorShader from './corridor.frag?raw';
import page, { type MysteriesShader } from './page.config.ts';
import warpShader from './warp.frag?raw';

const shaders: Record<MysteriesShader, string> = {
  warp: warpShader,
  corridor: corridorShader,
};

/** Frames drawn a second: it moves slowly, so this is plenty. */
const MAX_FPS = 20;

pageScript(import.meta.url, () => {
  const disposer = new Disposer();
  disposer.add(mountBackLink());

  const root = document.querySelector<HTMLElement>('.mysteries');
  if (!root) return () => disposer.dispose();

  // `?bg=` picks one for this visit, to compare them.
  const asked = new URLSearchParams(location.search).get('bg');
  const { background } = page;
  const name =
    asked && asked in shaders ? (asked as MysteriesShader) : background.shader;

  const canvas = document.createElement('canvas');
  canvas.className = 'mysteries__background';
  canvas.setAttribute('aria-hidden', 'true');
  const shader = ShaderCanvas.create(canvas, {
    fragment: ditherGlsl(background.palette) + shaders[name],
    maxFps: MAX_FPS,
    maxPixelRatio: 1 / background.pixelSize,
    // A still, mid-way, when motion is reduced.
    stillTime: 30,
  });
  if (shader) {
    shader.set('u_speed', background.speed);
    root.prepend(canvas);
    disposer.add(() => {
      shader.dispose();
      canvas.remove();
    });
  }

  return () => disposer.dispose();
});
