// Makes the enter page's TV photo from assets-src/strange-tv.png. Run with
// `npm run tv` whenever that image changes. Output is committed, like the
// background's.
//
// The photo has a transparent hole where the TV's screen is; the page
// plays the screen behind it. This finds the hole and writes its place to
// tv.json, with the two crops it makes:
//
// - landscape: the whole photo, at several widths;
// - portrait: a tall crop around the TV for phones, so they never fetch
//   the whole wide photo just to show its middle.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SOURCE = fileURLToPath(
  new URL('../assets-src/strange-tv.png', import.meta.url)
);
const OUT_DIR = fileURLToPath(
  new URL('../src/pages/enter/tv/', import.meta.url)
);

const LANDSCAPE_WIDTHS = [960, 1440, 1920, 2560, 3200];
/** Capped at the crop's own width. */
const PORTRAIT_WIDTHS = [720, 1080, 1440];
const PORTRAIT_ASPECT = 9 / 16;
/** Share of the photo's height cut from the top and bottom of the portrait crop. */
const PORTRAIT_TRIM = 0.02;
const PLACEHOLDER_WIDTH = 32;

/** Pixels at least this transparent count as hole. */
const HOLE_ALPHA = 128;

// Lower than the background's: the film grain is costly to keep, and the
// shapes survive it going soft.
const AVIF = { quality: 40, effort: 6 };
const WEBP = { quality: 60, alphaQuality: 90, effort: 6 };

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const { width, height } = await sharp(SOURCE).metadata();
  if (!width || !height) throw new Error('Could not read source dimensions');
  const screen = await findHole(width, height);

  // The portrait crop is centred on the screen, as far as the photo allows,
  // and leaves out the print's border at the top and bottom.
  const cropTop = Math.round(height * PORTRAIT_TRIM);
  const cropHeight = height - 2 * cropTop;
  const cropWidth = Math.min(width, Math.round(cropHeight * PORTRAIT_ASPECT));
  const cropLeft = Math.min(
    width - cropWidth,
    Math.max(0, Math.round(screen.x + screen.width / 2 - cropWidth / 2))
  );
  const crops = {
    landscape: { left: 0, top: 0, width, height },
    portrait: {
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
    },
  };

  const jobs = [];
  for (const [name, crop] of Object.entries(crops)) {
    const widths = name === 'landscape' ? LANDSCAPE_WIDTHS : PORTRAIT_WIDTHS;
    for (const w of new Set(widths.map((w) => Math.min(w, crop.width)))) {
      const resized = () => sharp(SOURCE).extract(crop).resize({ width: w });
      jobs.push(write(resized().avif(AVIF), `${name}-${w}.avif`));
      jobs.push(write(resized().webp(WEBP), `${name}-${w}.webp`));
    }
    jobs.push(
      write(
        sharp(SOURCE)
          .extract(crop)
          .resize({ width: PLACEHOLDER_WIDTH })
          .blur(1)
          .webp({ quality: 40 }),
        `${name}-placeholder.webp`
      )
    );
  }
  for (const line of await Promise.all(jobs)) console.log(line);

  await writeFile(
    `${OUT_DIR}tv.json`,
    `${JSON.stringify({ width, height, screen, crops }, null, 2)}\n`
  );
  console.log(`Screen hole at ${JSON.stringify(screen)}`);
}

/**
 * The bounding box of the transparent pixels the photo surrounds, found
 * by filling the transparency that touches the edges and taking what's
 * left.
 */
async function findHole(width, height) {
  const { data } = await sharp(SOURCE)
    .ensureAlpha()
    .extractChannel('alpha')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const clear = (i) => data[i] < HOLE_ALPHA;
  const outside = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || !clear(i)) continue;
    outside[i] = 1;
    const x = i % width;
    if (x > 0) stack.push(i - 1);
    if (x < width - 1) stack.push(i + 1);
    if (i >= width) stack.push(i - width);
    if (i < width * (height - 1)) stack.push(i + width);
  }
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0; i < width * height; i++) {
    if (outside[i] || !clear(i)) continue;
    const x = i % width;
    const y = (i - x) / width;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  if (x1 < 0) throw new Error('The TV photo has no transparent screen hole');
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

async function write(pipeline, name) {
  const info = await pipeline.toFile(`${OUT_DIR}${name}`);
  return `${name}  ${Math.round(info.size / 1024)} KB`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
