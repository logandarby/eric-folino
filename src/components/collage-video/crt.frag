/*
 * The enter page's TV: the collage (collage.glsl) with static fading in
 * and out over it, seen through a CRT, after daenavan's crt-threejs
 * (https://daenavan.github.io/crt-threejs/): bulging glass, colour
 * fringing, scanlines, a vignette and a faint flicker. collage-video.ts
 * sets the uniforms from the page config.
 */

/** How much static covers the photo, 0–1. */
uniform float u_noise;
/** The static's colour at full brightness. */
uniform vec3 u_tint;

uniform float u_curvature;
uniform float u_scanlines;
uniform float u_scanline_depth;
uniform float u_aberration;
uniform float u_vignette;
uniform float u_flicker;

/** Grains of static down the screen, at most. */
const float GRAIN_ROWS = 240.0;

/** Pushes `uv` (0–1) outwards from the middle, like curved glass. */
vec2 bulge(vec2 uv) {
  vec2 c = uv - 0.5;
  return c * (1.0 + dot(c, c) * u_curvature) + 0.5;
}

/**
 * Static: a fresh random grey per grain each frame. Grains are fine, a
 * pixel or so, whatever the screen's size.
 */
float grain(vec2 uv, float frame) {
  float rows = min(GRAIN_ROWS, u_resolution.y);
  vec2 cell = floor(uv * vec2(rows * u_resolution.x / u_resolution.y, rows));
  return hash(cell + vec2(frame * 7.13, frame * 3.71));
}

/**
 * What the TV is showing at `uv` (0–1 from the top left): the photo,
 * under the static's `noise` in the tint, with a faint brighter band
 * rolling slowly down like a drifting hold. The colour fringing reads this
 * at three places but with one grain, so the static keeps its tint instead
 * of breaking into rainbow speckles.
 */
vec3 picture(vec2 uv, float noise) {
  float roll = fract(uv.y * 0.7 - u_time * 0.09);
  float band = smoothstep(0.0, 0.12, roll) * smoothstep(0.3, 0.12, roll);
  // The photos are cut to the TV's shape already: shown whole, uncropped.
  vec3 shown = mix(photo(uv, u_frame_aspect), noise * u_tint, u_noise);
  return shown * u_level * (1.0 + band * 0.15);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.y = 1.0 - uv.y;
  vec2 glass = bulge(uv);
  if (glass.x < 0.0 || glass.x > 1.0 || glass.y < 0.0 || glass.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // At least three pixels a line, so small screens don't shimmer.
  float lines = min(u_scanlines, u_resolution.y / 3.0);
  float frame = mod(floor(u_time * FPS), 1024.0);
  vec2 shift = vec2(u_aberration, 0.0);
  float noise = grain(glass, frame);
  vec3 col = vec3(
    picture(bulge(uv - shift), noise).r,
    picture(glass, noise).g,
    picture(bulge(uv + shift), noise).b
  );

  float scan = 0.5 + 0.5 * sin(glass.y * lines * 6.2831853);
  col *= 1.0 - u_scanline_depth * (1.0 - scan);
  col *= clamp(1.0 - length(glass - 0.5) * u_vignette, 0.0, 1.0);
  col *= 1.0 - u_flicker * (0.5 + 0.5 * sin(u_time * 20.0));

  gl_FragColor = vec4(col, 1.0);
}
