// Inks the tarot symbols: each line drawing in new_design_docs/Tarot_Symbols/
// redrawn as if in ink, bled into the page, as a WebP. Run with `npm run ink`
// (every symbol), or name some:
//
//   npm run ink -- the_brain the_teeth
//
// They're written to new_design_docs/ink/, on transparency, with copies
// on white in new_design_docs/ink/preview/. The bleed is the old Photoshop
// trick: the line is blurred, then displaced by Gaussian noise, which
// scatters its soft edge into a feathery fringe, then thresholded to lock
// it in as solid ink. Every look below is a setting in INK, so they're tweaked
// here, then run again. Each symbol gets its own noise (seeded by its
// name), so no two bleed alike.

import { mkdir, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SOURCE_DIR = new URL(
  '../new_design_docs/Tarot_Symbols/',
  import.meta.url
);
const OUT_DIR = new URL('../new_design_docs/ink/', import.meta.url);

/** Pixels out per unit of the symbols' viewBox (1032 × 787). */
const SCALE = 2;

/** The ink and the hand that put it down. */
const INK = {
  /** Brown-black, as old iron-gall ink fades to. */
  color: '#2a1d12',
  /** The line's width, in viewBox units. The sources are 1 wide. */
  width: 20,
  /** The hand: how far lines wander off true, and how broadly (viewBox units). */
  wobble: { scale: 10, frequency: 0.012 },
  /** How far the line is blurred before it's displaced, in pixels out. */
  blur: 6,
  /**
   * The Gaussian noise it's displaced by: how far (in pixels out, at one
   * standard deviation), and how much it's blurred first (0 is pixel-fine
   * speckle; higher clumps it into fibres).
   */
  displace: { scale: 4, clump: 1.2 },
  /**
   * The threshold after, that locks the bleed in: where the displaced
   * line's opacity (0–1) is over it is solid ink, and under, bare page.
   * Lower bleeds further out, and higher keeps closer to the line.
   */
  threshold: 0.1,
  /** A last softening of the threshold's edge, in pixels out. 0 for none. */
  soften: 0.6,
};

const WEBP = { quality: 88, effort: 6 };

/**
 * Each is also written flattened on this colour, to preview/, to look at
 * without the transparency. Null for none.
 */
const PREVIEW = '#ffffff';

const names = process.argv.slice(2);
const files = names.length
  ? names.map((name) => `${name.replace(/\.svg$/, '')}.svg`)
  : (await readdir(SOURCE_DIR)).filter((f) => f.endsWith('.svg')).sort();

await mkdir(new URL('preview/', OUT_DIR), { recursive: true });
for (const file of files) {
  const name = file.replace(/\.svg$/, '');
  const source = await readFile(new URL(file, SOURCE_DIR), 'utf8');
  const image = await inked(source, seedOf(name));
  await sharp(image)
    .webp(WEBP)
    .toFile(fileURLToPath(new URL(`${name}.webp`, OUT_DIR)));
  if (PREVIEW) {
    await sharp(image)
      .flatten({ background: PREVIEW })
      .webp(WEBP)
      .toFile(fileURLToPath(new URL(`preview/${name}.webp`, OUT_DIR)));
  }
  console.log(`Inked ${name}`);
}

/** The symbol's paths, redrawn in ink, on transparency, as a PNG. */
async function inked(source, seed) {
  const viewBox = /viewBox="([^"]+)"/.exec(source)?.[1] ?? '0 0 1032 787';
  const [, , vw, vh] = viewBox.split(/\s+/).map(Number);
  const paths = [...source.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!paths.length) throw new Error('No paths in it');
  const width = Math.round(vw * SCALE);
  const height = Math.round(vh * SCALE);
  const raw = { width, height, channels: 1 };

  // The line, wobbled by the hand, blurred.
  const line = await sharp(
    Buffer.from(drawn(viewBox, width, height, paths, seed))
  )
    .extractChannel('alpha')
    .blur(INK.blur)
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  // Gaussian noise, one field for each direction.
  const random = mulberry32(seed);
  const field = async () => {
    // At one standard deviation, it's 32 off the middle.
    const noise = new Uint8ClampedArray(width * height);
    for (let i = 0; i < noise.length; i++)
      noise[i] = 128 + 32 * gaussian(random);
    if (!INK.displace.clump) return noise;
    // Blurring it narrows it, so it's stretched back to its deviation.
    const clumped = await sharp(Buffer.from(noise.buffer), { raw })
      .blur(INK.displace.clump)
      .toColourspace('b-w')
      .raw()
      .toBuffer();
    return restretch(clumped);
  };
  const dx = await field();
  const dy = await field();

  // Each pixel takes the blurred line's from where the noise points, then
  // it's thresholded.
  const { scale } = INK.displace;
  const cut = INK.threshold * 255;
  const alpha = Buffer.alloc(width * height);
  for (let y = 0, i = 0; y < height; y++) {
    for (let x = 0; x < width; x++, i++) {
      const a = sample(
        line,
        width,
        height,
        x + ((dx[i] - 128) / 32) * scale,
        y + ((dy[i] - 128) / 32) * scale
      );
      alpha[i] = a > cut ? 255 : 0;
    }
  }
  const soft = INK.soften
    ? await sharp(alpha, { raw })
        .blur(INK.soften)
        .toColourspace('b-w')
        .raw()
        .toBuffer()
    : alpha;

  const [r, g, b] = [1, 3, 5].map((at) =>
    parseInt(INK.color.slice(at, at + 2), 16)
  );
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < soft.length; i++) {
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = soft[i];
  }
  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

/** The paths as clean strokes, wobbled by the hand, as an SVG. */
function drawn(viewBox, width, height, paths, seed) {
  const { wobble } = INK;
  const lines = paths
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="#000" stroke-width="${INK.width}" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">
<filter id="hand" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency="${wobble.frequency}" numOctaves="2" seed="${seed}"/>
  <feDisplacementMap in="SourceGraphic" scale="${wobble.scale}" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<g filter="url(#hand)">
${lines}
</g>
</svg>`;
}

/** `values` at (x, y), between its pixels; 0 off its edges. */
function sample(values, width, height, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (px, py) =>
    px < 0 || py < 0 || px >= width || py >= height
      ? 0
      : values[py * width + px];
  const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
  const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

/** Noise round 128, stretched back to a standard deviation of 32. */
function restretch(noise) {
  let sum = 0;
  for (const v of noise) sum += (v - 128) ** 2;
  const k = 32 / Math.sqrt(sum / noise.length);
  return Float32Array.from(noise, (v) => 128 + (v - 128) * k);
}

/** A standard normal number, from `random` (Box–Muller). */
function gaussian(random) {
  return (
    Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
  );
}

/** A seeded random number generator, 0–1. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed from a name, so each symbol's noise is its own, every run. */
function seedOf(name) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % 9973;
  return hash;
}
