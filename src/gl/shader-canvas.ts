import type { Cleanup } from '../core/disposer.ts';
import { Disposer } from '../core/disposer.ts';
import { ticker } from '../core/ticker.ts';
import { FlashGuard } from './flash-guard.ts';

export interface ShaderOptions {
  /**
   * GLSL ES 1.0 fragment shader. It gets these uniforms:
   *   float u_time        seconds; frozen under reduced motion
   *   vec2  u_resolution  canvas size in device pixels
   *   vec2  u_pointer     pointer position, 0–1 from the bottom left
   * plus a `sampler2D` for each of `textures`, and any set with `set()`.
   */
  fragment: string;
  /**
   * Images the shader reads, by uniform name. They're sampled with (0, 0)
   * at the image's top left, clamped at the edges, and can be any size.
   */
  textures?: Record<string, TexImageSource>;
  /**
   * Draw every frame (the default), or only when asked: on `render()` and
   * when the canvas resizes. Pictures that change only in response to
   * something, like the pointer, cost nothing while still.
   */
  animate?: boolean;
  /**
   * See-through where the shader's alpha is below 1 (default false). Its
   * colours are then premultiplied: rgb at most alpha.
   */
  transparent?: boolean;
  /** Frame rate cap; lower is kinder to batteries. Default 60. */
  maxFps?: number;
  /** Device pixel ratio cap; shaders are costly per pixel. Default 1.5. */
  maxPixelRatio?: number;
  /**
   * The most pixels to draw, [width, height], when the canvas's box is
   * bigger. For chunky pixels: stretch the canvas with CSS
   * (`image-rendering: pixelated`). Smaller boxes draw at their own size,
   * as squeezing pixels down would garble them.
   */
  maxSize?: [number, number];
  /** Time shown when motion is reduced, in seconds. Default 0. */
  stillTime?: number;
  /**
   * Called before every draw with the shader's time (seconds), to `set()`
   * uniforms that change from frame to frame.
   */
  beforeDraw?: (time: number) => void;
}

const VERTEX = `attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Runs a full-screen fragment shader on a canvas, and takes care of the
 * chores every shader piece needs:
 *
 * - sizing to the canvas's box at a capped pixel ratio;
 * - drawing only while on screen and while the tab is visible;
 * - a single still frame under reduced motion (live if the setting changes);
 * - recovering when the browser drops the WebGL context;
 * - on the dev server, warning when the picture flashes (see FlashGuard).
 *
 * `ShaderCanvas.create` returns null without WebGL, so callers can leave
 * their fallback content showing.
 */
export class ShaderCanvas {
  private readonly disposer = new Disposer();
  private readonly gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private uniforms: Record<
    'time' | 'resolution' | 'pointer',
    WebGLUniformLocation | null
  > = { time: null, resolution: null, pointer: null };
  private textureUnits: [WebGLUniformLocation | null, number][] = [];
  /** Uniforms from `set()`, kept to apply on every draw (and after a lost context). */
  private readonly values = new Map<string, number[]>();
  private time = 0;
  private pointer = [0.5, 0.5];
  private onScreen = false;
  private paused = false;
  private stopLoop: Cleanup | null = null;
  private readonly flashGuard = import.meta.env.DEV ? new FlashGuard() : null;

  static create(
    canvas: HTMLCanvasElement,
    options: ShaderOptions
  ): ShaderCanvas | null {
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: options.transparent ?? false,
    });
    return gl ? new ShaderCanvas(canvas, gl, options) : null;
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
    private readonly options: ShaderOptions
  ) {
    this.gl = gl;
    this.time = options.stillTime ?? 0;
    this.setUp();

    const resize = new ResizeObserver(() => this.resize());
    resize.observe(canvas);
    this.disposer.add(() => resize.disconnect());

    const visible = new IntersectionObserver(([entry]) => {
      this.onScreen = entry.isIntersecting;
      this.update();
    });
    visible.observe(canvas);
    this.disposer.add(() => visible.disconnect());

    this.disposer.listen(document, 'visibilitychange', () => this.update());
    this.disposer.listen(window, 'pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer = [
        (e.clientX - rect.left) / rect.width,
        1 - (e.clientY - rect.top) / rect.height,
      ];
      if (reducedMotion.matches) this.draw();
    });
    const onMotionChange = () => this.update();
    reducedMotion.addEventListener('change', onMotionChange);
    this.disposer.add(() =>
      reducedMotion.removeEventListener('change', onMotionChange)
    );

    // Browsers drop WebGL contexts under memory pressure; asking to keep
    // the canvas (preventDefault) lets us rebuild when it's restored.
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    this.disposer.add(() => {
      canvas.removeEventListener('webglcontextlost', this.onContextLost);
      canvas.removeEventListener(
        'webglcontextrestored',
        this.onContextRestored
      );
    });
  }

  /** Sets a float uniform (`float` to `vec4`) for the next draw. */
  set(name: string, ...values: number[]): void {
    this.values.set(name, values);
  }

  /** Holds the picture still (true), or lets it run on. */
  pause(paused: boolean): void {
    this.paused = paused;
    this.update();
  }

  /** Draws now. For pictures that don't `animate`. */
  render(): void {
    this.draw();
  }

  dispose(): void {
    this.stopLoop?.();
    this.disposer.dispose();
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private readonly onContextLost = (e: Event) => {
    e.preventDefault();
    this.stopLoop?.();
    this.stopLoop = null;
    this.program = null;
  };

  private readonly onContextRestored = () => {
    this.setUp();
    this.resize();
    this.update();
  };

  /** Runs the loop only when there's something to see. */
  private update(): void {
    const live =
      this.options.animate !== false &&
      !this.paused &&
      this.onScreen &&
      !document.hidden &&
      !reducedMotion.matches;
    if (live && !this.stopLoop) {
      const interval = 1000 / (this.options.maxFps ?? 60);
      this.stopLoop = ticker.subscribe(interval, (dt) => {
        this.time += dt / 1000;
        this.draw();
      });
    } else if (!live && this.stopLoop) {
      this.stopLoop();
      this.stopLoop = null;
    }
    if (reducedMotion.matches) {
      this.time = this.options.stillTime ?? 0;
      this.draw();
    }
  }

  private resize(): void {
    const ratio = Math.min(devicePixelRatio, this.options.maxPixelRatio ?? 1.5);
    // As drawn, after any transforms (a zoomed photo layer, say), so the
    // picture is sharp at the size it shows.
    const box = this.canvas.getBoundingClientRect();
    let width = box.width * ratio;
    let height = box.height * ratio;
    const { maxSize } = this.options;
    if (maxSize) {
      const scale = Math.min(maxSize[0] / width, maxSize[1] / height);
      if (scale < 1) {
        width *= scale;
        height *= scale;
      }
    }
    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    this.draw();
  }

  private draw(): void {
    const { gl, program, uniforms } = this;
    if (!program) return;
    this.options.beforeDraw?.(this.time);
    gl.uniform1f(uniforms.time, this.time);
    gl.uniform2f(uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(uniforms.pointer, this.pointer[0], this.pointer[1]);
    for (const [location, unit] of this.textureUnits) {
      gl.uniform1i(location, unit);
    }
    for (const [name, values] of this.values) {
      const location = gl.getUniformLocation(program, name);
      if (values.length === 1) gl.uniform1f(location, values[0]);
      else if (values.length === 2) gl.uniform2fv(location, values);
      else if (values.length === 3) gl.uniform3fv(location, values);
      else gl.uniform4fv(location, values);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // Real time, not the shader's: flashes are judged by the clock.
    this.flashGuard?.sample(gl, performance.now() / 1000);
  }

  private setUp(): void {
    const { gl } = this;
    const program = gl.createProgram();
    gl.attachShader(program, this.compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(
      program,
      this.compile(gl.FRAGMENT_SHADER, this.options.fragment)
    );
    gl.linkProgram(program);
    if (
      !gl.getProgramParameter(program, gl.LINK_STATUS) &&
      !gl.isContextLost()
    ) {
      throw new Error(`Shader link failed: ${gl.getProgramInfoLog(program)}`);
    }
    gl.useProgram(program);

    // One triangle that covers the whole canvas.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    this.textureUnits = Object.entries(this.options.textures ?? {}).map(
      ([name, image], unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image
        );
        // WebGL 1 needs these for sizes that aren't powers of two.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        return [gl.getUniformLocation(program, name), unit];
      }
    );

    this.program = program;
    this.uniforms = {
      time: gl.getUniformLocation(program, 'u_time'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      pointer: gl.getUniformLocation(program, 'u_pointer'),
    };
  }

  private compile(type: number, source: string): WebGLShader {
    const { gl } = this;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Could not create shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (
      !gl.getShaderParameter(shader, gl.COMPILE_STATUS) &&
      !gl.isContextLost()
    ) {
      throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }
}
