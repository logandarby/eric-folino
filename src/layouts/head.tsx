import { raw } from '../../build/jsx/jsx-runtime.ts';
import { siteConfig } from '../site/site.config.ts';
import { socials } from '../site/socials.ts';
import type { PageConfig } from '../site/types.ts';

/**
 * Everything in <head> that every page shares: meta tags, the layout
 * script, and config values CSS needs, as variables.
 */
export function Head({ page }: { page: PageConfig }) {
  const { siteName, siteUrl, siteTagline } = siteConfig;
  const title = page.title
    ? `${page.title} | ${siteName}`
    : `${siteName} - ${siteTagline}`;
  const url = siteUrl + page.path;
  const image = `${siteUrl}/img/og-image.jpg`;
  const d = siteConfig.dialog;

  // Sets <html data-layout> before first paint, so CSS has it (and keeps
  // it in sync). src/core/layout.ts mirrors this for scripts.
  const layoutScript = `(()=>{const m=matchMedia(${JSON.stringify(
    siteConfig.layout.compactQuery
  )}),d=document.documentElement,s=()=>{d.dataset.layout=m.matches?'compact':'wide'};s();m.addEventListener('change',s)})()`;

  const rootVars = `:root{--dialog-max-w:${d.maxWidth}px;--dialog-margin:${d.viewportMargin}px;--dim-opacity:${d.dimOpacity};--dim-blur:${d.blurPx}px;--bg-zoom:${siteConfig.background.landscapeZoom};--bg-focus:${siteConfig.background.landscapeFocus};--bg-portrait-zoom:${siteConfig.background.portraitZoom};--bg-portrait-focus:${siteConfig.background.portraitFocus};${focusVars(siteConfig.background.landscapeFocus)}--title-tilt:${siteConfig.titleTiltDeg}deg}`;

  return (
    <>
      <meta charset="utf-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
      />
      <title>{title}</title>
      <meta name="description" content={page.description} />
      <meta name="author" content={siteName} />
      <meta
        name="robots"
        content={page.noindex ? 'noindex' : 'index, follow'}
      />
      {!page.noindex && <link rel="canonical" href={url} />}
      <meta name="theme-color" content="#000000" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={page.description} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={page.description} />
      <meta name="twitter:image" content={image} />
      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="apple-touch-icon" href="/favicon.png" />
      <script>{raw(layoutScript)}</script>
      <style>{raw(rootVars + textEffectStyles())}</style>
      {page.id === 'home' && (
        <script type="application/ld+json">
          {raw(
            safeJson({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: siteName,
              jobTitle: 'Musician',
              url: `${siteUrl}/`,
              image,
              // Tells search engines these profiles are the same person.
              sameAs: socials.map((s) => s.url),
            })
          )}
        </script>
      )}
    </>
  );
}

/** JSON that is safe inside a <script> element. */
export const safeJson = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c');

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
  const vars = Object.entries({
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
  })
    .map(([k, v]) => `--${k}:${v}`)
    .join(';');
  const frames = palette
    .map((_, k) => {
      const color = palette[(palette.length - k) % palette.length];
      return `${((k / palette.length) * 100).toFixed(3)}%{color:${color}}`;
    })
    .join('');
  return `:root{${vars}}@keyframes text-rainbow{${frames}100%{color:${palette[0]}}}`;
}

/** "85% 97%" → "--bg-fx:0.85;--bg-fy:0.97", for maths in calc(). */
function focusVars(focus: string): string {
  const [x, y] = focus.split(/\s+/).map((v) => parseFloat(v) / 100);
  if (Number.isNaN(x) || Number.isNaN(y)) {
    throw new Error(`landscapeFocus must be two percentages, got "${focus}"`);
  }
  return `--bg-fx:${x};--bg-fy:${y};`;
}
