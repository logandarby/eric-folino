// Generates responsive background variants from the full-size source image.
// Run with `npm run images` whenever assets-src/web-background.png changes.
// Output is committed so CI doesn't need to re-encode on every build.

import { mkdir, rm } from 'node:fs/promises';
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

  const jobs = [];
  for (const w of LANDSCAPE_WIDTHS) {
    jobs.push(encode(landscape, w, `landscape-${w}`, ['avif', 'webp']));
  }
  for (const w of PORTRAIT_WIDTHS) {
    jobs.push(encode(portrait, w, `portrait-${w}`, ['avif', 'webp']));
  }
  jobs.push(encode(landscape, FALLBACK_WIDTH, 'landscape-fallback', ['jpeg']));
  jobs.push(placeholder(landscape, 'landscape-placeholder'));
  jobs.push(placeholder(portrait, 'portrait-placeholder'));

  const results = await Promise.all(jobs);
  for (const line of results.flat()) console.log(line);
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
