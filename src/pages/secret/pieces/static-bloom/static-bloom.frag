precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_pointer;

// The title palette (site.config.ts), dimmed later.
const vec3 PINK = vec3(0.941, 0.698, 0.953);
const vec3 GREEN = vec3(0.333, 0.957, 0.616);
const vec3 YELLOW = vec3(0.941, 0.878, 0.353);
const vec3 BLUE = vec3(0.392, 0.796, 0.878);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time * 0.04;
  vec2 lean = (u_pointer - 0.5) * 0.6;

  // Domain warping: noise displaced by noise, displaced by noise.
  vec2 q = vec2(fbm(uv * 1.4 + t), fbm(uv * 1.4 - t + 4.0));
  vec2 r = vec2(fbm(uv * 1.8 + q * 2.0 + lean + t * 0.7), fbm(uv * 1.8 + q * 2.0 + 8.3));
  float f = fbm(uv * 1.8 + r * 2.4);

  vec3 col = mix(BLUE, PINK, smoothstep(0.25, 0.75, f));
  col = mix(col, GREEN, smoothstep(0.55, 0.95, r.x) * 0.5);
  col = mix(col, YELLOW, smoothstep(0.65, 1.0, q.y) * 0.35);
  // Mostly darkness, with the colour blooming through.
  col *= smoothstep(0.3, 0.85, f) * 0.6;
  // Grain: tiny, so it shimmers rather than flickers.
  col += (hash(gl_FragCoord.xy + fract(u_time) * 100.0) - 0.5) * 0.035;

  gl_FragColor = vec4(col, 1.0);
}
