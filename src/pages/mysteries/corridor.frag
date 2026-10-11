// An endless square corridor, falling away into the middle of the screen:
// its walls checkered, twisting slowly the further in they are, and dark
// at the far end, behind the text. Each point's depth is 1 over how far
// it is from the middle. `dither()` comes from src/gl/dither.ts, and each
// pixel here is one of the dither's (CSS scales the canvas up).
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;

const float TAU = 6.28318;
/** The seams' width, as a share of the screen's short side. */
const float SEAM = 0.012;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time * u_speed;

  // Square: the wall a point is on is set by its larger side.
  float r = max(abs(uv.x), abs(uv.y));
  float depth = 0.3 / max(r, 1e-3);
  // Around the walls, 0–1, twisting with depth and time.
  float around = atan(uv.y, uv.x) / TAU + 0.02 * depth + 0.01 * t;

  vec2 cell = vec2(around * 16.0, depth * 3.0 + 0.4 * t);
  float check = mod(floor(cell.x) + floor(cell.y), 2.0);
  // A seam along each tile's edge, the same width on screen however near
  // the tile is: in tiles, the screen's width over a tile's.
  vec2 seamWidth = SEAM * vec2(16.0 / (TAU * r), 3.0 * depth * depth / 0.3);
  vec2 edge = 0.5 - abs(fract(cell) - 0.5);
  float seam = step(edge.x, seamWidth.x) + step(edge.y, seamWidth.y);

  vec3 color = mix(vec3(0.02, 0.01, 0.15), vec3(0.13, 0.24, 0.54), check);
  color = mix(color, vec3(0.48, 0.19, 0.27), min(seam, 1.0));

  // Fog: nothing at the far end.
  color *= smoothstep(0.04, 0.6, r);

  gl_FragColor = vec4(dither(color, gl_FragCoord.xy), 1.0);
}
