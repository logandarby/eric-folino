// Makes the collage video, played on the enter page's TV and the home
// page's bus stop screen: the images in assets-src/tv-collage/, each
// cropped to the TV screen's shape and laid side by side in one image (an
// atlas), which the screens cut between like a video (see
// src/components/collage-video/). Run with `npm run tv:collage` whenever
// they change. Output is committed, like the TV's photo.
//
// The order is random but seeded, so the same images always play the same
// way. Change SEED for another order.

import { readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SOURCE_DIR = fileURLToPath(
  new URL('../assets-src/tv-collage/', import.meta.url)
);
const OUT_DIR = fileURLToPath(
  new URL('../src/components/collage-video/', import.meta.url)
);

/** One frame, the TV screen's shape (see src/pages/enter/tv/tv.json), about 4:3. */
const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 490;
/** Frames across the atlas; it stays within 4096px, which every GPU takes. */
const COLUMNS = 5;
const SEED = 3;
const WEBP = { quality: 82, effort: 6 };

async function main() {
  const files = (await readdir(SOURCE_DIR)).filter((f) =>
    /\.(png|jpe?g|webp|tiff?)$/i.test(f)
  );
  if (files.length === 0) throw new Error(`No images in ${SOURCE_DIR}`);
  const order = shuffle(files.sort(), mulberry32(SEED));
  const columns = Math.min(COLUMNS, order.length);
  const rows = Math.ceil(order.length / columns);

  const frames = await Promise.all(
    order.map(async (file, i) => ({
      input: await sharp(SOURCE_DIR + file, { page: 0 })
        .resize(FRAME_WIDTH, FRAME_HEIGHT, { fit: 'cover' })
        .png()
        .toBuffer(),
      left: (i % columns) * FRAME_WIDTH,
      top: Math.floor(i / columns) * FRAME_HEIGHT,
    }))
  );
  await sharp({
    create: {
      width: columns * FRAME_WIDTH,
      height: rows * FRAME_HEIGHT,
      channels: 3,
      background: '#000',
    },
  })
    .composite(frames)
    .webp(WEBP)
    .toFile(`${OUT_DIR}collage.webp`);
  await writeFile(
    `${OUT_DIR}collage.json`,
    `${JSON.stringify({ columns, rows, count: order.length, order }, null, 2)}\n`
  );
  console.log(`Wrote collage.webp: ${order.join(', ')}`);
}

/** A seeded random number generator, 0–1. */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

await main();
