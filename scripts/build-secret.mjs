// Makes the secret page's art from assets-src/secret/. Run with
// `npm run secret` whenever one of them changes. Output is committed, like
// the background's.
//
// - fridge.webp and tv.webp: trimmed to what's in them (the sources have
//   see-through space around), and shrunk if they're big;
// - moon-panorama.jpg: shrunk to MOON_HEIGHT tall, as the page pans
//   across it (secret.css) and dithers it into chunky pixels anyway.
//
// Their sizes go to art.json, for the page's layout.

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SOURCE_DIR = fileURLToPath(
  new URL('../assets-src/secret/', import.meta.url)
);
const OUT_DIR = fileURLToPath(
  new URL('../src/pages/secret/art/', import.meta.url)
);

/** The moon's height. Even a 4K screen's dither is coarser than this. */
const MOON_HEIGHT = 720;
/** The most the fridge and TV are across; they're never shown bigger. */
const MAX_WIDTH = 1000;

const WEBP = { quality: 72, alphaQuality: 90, effort: 6 };
// The moon is most of what the page downloads, and grainy already.
const MOON_WEBP = { quality: 55, effort: 6 };

/** A progress bar on one line, for steps that each take a while. */
function progress(total) {
  let done = 0;
  const draw = (label) => {
    const width = 30;
    const filled = Math.round((done / total) * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    const percent = String(Math.round((done / total) * 100)).padStart(3);
    process.stdout.write(`\r\x1b[K${bar} ${percent}%  ${label}`);
  };
  return {
    /** Shows `label` as the step under way. */
    start: draw,
    /** Marks a step done. */
    step(label) {
      done++;
      draw(label);
      if (done === total) process.stdout.write('\n');
    },
  };
}

/** Trims see-through edges, shrinks to `MAX_WIDTH` and writes a webp. */
async function cutOut(name) {
  const { data, info } = await sharp(SOURCE_DIR + name)
    .trim({ threshold: 0 })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp(WEBP)
    .toBuffer({ resolveWithObject: true });
  await writeFile(OUT_DIR + name, data);
  return { width: info.width, height: info.height };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const bar = progress(4);

  bar.start('fridge');
  const fridge = await cutOut('fridge.webp');
  bar.step('tv');
  const tv = await cutOut('tv.webp');
  bar.step('moon (the slow one)');
  const info = await sharp(SOURCE_DIR + 'moon-panorama.jpg', {
    limitInputPixels: false,
  })
    .resize({ height: MOON_HEIGHT })
    .webp(MOON_WEBP)
    .toFile(OUT_DIR + 'moon.webp');
  const moon = { width: info.width, height: info.height };
  bar.step('art.json');
  await writeFile(
    OUT_DIR + 'art.json',
    JSON.stringify({ fridge, tv, moon }, null, 2) + '\n'
  );
  bar.step('done');

  console.log(
    `fridge ${fridge.width}×${fridge.height}, tv ${tv.width}×${tv.height},` +
      ` moon ${moon.width}×${moon.height}`
  );
}

await main();
