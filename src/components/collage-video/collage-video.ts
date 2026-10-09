import { h } from '../../core/component.ts';
import { ShaderCanvas } from '../../gl/shader-canvas.ts';
import collageGlsl from './collage.glsl?raw';
import collage from './collage.json';
import collageUrl from './collage.webp';
import crtFrag from './crt.frag?raw';
import panelFrag from './panel.frag?raw';
import reflectionFrag from './reflection.frag?raw';

/** Seconds between the picture's changes in brightness. */
const DRIFT_S = 1.6;

interface CollageBase {
  /** How bright the picture is, 0–1. It drifts slowly between the two. */
  signal: { min: number; max: number };
  /**
   * How long each photo shows, in seconds, before it cuts to the next
   * (assets-src/tv-collage/, put together by `npm run tv:collage`).
   */
  photoSeconds: number;
}

/** The collage on an old TV, under static (crt.frag). */
export interface CrtCollage extends CollageBase {
  look: 'crt';
  /**
   * How much static covers the photos, 0–1. It fades between the two at random, to a
   * new amount every `seconds`; `shape` above 1 keeps it nearer `min`
   * more of the time.
   */
  static: { min: number; max: number; seconds: number; shape: number };
  /** The static's colour at full brightness, "#rrggbb". */
  tint: string;
  /** The CRT look over the picture, after daenavan's crt-threejs. */
  crt: {
    /** How much the glass bulges. */
    curvature: number;
    /** Scanlines down the screen (fewer on small screens, so they stay sharp). */
    scanlines: number;
    /** How dark the gaps between scanlines are, 0–1. */
    scanlineDepth: number;
    /** Colour fringing: how far red and blue drift apart, as a share of the width. */
    aberration: number;
    /** How dark the corners get. */
    vignette: number;
    /** How much the brightness wavers, 0–1. Kept tiny: it never flashes. */
    flicker: number;
  };
}

/** The collage on a lit ad panel, blooming (panel.frag). */
export interface PanelCollage extends CollageBase {
  look: 'panel';
  bloom: {
    /**
     * How far past the panel the canvas runs, for the bloom, as a share
     * of the panel's width (sideways) and height (up and down).
     */
    spread: number;
    /** How far the bloom reaches, as a share of the panel's width. */
    radius: number;
    /** How bright the bloom is, around the panel. */
    strength: number;
    /** How much of the bloom shows over the panel itself. */
    over: number;
  };
  /** The video's light in its reflections (see `mask` and `reflections`). */
  reflections: {
    /** How bright it is where the photo's see-through, below the panel. */
    light: number;
    /**
     * How much they take the picture's colour, 0–1: at 1, each channel
     * goes from none to double; kept low, they're only tinted.
     */
    saturation: number;
  };
  /**
   * Evening the photos out: each is brightened (by `maxGain` at most) or
   * dimmed to the same average `exposure`, 0–1, keeps `saturation` of its
   * colour, 0–1, and goes no darker than `lift`, 0–1.
   */
  tone: {
    exposure: number;
    maxGain: number;
    saturation: number;
    lift: number;
  };
}

export type CollageConfig = CrtCollage | PanelCollage;

/**
 * - `playing`: the photos cut by;
 * - `held`: the picture holds on a photo, though the screen stays live
 *   (flicker);
 * - `off`: nothing draws.
 */
export type CollageState = 'playing' | 'held' | 'off';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollagePlayer {
  set(state: CollageState): void;
  /** Turns it off for good. */
  dispose(): void;
}

export interface CollageOptions {
  /** The screen's light, 0–1, read every frame (for a flickering light). */
  light?: () => number;
  /**
   * For the panel look, which needs it: where the photo over the screen
   * is see-through, as a grey image (white: open), reaching `margin` of
   * the screen's size past it. The video shows only there, and its light
   * where the photo is partly open (reflections).
   */
  mask?: { url: string; margin: number };
  /**
   * For the panel look: the screen's reflections in the photo, white, to
   * be coloured like the picture (reflection.frag), and where they sit, as
   * shares of the screen's width and height from its top left.
   */
  reflections?: { url: string; box: Box };
}

/**
 * Plays the collage video in `screen`: a shader on a canvas, cutting
 * between photos of the band, cropped to fill the screen, in the look
 * `config` asks for. Without WebGL, or if the photos won't load, nothing
 * is added and the screen shows what it showed before.
 */
export function playCollage(
  screen: HTMLElement,
  config: CollageConfig,
  options: CollageOptions = {}
): CollagePlayer {
  let disposed = false;
  let state: CollageState = 'playing';
  let shaders: ShaderCanvas[] = [];
  const photos = loadImage(collageUrl);
  const mask = options.mask ? loadImage(options.mask.url) : null;
  const reflections = options.reflections
    ? loadImage(options.reflections.url)
    : null;
  Promise.all([photos.decode(), mask?.decode(), reflections?.decode()]).then(
    () => {
      if (disposed) return;
      shaders = start(
        screen,
        { photos, mask, reflections },
        config,
        options,
        () => state
      );
      for (const shader of shaders) shader.pause(state === 'off');
    },
    () => undefined
  );
  return {
    set(value) {
      state = value;
      for (const shader of shaders) shader.pause(value === 'off');
    },
    dispose() {
      disposed = true;
      for (const shader of shaders) shader.dispose();
    },
  };
}

function loadImage(url: string): HTMLImageElement {
  const image = new Image();
  image.src = url;
  return image;
}

interface Images {
  photos: HTMLImageElement;
  mask: HTMLImageElement | null;
  reflections: HTMLImageElement | null;
}

/** The collage's canvas, and the reflections' below it if asked for. */
function start(
  screen: HTMLElement,
  { photos, mask, reflections }: Images,
  config: CollageConfig,
  options: CollageOptions,
  state: () => CollageState
): ShaderCanvas[] {
  if (config.look === 'panel' && !mask) return [];
  const { light } = options;
  // Which photo shows, read by the reflections too.
  let frame = 0;
  const canvas = h('canvas', { 'aria-hidden': 'true' });
  // The picture's own clock, which stops while it's held.
  let clock = 0;
  let last = 0;
  const shader = ShaderCanvas.create(canvas, {
    fragment: collageGlsl + (config.look === 'crt' ? crtFrag : panelFrag),
    textures: mask
      ? { u_collage: photos, u_mask: mask }
      : { u_collage: photos },
    maxFps: 30,
    stillTime: 4.2,
    transparent: config.look === 'panel',
    beforeDraw: (time) => {
      if (state() === 'playing') clock += time - last;
      last = time;
      shader?.set('u_level', drift(clock, DRIFT_S, config.signal));
      // In order, round and round (the order is shuffled when it's made).
      frame = Math.floor(clock / config.photoSeconds) % collage.count;
      shader?.set('u_frame', frame);
      if (config.look === 'crt') {
        shader?.set('u_noise', staticAmount(clock, config.static));
      }
      if (light) shader?.set('u_light', light());
    },
  });
  if (!shader) return [];
  shader.set('u_frames', collage.columns, collage.rows);
  shader.set(
    'u_frame_aspect',
    photos.naturalWidth /
      collage.columns /
      (photos.naturalHeight / collage.rows)
  );
  shader.set('u_light', 1);
  if (config.look === 'crt') {
    const { crt } = config;
    shader.set('u_tint', ...rgb(config.tint));
    shader.set('u_curvature', crt.curvature);
    shader.set('u_scanlines', crt.scanlines);
    shader.set('u_scanline_depth', crt.scanlineDepth);
    shader.set('u_aberration', crt.aberration);
    shader.set('u_vignette', crt.vignette);
    shader.set('u_flicker', crt.flicker);
  } else {
    const { bloom } = config;
    // Percentages run with each side, so one share works both ways.
    const pct = (n: number) => `${n * 100}%`;
    Object.assign(canvas.style, {
      position: 'absolute',
      left: pct(-bloom.spread),
      top: pct(-bloom.spread),
      width: pct(1 + 2 * bloom.spread),
      height: pct(1 + 2 * bloom.spread),
    });
    const inset = bloom.spread / (1 + 2 * bloom.spread);
    shader.set('u_inset', inset, inset);
    shader.set('u_bloom_radius', bloom.radius);
    shader.set('u_bloom_strength', bloom.strength);
    shader.set('u_bloom_over', bloom.over);
    shader.set('u_reflection', config.reflections.light);
    shader.set('u_mask_margin', options.mask?.margin ?? 0);
    shader.set('u_exposure', config.tone.exposure);
    shader.set('u_max_gain', config.tone.maxGain);
    shader.set('u_saturation', config.tone.saturation);
    shader.set('u_lift', config.tone.lift);
  }
  screen.append(canvas);
  if (config.look !== 'panel' || !reflections || !options.reflections) {
    return [shader];
  }
  const tints = photoColours(photos).map((c) =>
    tint(c, config.reflections.saturation)
  );
  const below = reflectionLayer(reflections, options.reflections.box, {
    tint: () => tints[frame],
    light: light ?? (() => 1),
  });
  if (!below) return [shader];
  canvas.before(below.canvas);
  return [below.shader, shader];
}

/**
 * A canvas for the screen's reflections (`image`, white) over the photo at
 * `box`, coloured `tint()` (reflection.frag).
 */
function reflectionLayer(
  image: HTMLImageElement,
  box: Box,
  { tint, light }: { tint: () => Rgb; light: () => number }
): { canvas: HTMLCanvasElement; shader: ShaderCanvas } | null {
  const canvas = h('canvas', { 'aria-hidden': 'true' });
  const pct = (n: number) => `${n * 100}%`;
  Object.assign(canvas.style, {
    position: 'absolute',
    left: pct(box.x),
    top: pct(box.y),
    width: pct(box.width),
    height: pct(box.height),
  });
  const shader = ShaderCanvas.create(canvas, {
    fragment: reflectionFrag,
    textures: { u_reflections: image },
    maxFps: 30,
    // Soft light: it needn't be sharp, and it's big.
    maxPixelRatio: 1,
    transparent: true,
    beforeDraw: () => {
      shader?.set('u_tint', ...tint());
      shader?.set('u_light', light());
    },
  });
  return shader ? { canvas, shader } : null;
}

type Rgb = [number, number, number];

/** Each photo's average colour, 0–1, in the collage's order. */
function photoColours(photos: HTMLImageElement): Rgb[] {
  // A few pixels a photo is plenty for an average.
  const per = 8;
  const canvas = h('canvas', {});
  canvas.width = collage.columns * per;
  canvas.height = collage.rows * per;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return Array.from({ length: collage.count }, () => [1, 1, 1]);
  context.drawImage(photos, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  return Array.from({ length: collage.count }, (_, i) => {
    const left = (i % collage.columns) * per;
    const top = Math.floor(i / collage.columns) * per;
    const sum: Rgb = [0, 0, 0];
    for (let y = top; y < top + per; y++) {
      for (let x = left; x < left + per; x++) {
        const at = (y * canvas.width + x) * 4;
        for (let c = 0; c < 3; c++) sum[c] += data[at + c] / 255;
      }
    }
    return sum.map((v) => v / (per * per)) as Rgb;
  });
}

/**
 * A photo's colour as light to tint white with, at the brightness of
 * white, so tinting changes the colour but not how bright it is. Each
 * channel is at most `saturation` (0–1) off white's, however vivid or
 * dark the photo, so the light is never garish.
 */
function tint(colour: Rgb, saturation: number): Rgb {
  const luma = Math.max(
    0.2126 * colour[0] + 0.7152 * colour[1] + 0.0722 * colour[2],
    0.01
  );
  return colour.map((c) => {
    const off = Math.min(1, Math.max(-1, (c - luma) / luma));
    return 1 + off * saturation;
  }) as Rgb;
}

/**
 * A value at `time` (seconds) wandering smoothly between `min` and `max`,
 * to a new random one every `seconds`, slowly enough that it never flashes.
 * `shape` bends the randomness: above 1, it mostly stays near `min`.
 */
function drift(
  time: number,
  seconds: number,
  { min, max }: { min: number; max: number },
  shape = 1,
  seed = 0
): number {
  const t = time / seconds;
  const i = Math.floor(t);
  const f = t - i;
  const ease = f * f * (3 - 2 * f);
  const a = random(i + seed) ** shape;
  const b = random(i + 1 + seed) ** shape;
  return min + (max - min) * (a + (b - a) * ease);
}

/**
 * How much static covers the photo at `time`: mostly a little, now and
 * then fading up to hide it and back.
 */
function staticAmount(time: number, config: CrtCollage['static']): number {
  return drift(time, config.seconds, config, config.shape, 1000);
}

/** A repeatable random number, 0–1, for an integer. */
function random(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** "#d4b4ff" → [0.83, 0.71, 1]. */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
