#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

/*
 * What every look of the collage video shares (collage-video.ts puts this
 * before crt.frag or panel.frag): photos of the band cutting from one to
 * the next like a video, and between rounds of them, if there is one, a
 * real video (the montage).
 */

uniform float u_time;
uniform vec2 u_resolution;

/**
 * The photos, side by side in one image (collage.webp, made by
 * `npm run tv:collage`), `u_frames` across and down.
 */
uniform sampler2D u_collage;
uniform vec2 u_frames;
/** Which photo is showing, counting across then down. */
uniform float u_frame;
/** A photo's width over its height: it's cropped to fill the screen. */
uniform float u_frame_aspect;
/** The montage, and its width over its height. */
uniform sampler2D u_video;
uniform float u_video_aspect;
/** What shows: the photos (0) or the montage (1). */
uniform float u_source;
/** How bright the picture is, 0–1. */
uniform float u_level;

const float FPS = 30.0;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

/**
 * `uv` on a screen `aspect` wide per tall, as a place on a picture
 * `picture` wide per tall that covers it.
 */
vec2 cover(vec2 uv, float aspect, float picture) {
  vec2 scale = aspect > picture
    ? vec2(1.0, picture / aspect)
    : vec2(aspect / picture, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

/**
 * What's showing at `uv` (0–1 from the top left of a screen `aspect` wide
 * per tall): the montage, or a photo. A photo is read a hair inside its
 * part of the atlas, so the next photo never bleeds in at the edges.
 */
vec3 photo(vec2 uv, float aspect) {
  if (u_source > 0.5) {
    return texture2D(u_video, cover(uv, aspect, u_video_aspect)).rgb;
  }
  vec2 cell = vec2(mod(u_frame, u_frames.x), floor(u_frame / u_frames.x));
  vec2 at = (cell + clamp(cover(uv, aspect, u_frame_aspect), 0.002, 0.998)) / u_frames;
  return texture2D(u_collage, at).rgb;
}
