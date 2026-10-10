import { Disposer, type Cleanup } from '../core/disposer.ts';
import { ditherGlsl } from './dither.ts';
import { ShaderCanvas } from './shader-canvas.ts';

/*
 * Dithers a page's pictures where they are: every `img[data-dither]` in
 * `root` is drawn, in the page's order, where it shows (moved, turned and
 * scaled as CSS has them, `object-fit: cover` too, with its `opacity`
 * and its `filter`, a dimming `brightness()` say, where the browser can
 * draw one), on one canvas over the whole window, behind everything else
 * in `root` (at z-index -1, so only the body's background is under it:
 * `root` and what it's in mustn't paint one of their own), and that's
 * dithered to the palette. The pictures themselves stay in the
 * page, unseen, so they're still laid out by CSS and read by screen
 * readers; text and anything else in `root` shows over the canvas, never
 * dithered.
 *
 * The dither's pattern is the screen's, not each picture's, so the
 * pictures' pixels line up. The canvas redraws when the pictures move:
 * the window resizing or scrolling, a picture loading, and while anything
 * in `root` is mid-transition or animating (hovering, say, or a picture
 * panning).
 *
 * Without WebGL, the pictures just show.
 */

const SHADER = `
uniform vec2 u_resolution;
uniform sampler2D u_scene;

void main() {
  vec2 p = gl_FragCoord.xy / u_resolution;
  vec4 color = texture2D(u_scene, vec2(p.x, 1.0 - p.y));
  // Hard edges: soft ones would dither into speckles.
  gl_FragColor = color.a > 0.5
    ? vec4(dither(color.rgb, gl_FragCoord.xy), 1.0)
    : vec4(0.0);
}
`;

export function ditherImages(
  root: HTMLElement,
  {
    palette,
    pixelSize,
    maxFps = 30,
  }: {
    /** "#rrggbb" colours (palettes in dither.ts). */
    palette: string[];
    /** How many CSS pixels across each dither pixel is. */
    pixelSize: number;
    /** How often it redraws while things move. Default 30. */
    maxFps?: number;
  }
): Cleanup {
  const disposer = new Disposer();
  const images = [
    ...root.querySelectorAll<HTMLImageElement>('img[data-dither]'),
  ];
  const scene = document.createElement('canvas');
  const context = scene.getContext('2d');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `position: fixed; inset: 0; width: 100%;
    height: 100%; z-index: -1; pointer-events: none;
    image-rendering: pixelated;`;
  if (!context) return () => undefined;

  let shader: ShaderCanvas | null = null;
  const draw = () => {
    if (!shader) return;
    scene.width = canvas.width;
    scene.height = canvas.height;
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    for (const img of images) drawImage(context, img, scale);
    shader.setTexture('u_scene', scene);
  };
  shader = ShaderCanvas.create(canvas, {
    fragment: ditherGlsl(palette) + SHADER,
    textures: { u_scene: scene },
    animate: false,
    transparent: true,
    maxPixelRatio: 1 / pixelSize,
    beforeDraw: draw,
  });
  if (!shader) return () => undefined;

  // Under everything else (z-index -1), over the page's background. Not in
  // a stacking context of its own, so a blob can still be lifted over the
  // spotlight (spotlight.ts).
  root.prepend(canvas);
  // Clipped away rather than see-through, so their own opacity still
  // counts.
  for (const img of images) img.style.clipPath = 'inset(50%)';
  disposer.add(() => {
    shader?.dispose();
    shader = null;
    canvas.remove();
    for (const img of images) img.style.clipPath = '';
  });

  // Once a frame at most, and while anything's moving, `maxFps` times a
  // second.
  let frame = 0;
  let drawn = 0;
  const redraw = () => {
    if (frame) return;
    frame = requestAnimationFrame((now) => {
      frame = 0;
      const moving = root.getAnimations({ subtree: true }).length > 0;
      if (!moving || now - drawn >= 1000 / maxFps - 2) {
        drawn = now;
        shader?.render();
      }
      if (moving) redraw();
    });
  };
  disposer.add(() => cancelAnimationFrame(frame));
  for (const img of images) disposer.listen(img, 'load', redraw);
  disposer.listen(window, 'scroll', redraw, { passive: true });
  for (const type of [
    'pointerover',
    'pointerout',
    'focusin',
    'focusout',
    'transitionrun',
    'animationstart',
  ] as const) {
    disposer.listen(root, type, redraw);
  }
  const resize = new ResizeObserver(redraw);
  resize.observe(root);
  disposer.add(() => resize.disconnect());
  redraw();

  return () => disposer.dispose();
}

/**
 * `img` where it shows on the screen, onto `context`, `scale` canvas
 * pixels to a CSS pixel.
 */
function drawImage(
  context: CanvasRenderingContext2D,
  img: HTMLImageElement,
  scale: number
): void {
  if (!img.complete || !img.naturalWidth) return;
  const box = img.getBoundingClientRect();
  if (!box.width || !box.height) return;
  // Its own size, before transforms, turned and scaled by theirs about
  // its middle (which they leave where it shows).
  const width = img.offsetWidth;
  const height = img.offsetHeight;
  const [a, b, c, d] = turn(img);
  context.setTransform(
    scale * a,
    scale * b,
    scale * c,
    scale * d,
    scale * (box.left + box.width / 2),
    scale * (box.top + box.height / 2)
  );
  context.imageSmoothingQuality = 'high';
  const style = getComputedStyle(img);
  context.filter = style.filter;
  context.globalAlpha = Number(style.opacity);
  const [sx, sy, sw, sh] = source(img, width, height);
  context.drawImage(
    img,
    sx,
    sy,
    sw,
    sh,
    -width / 2,
    -height / 2,
    width,
    height
  );
}

/**
 * How `el` and the elements it's in are turned and scaled, all told: a 2D
 * matrix's a, b, c and d. From each one's `transform`, and its `rotate`
 * and `scale` (in degrees; CSS applies them before `transform`).
 */
function turn(el: Element): [number, number, number, number] {
  let m = new DOMMatrix();
  for (let at: Element | null = el; at; at = at.parentElement) {
    const style = getComputedStyle(at);
    const own = new DOMMatrix();
    const angle = parseFloat(style.rotate);
    if (angle) own.rotateSelf(angle);
    if (style.scale !== 'none') {
      const [x, y = x] = style.scale.split(' ').map(Number);
      own.scaleSelf(x, y);
    }
    if (style.transform !== 'none')
      own.multiplySelf(new DOMMatrix(style.transform));
    m = own.multiply(m);
  }
  return [m.a, m.b, m.c, m.d];
}

/** The part of `img` that shows in its box: all of it, or as `cover` crops it. */
function source(
  img: HTMLImageElement,
  width: number,
  height: number
): [number, number, number, number] {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (getComputedStyle(img).objectFit !== 'cover') return [0, 0, w, h];
  const scale = Math.max(width / w, height / h);
  const sw = width / scale;
  const sh = height / scale;
  return [(w - sw) / 2, (h - sh) / 2, sw, sh];
}
