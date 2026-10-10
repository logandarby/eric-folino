import { pageScript } from '../../app/router.ts';
import { bindBlobs } from '../../components/blob/blobs.ts';
import { mountBackLink } from '../../components/back-link/back-link.ts';
import { Disposer } from '../../core/disposer.ts';
import { ditherGlsl } from '../../gl/dither.ts';
import { ShaderCanvas } from '../../gl/shader-canvas.ts';
import page from './page.config.ts';
import sceneShader from './scene.frag?raw';

/** Frames drawn a second: the video's own rate is about this. */
const MAX_FPS = 30;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

pageScript(import.meta.url, ({ dialogs }) => {
  const disposer = new Disposer();
  let shader: ShaderCanvas | null = null;
  let stopped = false;

  disposer.add(mountBackLink());
  disposer.add(bindBlobs(dialogs, page.blobs));

  const scene = document.querySelector<HTMLElement>('[data-window-scene]');
  const video = document.querySelector<HTMLVideoElement>('[data-window-video]');
  const desk = document.querySelector<HTMLImageElement>('[data-window-desk]');
  if (!scene || !video || !desk) return () => disposer.dispose();

  // It loops, silently, unless motion is reduced: then it's a still.
  const motion = () => {
    if (reducedMotion.matches) video.pause();
    else void video.play().catch(() => undefined);
  };
  motion();
  reducedMotion.addEventListener('change', motion);
  disposer.add(() => reducedMotion.removeEventListener('change', motion));
  // A still (or the first frame) is drawn once there's a frame to show.
  disposer.listen(video, 'loadeddata', () => {
    shader?.set('u_video_aspect', videoAspect(video));
    shader?.render();
  });
  disposer.add(() => video.pause());

  /** The dithered picture over the plain one, or null without WebGL. */
  const start = async (): Promise<ShaderCanvas | null> => {
    try {
      await desk.decode();
    } catch {
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.className = 'window__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const s = ShaderCanvas.create(canvas, {
      fragment: ditherGlsl(page.dither.palette) + sceneShader,
      textures: { u_desk: desk, u_video: video },
      maxFps: MAX_FPS,
      transparent: true,
      maxPixelRatio: 1 / page.dither.pixelSize,
    });
    if (!s) return null;
    const w = page.desk.window;
    s.set('u_window', w.x, w.y, w.width, w.height);
    s.set(
      'u_window_aspect',
      ((w.width / w.height) * page.desk.width) / page.desk.height
    );
    s.set('u_video_aspect', videoAspect(video));
    // Over the picture, under the blobs.
    desk.after(canvas);
    return s;
  };

  void start().then((s) => {
    if (stopped) s?.dispose();
    else shader = s;
  });

  return () => {
    stopped = true;
    disposer.dispose();
    shader?.dispose();
  };
});

/** A video's width over its height, guessing 16:9 until it knows. */
function videoAspect(video: HTMLVideoElement): number {
  return video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
}
