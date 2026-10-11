import { pageScript } from '../../app/router.ts';
import { mountBackLink } from '../../components/back-link/back-link.ts';
import { Disposer } from '../../core/disposer.ts';
import { currentLayout } from '../../core/layout.ts';
import { ditherGlsl } from '../../gl/dither.ts';
import { ShaderCanvas } from '../../gl/shader-canvas.ts';
import corridorShader from './corridor.frag?raw';
import { debugReadout } from './debug.ts';
import shadeGlsl from './shade.glsl?raw';
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

  // `?debug` shows how it goes, on the page.
  const log = debugReadout();
  log?.(`background: ${name}`);

  const body = root.querySelector('.mysteries__body');
  const canvas = document.createElement('canvas');
  canvas.className = 'mysteries__background';
  canvas.setAttribute('aria-hidden', 'true');
  let shader: ShaderCanvas | null = null;
  try {
    shader = ShaderCanvas.create(canvas, {
      fragment: ditherGlsl(background.palette) + shadeGlsl + shaders[name],
      maxFps: MAX_FPS,
      maxPixelRatio: 1 / background.pixelSize,
      // A still, mid-way, when motion is reduced.
      stillTime: 30,
      // Where the text block is now, in the canvas's pixels.
      beforeDraw: () => {
        if (!body || !shader) return;
        const box = body.getBoundingClientRect();
        const scale = canvas.width / (canvas.clientWidth || 1);
        const height = canvas.clientHeight;
        shader.set(
          'u_box',
          box.left * scale,
          (height - box.bottom) * scale,
          box.right * scale,
          (height - box.top) * scale
        );
        const shade = background.shade[currentLayout()];
        shader.set('u_shade', shade.opacity, shade.spread * scale);
      },
    });
  } catch (e) {
    // Without it, the page is still the page.
    log?.(`shader failed: ${(e as Error).message}`);
    console.error(e);
  }
  log?.(shader ? 'shader: running' : 'shader: none');
  if (shader) {
    const s = shader;
    s.set('u_speed', background.speed);
    root.prepend(canvas);
    // The text scrolls past the shade, which follows it (drawn anew, as
    // it isn't drawn every frame when motion's reduced).
    disposer.listen(window, 'scroll', () => s.render(), { passive: true });
    disposer.add(() => {
      s.dispose();
      canvas.remove();
    });
    if (log) {
      const timer = setTimeout(
        () => log(`canvas: ${canvas.width}×${canvas.height}`),
        1000
      );
      disposer.add(() => clearTimeout(timer));
    }
  }

  return () => disposer.dispose();
});
