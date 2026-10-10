/*
 * Ordered dithering to a fixed palette, as a GLSL snippet any shader can
 * use. It matches Dithermark's (https://app.dithermark.com) colour dither
 * with its defaults: a Bayer 16×16 pattern, colours matched by RGB
 * distance, and a dither strength of 1 / ∛(palette size).
 *
 *   const fragment = ditherGlsl(palettes.imperial) + myShader;
 *
 * gives `myShader` a function
 *
 *   vec3 dither(vec3 color, vec2 fragCoord)
 *
 * which returns the palette colour for `color` at that pixel. For chunky
 * pixels like Dithermark's "Pixelate", draw at a lower resolution and let
 * CSS scale it up (`image-rendering: pixelated`); see ShaderCanvas's
 * `maxSize` option.
 */

/** Dithermark's palettes, by name. */
export const palettes = {
  imperial: [
    '#c43b0c',
    '#79b8bc',
    '#7e23a8',
    '#d63f41',
    '#6082ae',
    '#863a7c',
    '#559de1',
    '#35778c',
    '#5ebe65',
    '#2d898e',
    '#ae5994',
    '#e2f3fe',
    '#09ffdb',
    '#7cbb68',
    '#f23472',
    '#edc35f',
    '#b027c3',
    '#1f3117',
  ],
  pueblo: [
    '#060338',
    '#fadafe',
    '#bd6a2d',
    '#e4fafc',
    '#e2a867',
    '#203e8a',
    '#cd3232',
    '#3f7c62',
    '#7a3046',
    '#eae0a8',
    '#252645',
    '#fbcfa4',
    '#2d4130',
    '#decfb5',
    '#fce8ec',
    '#d5f7e2',
    '#595671',
    '#95a08d',
  ],
} satisfies Record<string, string[]>;

/**
 * Dithermark's "Pixelate" settings, as the share of the image's
 * resolution each works at (for images up to 720 × 960). Indexed by the
 * setting: 0 is "None", so `PIXELATE[2]` is "2".
 */
export const PIXELATE = [1, 0.7, 0.6, 0.5, 0.45, 0.4, 0.37, 0.35, 0.32, 0.3];

/** The GLSL that defines `dither()`, for a palette of "#rrggbb" colours. */
export function ditherGlsl(palette: string[]): string {
  if (palette.length === 0) throw new Error('A dither palette needs colours');
  const colors = palette.map(vec3);
  // GLSL ES 1.0 has no constant arrays, so the search is written out.
  const search = colors
    .slice(1)
    .map(
      (color) =>
        `  candidate = ${color};\n` +
        `  d = dot(color - candidate, color - candidate);\n` +
        `  if (d < best) { best = d; nearest = candidate; }`
    )
    .join('\n');
  const strength = 1 / Math.cbrt(palette.length);

  // A shader's own precision statement after this one still applies.
  return `precision mediump float;

/** Bayer 16×16 threshold (0–1) for a pixel, built two bits at a time. */
float bayer16(vec2 fragCoord) {
  // Anchored at the bottom left, like Dithermark's.
  vec2 p = mod(floor(fragCoord), 16.0);
  p.y = 15.0 - p.y;
  float value = 0.0;
  float weight = 64.0;
  for (int i = 0; i < 4; i++) {
    vec2 bit = mod(p, 2.0);
    // The 2×2 pattern: 0 2 / 3 1.
    value += weight * mix(mix(0.0, 2.0, bit.x), mix(3.0, 1.0, bit.x), bit.y);
    p = floor(p / 2.0);
    weight /= 4.0;
  }
  return value / 255.0;
}

vec3 dither(vec3 color, vec2 fragCoord) {
  color = clamp(color + ${glslFloat(strength)} * (bayer16(fragCoord) - 0.5), 0.0, 1.0);
  vec3 nearest = ${colors[0]};
  float best = dot(color - nearest, color - nearest);
  vec3 candidate;
  float d;
${search}
  return nearest;
}
`;
}

/** "#c43b0c" → "vec3(0.7686, 0.2314, 0.0471)". */
function vec3(hex: string): string {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Not a #rrggbb colour: ${hex}`);
  const [r, g, b] = match.slice(1).map((c) => parseInt(c, 16) / 255);
  return `vec3(${glslFloat(r)}, ${glslFloat(g)}, ${glslFloat(b)})`;
}

const glslFloat = (n: number) => n.toFixed(4);
