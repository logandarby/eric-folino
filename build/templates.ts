/**
 * Build-time HTML partials, rendered from src/site.config.ts so the first
 * paint already has the final markup (no layout shift, works without JS,
 * crawlable). Used by the site-pages Vite plugin.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
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
    <style>:root{--dialog-max-w:${d.maxWidth}px;--dialog-margin:${d.viewportMargin}px;--dim-opacity:${d.dimOpacity};--dim-blur:${d.blurPx}px;--bg-zoom:${siteConfig.background.landscapeZoom};--bg-focus:${siteConfig.background.landscapeFocus};--title-tilt:${siteConfig.titleTiltDeg}deg}</style>
    ${jsonLd}`;
}

// background ----------------------------------------------------------------

function background({ root }: TemplateContext): string {
  const dir = resolve(root, BG_DIR);
  const files = readdirSync(dir);
  const srcset = (crop: string, ext: string) =>
    files
      .map((f) => new RegExp(`^${crop}-(\\d+)\\.${ext}$`).exec(f))
      .filter((m): m is RegExpExecArray => m !== null)
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .map((m) => `/${BG_DIR}/${m[0]} ${m[1]}w`)
      .join(', ');
  const dataUri = (name: string) =>
    `data:image/webp;base64,${readFileSync(resolve(dir, name)).toString('base64')}`;
  const { portraitQuery, landscapeZoom } = siteConfig.background;

  const sources = (['portrait', 'landscape'] as const).flatMap((crop) =>
    (['avif', 'webp'] as const).map(
      (ext) =>
        `<source type="image/${ext}" sizes="${crop === 'portrait' ? 100 : Math.ceil(landscapeZoom * 100)}vw" srcset="${srcset(crop, ext)}"${
          crop === 'portrait' ? ` media="${esc(portraitQuery)}"` : ''
        } />`
    )
  );

  // Tiny blurred placeholders show until the real image arrives.
  return `
    <style>.background{background-image:url(${dataUri('landscape-placeholder.webp')})}@media ${portraitQuery}{.background{background-image:url(${dataUri('portrait-placeholder.webp')})}}</style>
    <picture class="background" data-background aria-hidden="true">
      ${sources.join('\n      ')}
      <img src="/${BG_DIR}/landscape-fallback.jpg" alt="" fetchpriority="high" decoding="async" />
    </picture>`;
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
    </div>`;
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
      const current = item.href === page.path ? ' aria-current="page"' : '';
      return `<li><a class="nav__link" href="${esc(item.href)}" data-nav="${esc(target?.id ?? '')}" data-dialog-avoid${current}>${esc(item.label)}</a></li>`;
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
        <button type="button" class="blob placed" style="${vars};--blob-color:${esc(fill)}" data-blob="${index}" data-dialog-avoid aria-label="${esc(blob.label)}" aria-haspopup="dialog">
          <svg class="blob__svg" viewBox="${esc(viewBox)}" aria-hidden="true" focusable="false"><path d="${esc(roundedPathData(blobShape(d, blobMinPointSpacing).polygon, blobCornerRadius))}" data-shape="${esc(d)}" fill="${esc(fill)}" /></svg>
        </button>`;
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
