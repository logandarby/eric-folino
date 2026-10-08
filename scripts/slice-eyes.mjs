// Cuts the four eyes for the iris page out of the layered sources in
// assets-src/eyes/. Run with `npm run eyes` whenever those images change.
// Output is committed, like the background's.
//
// Each eye becomes one image holding its three layers stacked top to
// bottom (base, iris, skin), so the page loads one file per eye and the
// shader reads every layer from one texture.

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SOURCE_DIR = new URL('../assets-src/eyes/', import.meta.url);
const OUT_DIR = new URL('../src/pages/iris/eyes/', import.meta.url);

/** The layers, bottom to top. Every source is the same size. */
const LAYERS = ['base', 'iris', 'skin'];

/**
 * Where each eye sits in the sources, in pixels. The eyes touch in the
 * sources, so these stay a couple of pixels clear of the seams.
 */
const EYES = [
  { left: 4, top: 2, width: 542, height: 286 },
  { left: 4, top: 294, width: 542, height: 299 },
  { left: 4, top: 601, width: 542, height: 295 },
  { left: 554, top: 601, width: 524, height: 295 },
];

/** The irises' size, as a share of the source's, shrunk about their centres. */
const IRIS_SCALE = 2 / 3;

const WEBP = { quality: 90, alphaQuality: 100, effort: 6 };

await mkdir(OUT_DIR, { recursive: true });

const sizes = await Promise.all(
  EYES.map(async (rect, i) => {
    const layers = await Promise.all(
      LAYERS.map(async (name) => {
        const layer = await sharp(
          fileURLToPath(new URL(`${name}.png`, SOURCE_DIR))
        )
          .extract(rect)
          .png()
          .toBuffer();
        return name === 'iris' ? shrink(layer, rect, IRIS_SCALE) : layer;
      })
    );
    await sharp({
      create: {
        width: rect.width,
        height: rect.height * LAYERS.length,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(
        layers.map((input, layer) => ({
          input,
          left: 0,
          top: layer * rect.height,
        }))
      )
      .webp(WEBP)
      .toFile(fileURLToPath(new URL(`eye-${i + 1}.webp`, OUT_DIR)));
    return { width: rect.width, height: rect.height };
  })
);

/**
 * Shrinks the picture in a transparent layer about its centre (weighted
 * by opacity), keeping the layer's size.
 */
async function shrink(layer, { width, height }, scale) {
  const { data } = await sharp(layer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let total = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      total += alpha;
      sumX += alpha * x;
      sumY += alpha * y;
    }
  }
  const cx = total ? sumX / total : width / 2;
  const cy = total ? sumY / total : height / 2;
  const small = await sharp(layer)
    .resize(Math.round(width * scale), Math.round(height * scale))
    .png()
    .toBuffer();
  return sharp({
    create: { width, height, channels: 4, background: '#0000' },
  })
    .composite([
      {
        input: small,
        left: Math.round(cx * (1 - scale)),
        top: Math.round(cy * (1 - scale)),
      },
    ])
    .png()
    .toBuffer();
}

await writeFile(
  new URL('eyes.json', OUT_DIR),
  `${JSON.stringify(sizes, null, 2)}\n`
);
console.log(`Wrote ${EYES.length} eyes to ${fileURLToPath(OUT_DIR)}`);
