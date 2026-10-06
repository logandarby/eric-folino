/**
 * Build-time HTML partials, rendered from src/site.config.ts so the first
 * paint already has the final markup (no layout shift, works without JS,
 * crawlable). Used by the site-pages Vite plugin.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  faVolumeHigh,
  faVolumeXmark,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { letterColor } from '../src/components/letter-color.ts';
import { blobShape, roundedPathData } from '../src/svg/blob-shape.ts';
import {
  siteConfig,
  type LayoutName,
  type PageConfig,
  type TextPlacement,
} from '../src/site.config.ts';

export interface TemplateContext {
  root: string;
  page: PageConfig;
}

const LAYOUTS: LayoutName[] = ['wide', 'compact'];
const BG_DIR = 'src/assets/bg';
const BLOB_DIR = 'src/assets/blobs';

export const templates: Record<string, (ctx: TemplateContext) => string> = {
  head,
  background,
  hero,
};

export function findPage(id: string): PageConfig {
  const page = siteConfig.pages.find((p) => p.id === id);
  if (!page) throw new Error(`No page "${id}" in site.config.ts`);
  return page;
}

/** HTML file for a page path: "/" → "index.html", "/about/" → "about/index.html". */
export function pageFile(page: PageConfig): string {
  const path = page.path.replace(/^\//, '');
  return path === '' || path.endsWith('/') ? `${path}index.html` : path;
}

// head ----------------------------------------------------------------------

function head({ page }: TemplateContext): string {
  const { siteName, siteUrl, siteTagline } = siteConfig;
  const title = page.title
    ? `${page.title} | ${siteName}`
    : `${siteName} - ${siteTagline}`;
  const url = siteUrl + page.path;
  const image = `${siteUrl}/img/og-image.jpg`;
  const d = siteConfig.dialog;

  const layoutScript = `(()=>{const m=matchMedia(${JSON.stringify(
    siteConfig.layout.compactQuery
  )}),d=document.documentElement,s=()=>{d.dataset.layout=m.matches?'compact':'wide'};s();m.addEventListener('change',s)})()`;

  const jsonLd =
    page.id === 'home'
      ? `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: siteName,
          jobTitle: 'Musician',
          url: `${siteUrl}/`,
          image,
        })}</script>`
      : '';

  return `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <meta name="author" content="${esc(siteName)}" />
    <meta name="robots" content="${page.noindex ? 'noindex' : 'index, follow'}" />
    ${page.noindex ? '' : `<link rel="canonical" href="${esc(url)}" />`}
    <meta name="theme-color" content="#000000" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(page.description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/favicon.png" />
    <script>${layoutScript}</script>
    <style>:root{--dialog-max-w:${d.maxWidth}px;--dialog-margin:${d.viewportMargin}px;--dim-opacity:${d.dimOpacity};--dim-blur:${d.blurPx}px;--bg-zoom:${siteConfig.background.landscapeZoom};--bg-focus:${siteConfig.background.landscapeFocus};${focusVars(siteConfig.background.landscapeFocus)}--title-tilt:${siteConfig.titleTiltDeg}deg}${textEffectStyles()}</style>
    ${jsonLd}`;
}

/**
 * Text effect tuning as CSS variables (used by text-effects.css), plus the
 * rainbow keyframes, which list the palette backwards so colours travel
 * forward through the letters like the title's.
 */
const FX_ROOM_SLACK_EM = 0.1;

function textEffectStyles(): string {
  const { wave, float, shake } = siteConfig.animation.textEffects;
  const { palette } = siteConfig;
  const interval = siteConfig.animation.titleColorCycleIntervalMs;
  // Room around dialog text for letters to move into without scrolling:
  // the largest movement, plus slack for {float}'s sway (rotating a letter
  // lifts its corners) and sub-pixel rounding. Even a fraction of a pixel
  // of overflow can make a scrollbar flicker on and off.
  const room =
    Math.max(wave.amplitudeEm, float.amplitudeEm, shake.amplitudeEm) +
    FX_ROOM_SLACK_EM;
  const vars = cssVars({
    'wave-period': `${wave.periodMs}ms`,
    'wave-amp': `${wave.amplitudeEm}em`,
    'wave-stagger': `${wave.staggerMs}ms`,
    'float-period': `${float.periodMs}ms`,
    'float-amp': `${float.amplitudeEm}em`,
    'float-stagger': `${float.staggerMs}ms`,
    'shake-interval': `${shake.intervalMs}ms`,
    'shake-amp': `${shake.amplitudeEm}em`,
    'rainbow-cycle': `${palette.length * interval}ms`,
    'fx-room': `${room}em`,
  });
  const frames = palette
    .map((_, k) => {
      const color = palette[(palette.length - k) % palette.length];
      return `${((k / palette.length) * 100).toFixed(3)}%{color:${color}}`;
    })
    .join('');
  return `:root{${vars}}@keyframes text-rainbow{${frames}100%{color:${palette[0]}}}`;
}

// background ----------------------------------------------------------------

function background({ root }: TemplateContext): string {
  const dir = resolve(root, BG_DIR);
  const files = readdirSync(dir);
  const dataUri = (name: string) =>
    `data:image/webp;base64,${readFileSync(resolve(dir, name)).toString('base64')}`;
  const { portraitQuery } = siteConfig.background;

  // Tiny blurred placeholders show until the real image arrives.
  return `
    <style>.background{background-image:url(${dataUri('landscape-placeholder.webp')})}@media ${portraitQuery}{.background{background-image:url(${dataUri('portrait-placeholder.webp')})}}</style>
    <picture class="background" data-background aria-hidden="true">
      ${bgSources(files, '').join('\n      ')}
      <img src="/${BG_DIR}/landscape-fallback.jpg" alt="" fetchpriority="high" decoding="async" />
    </picture>
    <picture class="lights-off" data-lights-off aria-hidden="true">
      ${bgSources(files, 'lightsoff-').join('\n      ')}
      <img src="/${BG_DIR}/lightsoff-landscape-1280.webp" alt="" fetchpriority="low" decoding="async" />
    </picture>`;
}

/** Portrait and landscape <source>s for the images named `${prefix}${crop}-${width}.${ext}`. */
function bgSources(files: string[], prefix: string): string[] {
  const { portraitQuery, landscapeZoom } = siteConfig.background;
  const srcset = (crop: string, ext: string) =>
    files
      .map((f) => new RegExp(`^${prefix}${crop}-(\\d+)\\.${ext}$`).exec(f))
      .filter((m): m is RegExpExecArray => m !== null)
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .map((m) => `/${BG_DIR}/${m[0]} ${m[1]}w`)
      .join(', ');

  return (['portrait', 'landscape'] as const).flatMap((crop) =>
    (['avif', 'webp'] as const).map(
      (ext) =>
        `<source type="image/${ext}" sizes="${crop === 'portrait' ? 100 : Math.ceil(landscapeZoom * 100)}vw" srcset="${srcset(crop, ext)}"${
          crop === 'portrait' ? ` media="${esc(portraitQuery)}"` : ''
        } />`
    )
  );
}

// hero ----------------------------------------------------------------------

function hero({ root, page }: TemplateContext): string {
  const { stage } = siteConfig;
  const stageVars = cssVars(
    Object.fromEntries(
      LAYOUTS.flatMap((l) => [
        [`stage-w-${l}`, stage[l].width],
        [`stage-ar-${l}`, String(stage[l].aspectRatio)],
      ])
    )
  );

  const blobs = page.blobs
    ? siteConfig.blobs.map((_, i) => blobButton(root, i)).join('')
    : '';

  return `
    <div class="scene" data-scene data-page="${esc(page.id)}">
      <div class="stage" style="${stageVars}">
        ${title()}
        ${nav(page)}
        ${blobs}
      </div>
      ${page.blobs ? screenHotspot(root) : ''}
      ${page.blobs ? helpButton() : ''}
    </div>
    ${soundControl(Boolean(page.blobs))}`;
}

function title(): string {
  const text = siteConfig.title;
  let index = 0;
  const letters = [...text]
    .map((ch) =>
      ch === ' '
        ? ' '
        : `<span data-letter style="color:${letterColor(siteConfig.palette, index++, 0)}">${esc(ch)}</span>`
    )
    .join('');
  const vars = placementVars((l) => siteConfig.stage[l].title);
  return `<h1 class="title placed" style="${vars}" data-dialog-avoid><span class="title__box"><span class="sr-only">${esc(text)}</span><span class="title__text" aria-hidden="true" data-rainbow>${letters}</span></span></h1>`;
}

function nav(page: PageConfig): string {
  const items = siteConfig.nav
    .map((item) => {
      const target = siteConfig.pages.find((p) => p.path === item.href);
      // The page you're on is highlighted and has no href, so it can't be
      // clicked or tabbed to (that would only reload the page).
      const link =
        item.href === page.path
          ? 'aria-current="page"'
          : `href="${esc(item.href)}"`;
      return `<li><a class="nav__link" ${link} data-nav="${esc(target?.id ?? '')}" data-dialog-avoid>${esc(item.label)}</a></li>`;
    })
    .join('');
  const vars = placementVars((l) => siteConfig.stage[l].nav);
  return `<nav class="nav placed" style="${vars}" aria-label="Main"><ul>${items}</ul></nav>`;
}

function blobButton(root: string, index: number): string {
  const blob = siteConfig.blobs[index];
  const svg = readFileSync(resolve(root, BLOB_DIR, `${blob.svg}.svg`), 'utf8');
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  const d = /<path[^>]*\sd="([^"]+)"/.exec(svg)?.[1];
  const fill = /<path[^>]*\sfill="([^"]+)"/.exec(svg)?.[1] ?? 'currentColor';
  if (!viewBox || !d) {
    throw new Error(`${blob.svg}.svg needs a viewBox and a single <path d>`);
  }
  const { blobCornerRadius, blobMinPointSpacing } = siteConfig.animation;
  const vars = cssVars(
    Object.fromEntries(
      LAYOUTS.flatMap((l) => [
        [`x-${l}`, `${blob.position[l].x}%`],
        [`y-${l}`, `${blob.position[l].y}%`],
        [`w-${l}`, `${blob.width[l]}%`],
      ])
    )
  );
  return `
        <button type="button" class="blob placed" style="${vars};--blob-color:${esc(fill)}" data-blob="${index}" data-dialog-avoid="soft" aria-label="${esc(blob.label)}" aria-haspopup="dialog">
          <svg class="blob__svg" viewBox="${esc(viewBox)}" aria-hidden="true" focusable="false"><path d="${esc(roundedPathData(blobShape(d, blobMinPointSpacing).polygon, blobCornerRadius))}" data-shape="${esc(d)}" fill="${esc(fill)}" /></svg>
        </button>`;
}

/**
 * An invisible button over the bus stop screen. It sits in a layer framed
 * exactly like the background photo (see background.css), at the screen's
 * position in whichever crop is showing.
 */
function screenHotspot(root: string): string {
  const photo = JSON.parse(
    readFileSync(resolve(root, BG_DIR, 'photo.json'), 'utf8')
  ) as Record<'landscape' | 'portrait', PhotoCrop>;
  const vars = ({ aspect, screen }: PhotoCrop) =>
    `--photo-ar:${aspect};--spot-x:${screen.x}%;--spot-y:${screen.y}%;--spot-w:${screen.width}%;--spot-h:${screen.height}%`;
  const { portraitQuery } = siteConfig.background;
  return `
      <style>.hotspots{${vars(photo.landscape)}}@media ${portraitQuery}{.hotspots{${vars(photo.portrait)}}}</style>
      <div class="hotspots" data-hotspots>
        <div class="hotspots__frame">
          <div class="hotspots__photo">
            <button type="button" class="hotspot" data-screen data-sound="hum" aria-label="${esc(siteConfig.screen.label)}" aria-haspopup="dialog"></button>
          </div>
        </div>
      </div>`;
}

/** The "?" in the corner that hints there are secrets to click on. */
function helpButton(): string {
  return `
      <button type="button" class="corner corner-button help" data-help data-dialog-avoid aria-label="${esc(siteConfig.help.label)}" aria-haspopup="dialog"><span class="help__mark" aria-hidden="true">?</span></button>`;
}

/**
 * The speaker button beside the "?" (or in its place on pages without
 * one), with a volume slider that slides out on hover or focus. It sits
 * outside the scene so it still works while a dialog has the page inert.
 * Starts pressed to match the config default; the script corrects it from
 * the visitor's saved choice.
 */
function soundControl(afterHelp: boolean): string {
  const pressed = String(siteConfig.sound.enabledByDefault);
  const slot = afterHelp ? ' sound-control--after-help' : '';
  return `
    <div class="corner sound-control${slot}" data-sound-control>
      <button type="button" class="corner-button sound-toggle" data-sound-toggle data-dialog-avoid aria-label="Sound" aria-pressed="${pressed}" aria-keyshortcuts="M" title="Sound (M)">${icon(faVolumeHigh, 'sound-toggle__on')}${icon(faVolumeXmark, 'sound-toggle__off')}</button>
      <label class="sound-volume"><span class="sr-only">Volume</span><input type="range" min="0" max="100" step="5" value="100" data-sound-volume /></label>
      <span class="sr-only" role="status" data-sound-status></span>
    </div>`;
}

/** A Font Awesome icon as inline SVG (Font Awesome Free, CC BY 4.0). */
function icon(
  { icon: [width, height, , , path] }: IconDefinition,
  cls: string
): string {
  const d = Array.isArray(path) ? path.join(' ') : path;
  return `<svg class="${cls}" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false"><path fill="currentColor" d="${esc(d)}" /></svg>`;
}

interface PhotoCrop {
  aspect: number;
  /** Percentages of the crop. */
  screen: { x: number; y: number; width: number; height: number };
}

// helpers -------------------------------------------------------------------

function placementVars(get: (layout: LayoutName) => TextPlacement): string {
  return cssVars(
    Object.fromEntries(
      LAYOUTS.flatMap((l) => {
        const p = get(l);
        return [
          [`x-${l}`, `${p.x}%`],
          [`y-${l}`, `${p.y}%`],
          [`fs-${l}`, String(p.fontSize)],
          [`tx-${l}`, p.align === 'center' ? '-50%' : '0%'],
        ];
      })
    )
  );
}

/** "85% 97%" → "--bg-fx:0.85;--bg-fy:0.97", for maths in calc(). */
function focusVars(focus: string): string {
  const [x, y] = focus.split(/\s+/).map((v) => parseFloat(v) / 100);
  if (Number.isNaN(x) || Number.isNaN(y)) {
    throw new Error(`landscapeFocus must be two percentages, got "${focus}"`);
  }
  return `--bg-fx:${x};--bg-fy:${y};`;
}

const cssVars = (vars: Record<string, string>) =>
  Object.entries(vars)
    .map(([k, v]) => `--${k}:${v}`)
    .join(';');

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
