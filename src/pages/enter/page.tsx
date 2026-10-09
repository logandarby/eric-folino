import { readFileSync, readdirSync } from 'node:fs';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { raw } from '../../../build/jsx/jsx-runtime.ts';
import { Hotspot } from '../../components/hotspot/hotspot.tsx';
import { VoidLayout } from '../../layouts/void.tsx';
import { siteConfig } from '../../site/site.config.ts';
import page from './page.config.ts';

const TV_DIR = new URL('./tv/', import.meta.url);
/** Where the photo is served from (Vite hashes and bundles it). */
const TV_URL = '/src/pages/enter/tv';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Crop {
  left: number;
  top: number;
  width: number;
  height: number;
}
type CropName = 'landscape' | 'portrait';

/** How far the screen runs on under the TV's bezel, as a share of its size. */
const SCREEN_BLEED = 0.02;

/**
 * The TV in the corner of a room, a photo with a hole where the screen is.
 * The screen plays behind the hole (see collage-video.ts), and the TV is one big
 * invisible button that asks if you'd like to enter (see main.ts), as
 * does the "enter?" above it.
 *
 * The photo has two crops: on landscape screens all of it, sitting on the
 * page like a print; on portrait ones a tall crop around the TV that
 * fills the screen. Everything over it is placed in percentages of
 * whichever crop is showing, so it stays on its spot at every size.
 */
export default function EnterPage() {
  stylesheet(import.meta.url, './enter.css');
  const photo = JSON.parse(
    readFileSync(new URL('tv.json', TV_DIR), 'utf8')
  ) as {
    width: number;
    height: number;
    screen: Box;
    crops: Record<CropName, Crop>;
  };
  const files = readdirSync(TV_DIR);
  const { portraitQuery } = siteConfig.background;
  const { tv } = page;

  const bleed = {
    x: photo.screen.width * SCREEN_BLEED,
    y: photo.screen.height * SCREEN_BLEED,
  };
  const screen: Box = {
    x: photo.screen.x - bleed.x,
    y: photo.screen.y - bleed.y,
    width: photo.screen.width + 2 * bleed.x,
    height: photo.screen.height + 2 * bleed.y,
  };

  /** Where everything goes in one crop, as CSS variables. */
  const vars = (name: CropName) => {
    const crop = photo.crops[name];
    const placeholder = readFileSync(
      new URL(`${name}-placeholder.webp`, TV_DIR)
    );
    return [
      `--ar:${crop.width / crop.height}`,
      `--tv-share:${tv.body.width / crop.width}`,
      `--placeholder:url(data:image/webp;base64,${placeholder.toString('base64')})`,
      ...place('screen', screen, crop),
      ...place('spot', tv.body, crop),
    ].join(';');
  };

  return (
    <VoidLayout>
      <style>
        {raw(
          // Portrait screens: the crop covers the whole screen.
          `.tv{${vars('landscape')}}@media ${portraitQuery}{.tv{${vars('portrait')};--w:max(100cqw,100cqh * var(--ar))}}`
        )}
      </style>
      <div class="enter" style={{ '--cta-size': tv.cta.size }}>
        <div class="tv" data-tv>
          <div class="tv__screen" data-tv-screen></div>
          <picture class="tv__photo">
            {(['portrait', 'landscape'] as const).flatMap((crop) =>
              (['avif', 'webp'] as const).map((ext) => (
                <source
                  type={`image/${ext}`}
                  media={crop === 'portrait' ? portraitQuery : undefined}
                  sizes={
                    crop === 'portrait'
                      ? 'max(100vw, 56.25vh)'
                      : 'min(100vw, 149vh)'
                  }
                  srcset={srcset(files, crop, ext)}
                />
              ))
            )}
            <img
              src={`${TV_URL}/landscape-1440.webp`}
              alt="An old TV on a stool in the corner of an empty room"
              width={photo.width}
              height={photo.height}
              fetchpriority="high"
              decoding="async"
            />
          </picture>
          <Hotspot name="tv" label={tv.label} sound="hum" />
          <h1 class="tv__cta">
            <button type="button" class="tv__cta-button" data-tv-cta>
              {tv.cta.text}
            </button>
          </h1>
        </div>
      </div>
    </VoidLayout>
  );
}

/** `--<name>-x` and friends: `box` as percentages of `crop`. */
function place(name: string, box: Box, crop: Crop): string[] {
  const pct = (n: number) => `${+n.toFixed(3)}%`;
  return [
    `--${name}-x:${pct(((box.x - crop.left) / crop.width) * 100)}`,
    `--${name}-y:${pct(((box.y - crop.top) / crop.height) * 100)}`,
    `--${name}-w:${pct((box.width / crop.width) * 100)}`,
    `--${name}-h:${pct((box.height / crop.height) * 100)}`,
  ];
}

/** The srcset for the files named `${crop}-${width}.${ext}`. */
function srcset(files: string[], crop: CropName, ext: string): string {
  return files
    .map((f) => new RegExp(`^${crop}-(\\d+)\\.${ext}$`).exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map((m) => `${TV_URL}/${m[0]} ${m[1]}w`)
    .join(', ');
}
