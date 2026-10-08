import { h } from '../../core/component.ts';
import { ditherGlsl } from '../../gl/dither.ts';
import { ShaderCanvas } from '../../gl/shader-canvas.ts';
import eyeShader from './eye.frag?raw';

export interface DitherOptions {
  /** "#rrggbb" colours. */
  palette: string[];
  /** The most resolution it's drawn at, as a share of the image's. */
  scale: number;
  /** How many CSS pixels across each dither pixel is, at least. */
  pixelSize: number;
}

/**
 * An eye drawn by eye.frag on a canvas over the eye's stacked layers,
 * which stay as the picture without WebGL. It's dithered at a low
 * resolution, which CSS scales up, and only draws when told where to look
 * (and when resized), so a still eye costs nothing.
 */
export class EyeShader {
  /** Null without WebGL, or if the eye's image didn't load. */
  static async create(
    el: HTMLElement,
    dither: DitherOptions
  ): Promise<EyeShader | null> {
    const image = el.querySelector('img');
    if (!image) return null;
    try {
      await image.decode();
    } catch {
      return null;
    }
    const canvas = h('canvas', { class: 'eye__canvas', 'aria-hidden': 'true' });
    // The image holds three layers, one above the other.
    const width = image.naturalWidth;
    const height = image.naturalHeight / 3;
    const shader = ShaderCanvas.create(canvas, {
      fragment: ditherGlsl(dither.palette) + eyeShader,
      animate: false,
      textures: { u_eye: image },
      maxSize: [width * dither.scale, height * dither.scale],
      maxPixelRatio: 1 / dither.pixelSize,
    });
    if (!shader) return null;
    shader.set('u_edge', 0.5 / height);
    el.append(canvas);
    el.dataset.gl = '';
    return new EyeShader(shader);
  }

  private constructor(private readonly shader: ShaderCanvas) {}

  /** Moves the iris by a share of the eye's width and height. */
  look(x: number, y: number): void {
    this.shader.set('u_look', x, y);
    this.shader.render();
  }
}
