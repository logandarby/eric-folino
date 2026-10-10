// The listen scene: the deck, then the tapes over it, each placed and
// turned as main.ts says, with a shadow, then dithered to the palette. A
// tape going in ends up behind the deck's glass, seen through its window.
// `dither()` and `bayer16()` come from src/gl/dither.ts, and each pixel
// here is one of the dither's (CSS scales the canvas up). The dither stays
// put on the screen, so a moving tape shimmers through it. Outside the art
// it's see-through.
precision mediump float;

#define MAX_TAPES 8
#define MAX_NOTES 12

uniform vec2 u_resolution;
/** The canvas's size in CSS pixels, which the boxes below are in. */
uniform vec2 u_size;
uniform sampler2D u_deck;
uniform sampler2D u_deck_full;
/** Every tape's art, one above the other. */
uniform sampler2D u_tape_art;
/** The deck's box: x, y, width, height, from the canvas's top left. */
uniform vec4 u_deck_rect;
/** Its dance, about the middle of its base: turn, and squash. */
uniform vec3 u_deck_pose;
/** Each tape's centre and size (x, y, width, height). */
uniform vec4 u_tape_rects[MAX_TAPES];
/**
 * Each tape's turn (radians, clockwise), its squash (width and height
 * scale), and how far it's lifted off the shelf (0–1, for its shadow).
 */
uniform vec4 u_tape_poses[MAX_TAPES];
uniform float u_tape_count;
/** 1 with a tape in the deck: the deck with the see-through window. */
uniform float u_full;
/** The window, as a box in the deck art. */
uniform vec4 u_window;
/**
 * The screen, as a box in the deck art, left see-through so the embed
 * under the canvas shows, and how far past its edge (CSS pixels).
 */
uniform vec4 u_screen;
uniform float u_screen_edge;
/** Which tape is behind the glass (-1 for none), and how far, 0–1. */
uniform float u_glass_tape;
uniform float u_glass;
/** Half a texel of one tape's height, as a share of it. */
uniform float u_tape_edge;
/** Every note's shape, one above the other, in square cells. */
uniform sampler2D u_note_art;
uniform float u_note_kinds;
/**
 * The notes floating up while a tape plays: each one's centre and size
 * (CSS pixels) and which shape it is, then its turn (radians, clockwise)
 * and how much of it shows (0–1; it dissolves through the dither). Arrays
 * go in as vec4s (see ShaderCanvas.set), so the poses are too.
 */
uniform vec4 u_notes[MAX_NOTES];
uniform vec4 u_note_poses[MAX_NOTES];
uniform float u_note_count;

/** The shadow's colour and darkness. */
const vec3 SHADOW_COLOR = vec3(0.16, 0.13, 0.19);
const float SHADOW_STRENGTH = 0.5;
/** Its offset and blur, as shares of the tape's width. */
const vec2 SHADOW_OFFSET = vec2(0.02, 0.04);
const float SHADOW_BLUR = 0.03;
/** The notes' ink. */
const vec3 NOTE_COLOR = vec3(0.16, 0.13, 0.19);

/** Where `uv` falls in `rect`, 0–1 inside it. */
vec2 within(vec4 rect, vec2 uv) {
  return (uv - rect.xy) / max(rect.zw, vec2(1e-6));
}

bool inside(vec2 p) {
  return p.x >= 0.0 && p.y >= 0.0 && p.x <= 1.0 && p.y <= 1.0;
}

/** Where `at` falls on a tape's art, 0–1, undoing its turn and squash. */
vec2 onTape(vec4 rect, vec4 pose, vec2 at) {
  vec2 d = at - rect.xy;
  float c = cos(pose.x);
  float s = sin(pose.x);
  d = vec2(c * d.x + s * d.y, -s * d.x + c * d.y);
  return d / max(rect.zw * pose.yz, vec2(1e-6)) + 0.5;
}

/** Tape `i`'s art at `p` (0–1 on it). */
vec4 tapeArt(float i, vec2 p) {
  if (!inside(p)) return vec4(0.0);
  // Kept half a texel inside, so filtering never mixes in the next tape.
  p.y = clamp(p.y, u_tape_edge, 1.0 - u_tape_edge);
  return texture2D(u_tape_art, vec2(p.x, (i + p.y) / u_tape_count));
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y)
    / u_resolution * u_size;

  // Undo the deck's dance, about the middle of its base.
  vec2 pivot = u_deck_rect.xy + vec2(0.5, 1.0) * u_deck_rect.zw;
  vec2 d = px - pivot;
  float c = cos(u_deck_pose.x);
  float s = sin(u_deck_pose.x);
  d = vec2(c * d.x + s * d.y, -s * d.x + c * d.y) / u_deck_pose.yz;
  vec4 deck = vec4(0.0);
  vec2 inDeck = within(u_deck_rect, pivot + d);
  if (u_deck_rect.z > 0.0 && inside(inDeck)) {
    deck = u_full > 0.5
      ? texture2D(u_deck_full, inDeck)
      : texture2D(u_deck, inDeck);
    vec2 edge = u_screen_edge / u_deck_rect.zw;
    vec4 screen = vec4(u_screen.xy - edge, u_screen.zw + 2.0 * edge);
    if (inside(within(screen, inDeck))) deck = vec4(0.0);
  }

  // The tape behind the glass, the topmost of the rest, and their shadows.
  vec4 behind = vec4(0.0);
  vec4 front = vec4(0.0);
  float shadow = 0.0;
  for (int i = 0; i < MAX_TAPES; i++) {
    float index = float(i);
    if (index >= u_tape_count) break;
    vec4 rect = u_tape_rects[i];
    vec4 pose = u_tape_poses[i];
    if (rect.z <= 0.0) continue;
    bool glassy = index == u_glass_tape;

    vec4 tape = tapeArt(index, onTape(rect, pose, px));
    if (tape.a > 0.5) {
      if (glassy) behind = tape;
      else front = tape;
    }

    // A soft shadow: the tape's outline, shifted and blurred. It drops
    // further as the tape lifts, and goes as it goes behind the glass.
    vec2 offset = SHADOW_OFFSET * rect.z * (1.0 + pose.w);
    float blur = SHADOW_BLUR * rect.z;
    vec2 at = px - offset;
    float cover = (
      tapeArt(index, onTape(rect, pose, at)).a +
      tapeArt(index, onTape(rect, pose, at + vec2(blur, 0.0))).a +
      tapeArt(index, onTape(rect, pose, at - vec2(blur, 0.0))).a +
      tapeArt(index, onTape(rect, pose, at + vec2(0.0, blur))).a +
      tapeArt(index, onTape(rect, pose, at - vec2(0.0, blur))).a
    ) / 5.0;
    if (glassy) cover *= 1.0 - u_glass;
    shadow = max(shadow, cover * SHADOW_STRENGTH);
  }

  // The full deck's window is part see-through: drawn over the tape, it
  // darkens it and adds the glare. Past the tape, the window shows black.
  vec3 back = behind.a > 0.5 ? behind.rgb : vec3(0.0);
  vec4 color = vec4(mix(back, deck.rgb, deck.a), deck.a);
  if (u_full > 0.5 && inside(within(u_window, inDeck))) color.a = 1.0;
  // Going in, the tape passes from in front of the deck to behind it.
  if (behind.a > 0.5) color = mix(behind, color, u_glass);

  if (front.a > 0.5) {
    color = front;
  } else if (color.a > 0.5) {
    // Over the deck, the shadow darkens it.
    color.rgb *= 1.0 - shadow;
  } else if (bayer16(gl_FragCoord.xy) < shadow) {
    // Over the page, it's stippled, like the dither.
    color = vec4(SHADOW_COLOR, 1.0);
  }

  // The notes, over everything.
  for (int i = 0; i < MAX_NOTES; i++) {
    if (float(i) >= u_note_count) break;
    vec4 note = u_notes[i];
    vec4 pose = u_note_poses[i];
    vec4 turn = vec4(pose.x, 1.0, 1.0, 0.0);
    vec2 p = onTape(vec4(note.xy, vec2(note.z)), turn, px);
    if (!inside(p) || bayer16(gl_FragCoord.xy) >= pose.y) continue;
    vec2 at = vec2(p.x, (note.w + p.y) / u_note_kinds);
    if (texture2D(u_note_art, at).a > 0.5) color = vec4(NOTE_COLOR, 1.0);
  }

  // Hard edges: the art's soft ones would dither into speckles.
  gl_FragColor = color.a > 0.5
    ? vec4(dither(color.rgb, gl_FragCoord.xy), 1.0)
    : vec4(0.0);
}
