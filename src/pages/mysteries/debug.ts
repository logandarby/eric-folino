/*
 * A readout for /mysteries/?debug, for phones without a console to hand:
 * whether WebGL starts, how precise its fragment shaders can be (and are,
 * at medium, tested by drawing), and how the background got on. Shown in
 * a box at the top of the page.
 */

/** The readout, if the address asks for it, or null. */
export function debugReadout(): ((line: string) => void) | null {
  if (!new URLSearchParams(location.search).has('debug')) return null;
  const box = document.createElement('pre');
  box.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:9999;margin:0;padding:8px;' +
    'max-height:50dvh;overflow:auto;white-space:pre-wrap;font:12px/1.4 monospace;' +
    'background:#fff;color:#000;';
  document.body.append(box);
  const log = (line: string) => {
    box.textContent += `${line}\n`;
  };
  log(`${navigator.userAgent}`);
  log(`screen ${innerWidth}×${innerHeight} @${devicePixelRatio}x`);
  probe(log);
  return log;
}

/** What a fresh WebGL context says about itself. */
function probe(log: (line: string) => void): void {
  const gl = document.createElement('canvas').getContext('webgl');
  if (!gl) {
    log('webgl: unavailable');
    return;
  }
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  log(
    `webgl: ${info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)}`
  );
  for (const [name, type] of [
    ['high', gl.HIGH_FLOAT],
    ['medium', gl.MEDIUM_FLOAT],
  ] as const) {
    const f = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, type);
    log(`fragment ${name} float: ${f ? `${f.precision} bits` : 'unknown'}`);
  }
  log(`medium, drawn: ${mediumDrawn(gl)}`);
  log(`sin(4000) hash, drawn: ${sinDrawn(gl)}`);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
}

/** Draws one pixel with `body` (setting gl_FragColor) and reads its red. */
function drawRed(
  gl: WebGLRenderingContext,
  body: string,
  uniform: number
): number | string {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('could not create a shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? 'compile failed');
    }
    return shader;
  };
  try {
    const program = gl.createProgram();
    gl.attachShader(
      program,
      compile(
        gl.VERTEX_SHADER,
        'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }'
      )
    );
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, body));
    gl.linkProgram(program);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const a = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u'), uniform);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px[0];
  } catch (e) {
    return `error: ${(e as Error).message}`;
  }
}

/** Whether 1 + 1/4096 is more than 1 at medium precision: no, on most phones. */
function mediumDrawn(gl: WebGLRenderingContext): string {
  const red = drawRed(
    gl,
    'precision mediump float; uniform float u;' +
      'void main() { gl_FragColor = vec4(1.0 + u > 1.0 ? 1.0 : 0.0, 0.0, 0.0, 1.0); }',
    1 / 4096
  );
  if (typeof red === 'string') return red;
  return red ? 'full (as desktops)' : 'reduced (as phones)';
}

/** The old fract(sin()) hash at a big input, at the best precision: about 0.4 if sin() holds up. */
function sinDrawn(gl: WebGLRenderingContext): string {
  const red = drawRed(
    gl,
    '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
      'uniform float u;' +
      'void main() { gl_FragColor = vec4(fract(sin(u) * 43758.5453), 0.0, 0.0, 1.0); }',
    4000
  );
  if (typeof red === 'string') return red;
  const expected = Math.round(
    ((((Math.sin(4000) * 43758.5453) % 1) + 1) % 1) * 255
  );
  return `${red} (exact: ${expected})`;
}
