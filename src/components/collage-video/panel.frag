/*
 * The bus stop's lit ad panel: the collage (collage.glsl), bright and
 * blooming into the night around it. The canvas runs past the panel on
 * every side (`u_inset`) so the bloom has room; there it's light only,
 * see-through where it's dark. collage-video.ts sets the uniforms from
 * the page config.
 *
 * `u_mask` says where the photo is see-through (screen-mask.webp, from the
 * cutout of the photo): the screen, where the video shows, and partly the
 * pavement below it, where its light shows through the reflections
 * (reflection.frag, underneath, colours those).
 */

/** Where the panel starts in the canvas, as a share of it (0–0.5), across and down. */
uniform vec2 u_inset;
/** How see-through the photo is around the panel: 1 where it's open. */
uniform sampler2D u_mask;
/** How far `u_mask` reaches past the panel, as a share of its size. */
uniform float u_mask_margin;
/** How bright the video's light is in the reflections. */
uniform float u_reflection;
/** How far the bloom reaches, as a share of the panel's width. */
uniform float u_bloom_radius;
/** How bright the bloom is, around the panel. */
uniform float u_bloom_strength;
/** How much of the bloom shows over the panel itself, like halation. */
uniform float u_bloom_over;
/** The panel's light, 0–1: dims with the bus stop's flicker. */
uniform float u_light;
/** How bright every photo is brought to, on average, 0–1. */
uniform float u_exposure;
/** The most a dark photo is brightened, as a factor. */
uniform float u_max_gain;
/** How much colour the photos keep, 0–1. */
uniform float u_saturation;
/** The darkest the picture gets, 0–1: a backlit panel is never black. */
uniform float u_lift;
/**
 * The noise over the panel: how much (its spread, or standard deviation,
 * 0–1), and how big its specks are, in pixels.
 */
uniform float u_noise;
uniform float u_grain;

/** Points across and down the panel that the bloom gathers light from. */
const int BLOOM_X = 4;
const int BLOOM_Y = 6;

/**
 * Gaussian noise at `px` (mean 0, spread 1), new every frame of the video,
 * from two even ones (Box–Muller). The frame wraps so the hash's inputs
 * stay small enough to be precise.
 */
float gaussian(vec2 px) {
  float frame = mod(floor(u_time * FPS), 61.0);
  float a = max(hash(px + vec2(frame * 13.1, frame * 7.7)), 1e-4);
  float b = hash(px + vec2(frame * 5.3 + 31.0, frame * 11.9 + 17.0));
  return sqrt(-2.0 * log(a)) * cos(6.2831853 * b);
}

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

/**
 * `c` brightened by `gain`, with less colour (u_saturation). What would
 * go past full brightness fades to white instead of clipping, which would
 * bring the colour back.
 */
vec3 grade(vec3 c, float gain) {
  c = mix(vec3(luma(c)), c, u_saturation) * gain;
  float peak = max(max(c.r, c.g), c.b);
  return peak > 1.0 ? mix(c / peak, vec3(1.0), 1.0 - 1.0 / peak) : c;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 lo = u_inset * u_resolution;
  vec2 size = u_resolution - 2.0 * lo;
  float aspect = size.x / size.y;
  vec2 uv = (px - lo) / size;

  // The bloom: light from points across the panel, each fading with
  // distance, so it takes the colours of the picture near it.
  float radius = u_bloom_radius * size.x;
  // The same points give the photo's average brightness, so every photo
  // can be brought to the same: light, whatever it was shot in.
  vec3 glow = vec3(0.0);
  vec3 mean = vec3(0.0);
  for (int j = 0; j < BLOOM_Y; j++) {
    for (int i = 0; i < BLOOM_X; i++) {
      vec2 at = (vec2(float(i), float(j)) + 0.5) /
        vec2(float(BLOOM_X), float(BLOOM_Y));
      vec2 d = (px - (lo + at * size)) / radius;
      vec3 c = photo(at, aspect);
      glow += c * exp(-dot(d, d));
      mean += c;
    }
  }
  float count = float(BLOOM_X * BLOOM_Y);
  float gain = clamp(
    u_exposure / max(luma(mean / count), 0.01),
    0.5,
    u_max_gain
  );
  glow = grade(glow / count, gain) * u_level;

  // How much of this pixel is panel, softened over a pixel at the edges.
  vec2 edge = min(px - lo, lo + size - px);
  float inside = clamp(min(edge.x, edge.y) + 0.5, 0.0, 1.0);

  // Shadows lifted on the panel only: the bloom around it must stay
  // clear where it's dark.
  vec3 shown = grade(photo(clamp(uv, 0.0, 1.0), aspect), gain);
  vec3 panel = (u_lift + (1.0 - u_lift) * shown) * u_level +
    glow * u_bloom_over + u_noise * gaussian(floor(px / u_grain));

  // How see-through the photo is here, as if the video and its light
  // were behind it: the video in the screen, the light in reflections.
  vec2 at = (uv + u_mask_margin) / (1.0 + 2.0 * u_mask_margin);
  float inMask = step(0.0, at.x) * step(at.x, 1.0) * step(0.0, at.y) *
    step(at.y, 1.0);
  // Light, like the bloom below, fades out before the canvas ends, so its
  // edge never shows.
  vec2 rim = min(px, u_resolution - px) / lo;
  float fade = smoothstep(0.0, 1.0, min(rim.x, rim.y));
  float open = texture2D(u_mask, at).r * inMask * mix(fade, 1.0, inside);
  vec3 light = grade(mean / count, gain) * u_level * u_reflection;
  vec3 behind = clamp(mix(light, panel, inside) * u_light, 0.0, 1.0);

  // In front, the bloom: light added over the photo. All premultiplied:
  // where both are dark, the canvas is clear. The flicker dims both.
  vec3 around = clamp(glow * u_bloom_strength * u_light * fade, 0.0, 1.0);
  float aroundAlpha = max(max(around.r, around.g), around.b);
  gl_FragColor = vec4(
    behind * open + around * (1.0 - open),
    open + aroundAlpha * (1.0 - open)
  );
}
