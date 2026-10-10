// The window scene, over the desk picture: the video in the window's box,
// and the desk (with the room and the panes cut away) over it, then
// dithered to the palette. Where the room was, it's see-through, to the
// page. `dither()` comes from src/gl/dither.ts, and each pixel here is
// one of the dither's (CSS scales the canvas up).
precision mediump float;

uniform vec2 u_resolution;
uniform sampler2D u_desk;
uniform sampler2D u_video;
/** The video's box, as shares of the picture. */
uniform vec4 u_window;
/** The box's width over its height, and the video's. */
uniform float u_window_aspect;
uniform float u_video_aspect;

/** Where `uv` falls in `rect`, 0–1 inside it. */
vec2 within(vec4 rect, vec2 uv) {
  return (uv - rect.xy) / max(rect.zw, vec2(1e-6));
}

bool inside(vec2 p) {
  return p.x >= 0.0 && p.y >= 0.0 && p.x <= 1.0 && p.y <= 1.0;
}

void main() {
  vec2 p = gl_FragCoord.xy / u_resolution;
  p.y = 1.0 - p.y;

  vec4 color = vec4(0.0);
  vec2 q = within(u_window, p);
  if (inside(q)) {
    // Cropped to fill the box, like `object-fit: cover`.
    float box = u_window_aspect;
    if (box < u_video_aspect) q.x = 0.5 + (q.x - 0.5) * box / u_video_aspect;
    else q.y = 0.5 + (q.y - 0.5) * u_video_aspect / box;
    color = vec4(texture2D(u_video, q).rgb, 1.0);
  }
  vec4 desk = texture2D(u_desk, p);
  color = vec4(mix(color.rgb, desk.rgb, desk.a), max(color.a, desk.a));

  // Hard edges: soft ones would dither into speckles.
  gl_FragColor = color.a > 0.5
    ? vec4(dither(color.rgb, gl_FragCoord.xy), 1.0)
    : vec4(0.0);
}
