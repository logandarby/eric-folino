import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { raw, type Child } from '../../../build/jsx/jsx-runtime.ts';
import { siteConfig } from '../../site/site.config.ts';

const BG_DIR = new URL('../../assets/bg/', import.meta.url);
/** Where the images are served from (Vite hashes and bundles them). */
const BG_URL = '/src/assets/bg';

/**
 * The bus stop photo, with portrait and landscape crops in AVIF and WebP
 * at several widths, and the "lights off" copy that LightFlicker
 * (light-flicker.ts) fades in. Tiny blurred placeholders show until the
 * real image arrives.
 */
export function Background() {
  stylesheet(import.meta.url, './background.css');
  const files = readdirSync(BG_DIR);
  const dataUri = (name: string) =>
    `data:image/webp;base64,${readFileSync(new URL(name, BG_DIR)).toString('base64')}`;
  const { portraitQuery } = siteConfig.background;
  return (
    <>
      <style>
        {raw(
          `.background{background-image:url(${dataUri('landscape-placeholder.webp')})}@media ${portraitQuery}{.background{background-image:url(${dataUri('portrait-placeholder.webp')})}}`
        )}
      </style>
      <picture
        class="background"
        data-background
        data-page-root
        aria-hidden="true"
      >
        {sources(files, '')}
        <img
          src={`${BG_URL}/landscape-fallback.jpg`}
          alt=""
          fetchpriority="high"
          decoding="async"
        />
      </picture>
      <picture class="lights-off" data-lights-off aria-hidden="true">
        {sources(files, 'lightsoff-')}
        <img
          src={`${BG_URL}/lightsoff-landscape-1280.webp`}
          alt=""
          fetchpriority="low"
          decoding="async"
        />
      </picture>
    </>
  );
}

/** Portrait and landscape <source>s for the images named `${prefix}${crop}-${width}.${ext}`. */
function sources(files: string[], prefix: string) {
  const { portraitQuery, landscapeZoom, portraitZoom } = siteConfig.background;
  const srcset = (crop: string, ext: string) =>
    files
      .map((f) => new RegExp(`^${prefix}${crop}-(\\d+)\\.${ext}$`).exec(f))
      .filter((m): m is RegExpExecArray => m !== null)
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .map((m) => `${BG_URL}/${m[0]} ${m[1]}w`)
      .join(', ');

  return (['portrait', 'landscape'] as const).flatMap((crop) =>
    (['avif', 'webp'] as const).map((ext) => (
      <source
        type={`image/${ext}`}
        sizes={`${Math.ceil((crop === 'portrait' ? portraitZoom : landscapeZoom) * 100)}vw`}
        srcset={srcset(crop, ext)}
        media={crop === 'portrait' ? portraitQuery : undefined}
      />
    ))
  );
}

interface PhotoCrop {
  aspect: number;
  /** Percentages of the crop. */
  screen: { x: number; y: number; width: number; height: number };
}

/**
 * A layer framed exactly like the background photo (see background.css),
 * for things that sit on it, like the bus stop screen's player. Inside,
 * --spot-x, --spot-y, --spot-w and --spot-h are where the screen is in
 * whichever crop is showing (from photo.json, made by `npm run images`),
 * as percentages of the photo.
 *
 * It's over the stage, so what's on it can be pressed. A layer `below` it
 * is under the stage instead, for light that mustn't cover the nav.
 */
export function PhotoLayer({
  children,
  below = false,
}: {
  children: Child;
  below?: boolean;
}) {
  const photo = JSON.parse(
    readFileSync(fileURLToPath(new URL('photo.json', BG_DIR)), 'utf8')
  ) as Record<'landscape' | 'portrait', PhotoCrop>;
  const vars = ({ aspect, screen }: PhotoCrop) =>
    `--photo-ar:${aspect};--spot-x:${screen.x}%;--spot-y:${screen.y}%;--spot-w:${screen.width}%;--spot-h:${screen.height}%`;
  const { portraitQuery } = siteConfig.background;
  return (
    <>
      <style>
        {raw(
          `.hotspots{${vars(photo.landscape)}}@media ${portraitQuery}{.hotspots{${vars(photo.portrait)}}}`
        )}
      </style>
      <div
        class={below ? 'hotspots hotspots--below' : 'hotspots'}
        data-hotspots
      >
        <div class="hotspots__frame">
          <div class="hotspots__photo">{children}</div>
        </div>
      </div>
    </>
  );
}
