precision mediump float;

/*
 * The panel's reflections on the shelter, pavement and road, coloured
 * like the picture on it: the photo's reflections, white (from
 * screen-reflections.webp), tinted by the showing photo's colour.
 * Opaque where the photo's own reflections are the ad's pink, so they're
 * covered; clear where there are none. collage-video.ts sets the uniforms.
 */

uniform vec2 u_resolution;
/** The reflections, white; alpha says how much each is the screen's light. */
uniform sampler2D u_reflections;
/** The showing photo's colour, brightness about 1. */
uniform vec3 u_tint;
/** The panel's light, 0–1: dims with the bus stop's flicker. */
uniform float u_light;

void main() {
  vec2 uv = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) /
    u_resolution;
  vec4 reflection = texture2D(u_reflections, uv);
  vec3 color = reflection.rgb * mix(vec3(1.0), u_tint, reflection.a);
  // Off, the lights-off photo below shows through.
  float alpha = reflection.a * u_light;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0) * alpha, alpha);
}
