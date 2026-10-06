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
   */
  fragment: string;
  /** Frame rate cap; lower is kinder to batteries. Default 60. */
  maxFps?: number;
  /** Device pixel ratio cap; shaders are costly per pixel. Default 1.5. */
  maxPixelRatio?: number;
  /** Time shown when motion is reduced, in seconds. Default 0. */
  stillTime?: number;
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
  private time = 0;
  private pointer = [0.5, 0.5];
  private onScreen = false;
  private stopLoop: Cleanup | null = null;
  private readonly flashGuard = import.meta.env.DEV ? new FlashGuard() : null;

  static create(
    canvas: HTMLCanvasElement,
    options: ShaderOptions
  ): ShaderCanvas | null {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
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
    const live = this.onScreen && !document.hidden && !reducedMotion.matches;
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
    const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * ratio));
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    this.draw();
  }

  private draw(): void {
    const { gl, program, uniforms } = this;
    if (!program) return;
    gl.uniform1f(uniforms.time, this.time);
    gl.uniform2f(uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(uniforms.pointer, this.pointer[0], this.pointer[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.flashGuard?.sample(gl, this.time);
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
