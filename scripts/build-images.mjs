// Generates responsive background variants from the full-size source image.
// Run with `npm run images` whenever assets-src/web-background.png changes.
// Output is committed so CI doesn't need to re-encode on every build.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SOURCE = fileURLToPath(
  new URL('../assets-src/web-background.png', import.meta.url)
);
const OUT_DIR = fileURLToPath(new URL('../src/assets/bg/', import.meta.url));

const LANDSCAPE_WIDTHS = [640, 1280, 1920, 2560, 3840];
const PORTRAIT_WIDTHS = [720, 1080, 1440];
const FALLBACK_WIDTH = 1920;
const PLACEHOLDER_WIDTH = 24;

// Horizontal focal point (0..1) of the portrait crop: the lit bus stop.
const PORTRAIT_FOCUS_X = 0.42;
const PORTRAIT_ASPECT = 9 / 16;

// "Lights off" overlay for the flickering bus stop ad (see LightFlicker).
// Same framing as the photo, transparent except where the pink light falls:
// there it's the photo darkened, so fading it in switches the light off.
// Regions are in source pixels.
const LIGHTS_OFF = {
  landscapeWidths: [1280, 2560],
  portraitWidths: [720, 1440],
  brightness: 0.09,
  // The light box itself (also the clickable screen, see photo.json):
  // fully covered, feathered outwards.
  panel: { x0: 1926, y0: 2386, x1: 2240, y1: 2866, feather: 160 },
  // Light spill on the pavement and road: covered where it's lit.
  spill: { cx: 2050, cy: 2950, rx: 1450, ry: 850, weight: 0.9 },
  litLuma: [0.015, 0.165],
  alphaBlur: 12,
};

const AVIF = { quality: 50, effort: 6 };
const WEBP = { quality: 72, effort: 6 };
const JPEG = { quality: 76, mozjpeg: true };

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const source = sharp(SOURCE);
  const { width, height } = await source.metadata();
  if (!width || !height) throw new Error('Could not read source dimensions');

  const cropWidth = Math.round(height * PORTRAIT_ASPECT);
  const cropLeft = Math.min(
    width - cropWidth,
    Math.max(0, Math.round(width * PORTRAIT_FOCUS_X - cropWidth / 2))
  );
  const portrait = () =>
    sharp(SOURCE).extract({
      left: cropLeft,
      top: 0,
      width: cropWidth,
      height,
    });
  const landscape = () => sharp(SOURCE);

  await writeFile(
    `${OUT_DIR}photo.json`,
    `${JSON.stringify(photoGeometry(width, height, cropLeft, cropWidth), null, 2)}\n`
  );

  const lightsOff = await lightsOffOverlay();
  const lightsOffLandscape = () =>
    sharp(lightsOff.data, { raw: lightsOff.info });
  const lightsOffPortrait = () =>
    lightsOffLandscape().extract({
      left: cropLeft,
      top: 0,
      width: cropWidth,
      height,
    });

  const jobs = [];
  for (const w of LANDSCAPE_WIDTHS) {
    jobs.push(encode(landscape, w, `landscape-${w}`, ['avif', 'webp']));
  }
  for (const w of PORTRAIT_WIDTHS) {
    jobs.push(encode(portrait, w, `portrait-${w}`, ['avif', 'webp']));
  }
  for (const w of LIGHTS_OFF.landscapeWidths) {
    jobs.push(
      encode(lightsOffLandscape, w, `lightsoff-landscape-${w}`, [
        'avif',
        'webp',
      ])
    );
  }
  for (const w of LIGHTS_OFF.portraitWidths) {
    jobs.push(
      encode(lightsOffPortrait, w, `lightsoff-portrait-${w}`, ['avif', 'webp'])
    );
  }
  jobs.push(encode(landscape, FALLBACK_WIDTH, 'landscape-fallback', ['jpeg']));
  jobs.push(placeholder(landscape, 'landscape-placeholder'));
  jobs.push(placeholder(portrait, 'portrait-placeholder'));

  const results = await Promise.all(jobs);
  for (const line of results.flat()) console.log(line);
}

/**
 * Aspect ratio of each crop and where the bus stop screen sits in it (as
 * percentages), so the page can put a button exactly over the screen.
 */
function photoGeometry(width, height, cropLeft, cropWidth) {
  const { x0, y0, x1, y1 } = LIGHTS_OFF.panel;
  const pct = (v, of) => Math.round((v / of) * 10000) / 100;
  const crop = (left, w) => ({
    aspect: Math.round((w / height) * 10000) / 10000,
    screen: {
      x: pct(x0 - left, w),
      y: pct(y0, height),
      width: pct(x1 - x0, w),
      height: pct(y1 - y0, height),
    },
  });
  return {
    landscape: crop(0, width),
    portrait: crop(cropLeft, cropWidth),
  };
}

async function encode(pipeline, width, name, formats) {
  return Promise.all(
    formats.map(async (format) => {
      const options = { avif: AVIF, webp: WEBP, jpeg: JPEG }[format];
      const ext = format === 'jpeg' ? 'jpg' : format;
      const file = `${OUT_DIR}${name}.${ext}`;
      const info = await pipeline()
        .resize({ width })
        [format](options)
        .toFile(file);
      return `${name}.${ext}  ${(info.size / 1024).toFixed(0)} KB`;
    })
  );
}

/** RGBA buffer of the darkened light, alpha = how much light to remove. */
async function lightsOffOverlay() {
  const { data, info } = await sharp(SOURCE)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const { panel, spill, brightness, litLuma, alphaBlur } = LIGHTS_OFF;
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const mask = Buffer.alloc(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const i = p * 3;
      const dx = Math.max(panel.x0 - x, 0, x - panel.x1);
      const dy = Math.max(panel.y0 - y, 0, y - panel.y1);
      const inPanel = 1 - smooth(Math.hypot(dx, dy) / panel.feather);

      const e = Math.hypot(
        (x - spill.cx) / spill.rx,
        (y - spill.cy) / spill.ry
      );
      const inSpill = spill.weight * (1 - smooth((e - 0.4) / 0.6));
      const luma =
        (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const lit = smooth((luma - litLuma[0]) / (litLuma[1] - litLuma[0]));

      mask[p] = Math.round(Math.max(inPanel, inSpill * lit) * 255);
    }
  }

  // Photo grain in the mask would make the alpha channel huge; blur it out.
  const alpha = await sharp(mask, { raw: { width, height, channels: 1 } })
    .blur(alphaBlur)
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  const out = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    // Leave fully transparent pixels black so they compress to nothing.
    if (!alpha[p]) continue;
    out[p * 4] = data[p * 3] * brightness;
    out[p * 4 + 1] = data[p * 3 + 1] * brightness;
    out[p * 4 + 2] = data[p * 3 + 2] * brightness;
    out[p * 4 + 3] = alpha[p];
  }
  return { data: out, info: { width, height, channels: 4 } };
}

async function placeholder(pipeline, name) {
  const file = `${OUT_DIR}${name}.webp`;
  const info = await pipeline()
    .resize({ width: PLACEHOLDER_WIDTH })
    .blur(1)
    .webp({ quality: 40 })
    .toFile(file);
  return `${name}.webp  ${info.size} B`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
