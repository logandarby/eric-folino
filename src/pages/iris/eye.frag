// One eye, from a picture of its three layers stacked top to bottom: the
// base (whites), the iris, and the skin with a hole where the eye shows.
// The iris is shifted by u_look, and grows with a black pupil opening in
// it by u_dilate; the base and skin stay put. Then it's
// dithered to the palette: `dither()` comes from src/gl/dither.ts, and
// each pixel here is one of the dither's (CSS scales the canvas up).
precision mediump float;

uniform vec2 u_resolution;
uniform sampler2D u_eye;
/** Iris offset, as a share of the eye's width and height. */
uniform vec2 u_look;
/** Half a texel of one layer's height, as a share of it. */
uniform float u_edge;
/**
 * Where the iris is in its layer: its centre, as a share of the layer's
 * width and height, and its radius, as a share of the width.
 */
uniform vec3 u_iris;
/** The layer's width over its height. */
uniform float u_aspect;
/** How dilated the pupil is: 0 as drawn, 1 wide open. */
uniform float u_dilate;

/** How much bigger the iris grows, wide open. */
const float GROW = 0.2;
/** The pupil's radius wide open, as a share of the (grown) iris's. */
const float PUPIL = 0.78;
/** The pupil's colour. */
const vec3 BLACK = vec3(0.02, 0.01, 0.03);

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
  // The iris, moved by u_look, and grown about its centre as it dilates.
  vec2 p = uv - u_look;
  float grow = 1.0 + GROW * u_dilate;
  vec4 iris = layer(1.0, u_iris.xy + (p - u_iris.xy) / grow);
  // A black pupil opening in the middle of it, round on screen.
  vec2 offset = (p - u_iris.xy) * vec2(1.0, 1.0 / u_aspect);
  float pupil = PUPIL * u_iris.z * grow * u_dilate;
  float hole = 1.0 - smoothstep(0.8 * pupil, pupil, length(offset));
  iris.rgb = mix(iris.rgb, BLACK, hole * step(0.001, u_dilate));
  color = mix(color, iris.rgb, iris.a);
  vec4 skin = layer(2.0, uv);
  color = mix(color, skin.rgb, skin.a);

  gl_FragColor = vec4(dither(color, gl_FragCoord.xy), 1.0);
}
