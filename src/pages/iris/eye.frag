// One eye, from a picture of its three layers stacked top to bottom: the
// base (whites), the iris, and the skin with a hole where the eye shows.
// The iris is shifted by u_look; the base and skin stay put. Then it's
// dithered to the palette: `dither()` comes from src/gl/dither.ts, and
// each pixel here is one of the dither's (CSS scales the canvas up).
precision mediump float;

uniform vec2 u_resolution;
uniform sampler2D u_eye;
/** Iris offset, as a share of the eye's width and height. */
uniform vec2 u_look;
/** Half a texel of one layer's height, as a share of it. */
uniform float u_edge;

/** Layer `i` (0–2) at `uv` (0–1, from the top left). */
vec4 layer(float i, vec2 uv) {
  // Kept half a texel inside, so filtering never mixes in the next layer.
  uv.y = clamp(uv.y, u_edge, 1.0 - u_edge);
  return texture2D(u_eye, vec2(uv.x, (i + uv.y) / 3.0));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.y = 1.0 - uv.y;

  vec3 color = layer(0.0, uv).rgb;
  vec4 iris = layer(1.0, uv - u_look);
  color = mix(color, iris.rgb, iris.a);
  vec4 skin = layer(2.0, uv);
  color = mix(color, skin.rgb, skin.a);

  gl_FragColor = vec4(dither(color, gl_FragCoord.xy), 1.0);
}
