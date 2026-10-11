// Domain-warped noise: noise whose coordinates are pushed around by more
// noise, twice over, so it churns like oil, or something under skin.
// Dimmer in the middle, behind the text. `dither()` comes from
// src/gl/dither.ts, and each pixel here is one of the dither's (CSS
// scales the canvas up).
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

/** Value noise, 0–1, smooth between whole-number points. */
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

/** Three octaves of noise, each turned a little against the last. */
float fbm(vec2 p) {
  const mat2 turn = mat2(1.6, 1.2, -1.2, 1.6);
  float sum = 0.5 * noise(p);
  p = turn * p;
  sum += 0.25 * noise(p);
  p = turn * p;
  sum += 0.125 * noise(p);
  return sum / 0.875;
}

void main() {
  // Square units, the short side 3 across, so it's as busy on a phone.
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  vec2 p = uv * 3.0;
  float t = u_time * 0.06 * u_speed;

  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + 1.5 * t),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) - 1.2 * t)
  );
  float f = fbm(p + 4.0 * r);

  // Navy, through blue, to plum where it's thickest.
  vec3 color = mix(vec3(0.02, 0.01, 0.15), vec3(0.13, 0.24, 0.54), smoothstep(0.3, 0.75, f));
  color = mix(color, vec3(0.48, 0.19, 0.27), smoothstep(0.55, 0.9, r.x) * 0.8);
  color *= smoothstep(0.2, 0.8, f * f * 1.6 + 0.2 * q.y);

  // Dimmer behind the text, in the middle.
  float d = length(uv * vec2(0.8, 1.0));
  color *= mix(0.35, 1.0, smoothstep(0.15, 0.7, d));

  gl_FragColor = vec4(dither(color, gl_FragCoord.xy), 1.0);
}
