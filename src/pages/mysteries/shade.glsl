// The shade behind the text block: main.ts sets where it is, and how
// dark and how soft. Each background darkens its colour by `shade()`
// before dithering, so the shade's dithered too.

/** The text block: left, bottom, right, top, in the canvas's pixels. */
uniform vec4 u_box;
/** How dark it is in the middle (0–1), and how far past the block it reaches (pixels). */
uniform vec2 u_shade;

/**
 * How much to darken here, 0–1: an oval round the text block, darkest
 * (`u_shade.x`) in its middle and fading all the way out to its edge,
 * `u_shade.y` past the block's, so the picture still shows through.
 */
float shade() {
  vec2 middle = 0.5 * (u_box.xy + u_box.zw);
  // Round the block's corners, as well as its sides.
  vec2 radius = 0.5 * 1.15 * (u_box.zw - u_box.xy) + u_shade.y;
  float d = length((gl_FragCoord.xy - middle) / max(radius, vec2(1.0)));
  return u_shade.x * (1.0 - smoothstep(0.0, 1.0, d));
}
