# ericfolino.com

A static site built with Vite and plain TypeScript (no UI framework), deployed to GitHub Pages.

## Commands

| Command                       | What it does                                           |
| ----------------------------- | ------------------------------------------------------ |
| `npm run dev`                 | Dev server with hot reload                             |
| `npm run build`               | Type-check and production build into `dist/`           |
| `SHOW_DRAFTS=1 npm run build` | The same, with draft pages built in full (for staging) |
| `npm run preview`             | Serve the production build locally                     |
| `npm test`                    | Unit tests (Vitest)                                    |
| `npm run lint`                | ESLint                                                 |
| `npm run format`              | Prettier                                               |
| `npm run images`              | Regenerate background variants from `assets-src/`      |
| `npm run check-circular`      | Fail on circular imports                               |

Requires Node 20.19+ (CI uses 22).

The pre-commit hook formats and lints staged files, then runs the type-check, tests and circular-import check. CI runs everything again, builds, and deploys `main`.

## Editing the site

- **`src/site/`**: settings for the whole site.
  - `site.config.ts`: title, nav, palette, the stage layout, animation timing, dialog spacing, dim and blur, breakpoints and background framing.
  - `socials.ts`: links to Eric's profiles (shown above the title on the home page and in the EPK).
  - `sound.config.ts` and `voices.ts`: sound tuning and dialog voices.
- **`src/pages/<page>/page.config.ts`**: one page's settings and text, like the home page's blobs and their dialogs.
- **`src/pages/epk/content/`**: the EPK's bio and interviews, in Markdown. Images in them (`![Alt text](./media/photo.jpg)`) are resized automatically at build time into AVIF and WebP at several widths, so add the full-size originals. The resized copies are cached in `node_modules/.cache/responsive-images/`.
- **`src/pages/epk/content/press/`**: press photos. Every image here appears in the EPK's press gallery, resized for the page, with a download of the full-size original at `/press/<file name>` (and a zip of them all once there's more than one). Alt text and photographer credits are optional, in `photoDetails` in the EPK's config.
- **Dialog text** can use effect tags; see [Dialog text effects](#dialog-text-effects).
- **`src/styles/tokens.css`**: colours, fonts and z-index order.
- **`src/assets/blobs/*.svg`**: blob shapes (one `<path>` each; the colour comes from its `fill`).
- **`assets-src/web-background.png`**: the full-size background. Run `npm run images` after changing it.

## Pages

Each page is a folder in `src/pages/`:

| File             | What it is                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `page.config.ts` | Title, description, path and the page's own settings (`definePage`) |
| `page.tsx`       | The markup, written in JSX and rendered to HTML at build time       |
| `main.ts`        | The browser script, if the page needs one                           |
| `*.css`          | The page's own styles, linked from `page.tsx` with `stylesheet()`   |

A page without `page.tsx` (like the 404) is a **placeholder**: the bus stop with a dialog from its `placeholder` setting.

**Drafts.** A page with `draft: true` is built in full only on the dev server and with `SHOW_DRAFTS=1`. Everywhere else, including the live site, it shows its placeholder. The About (EPK) and Secret pages are drafts for now; remove `draft` to publish one.

**Adding a page:** make its folder, add its config to `src/pages/pages.ts`, add it to `nav` in the site config if it belongs there, and add an HTML shell at its path (e.g. `shows/index.html`) holding just `<!-- @page shows -->`.

**Layouts** (`src/layouts/`) are the page skeletons a `page.tsx` wraps itself in:

- `StageLayout`: the bus stop scene, with the title and nav placed on a "stage" (home and placeholders).
- `DocumentLayout`: a normal scrolling page for reading (the EPK).
- `VoidLayout`: nothing at all, for pages that make their own rules (the secret page).

**Components** (`src/components/<name>/`) keep everything about one thing together. `name.tsx` renders its markup at build time (and links its `name.css`), and `name.ts` brings it to life in the browser. **`.tsx` files only ever run at build time; `.ts` files in `src/` run in the browser.**

**Islands** are components whose script loads only when needed. A page lists them in its `main.ts` with `hydrateIslands({ name: () => import(…) })`, and each `<div data-island="name">` fetches its code as it nears the screen. The video embed and the secret page's artworks work this way, so heavy code never slows down a page that doesn't show it.

**Shader art** goes in `src/pages/secret/pieces/<name>/`: a `.frag` shader plus a small island that runs it with `ShaderCanvas` (`src/gl/`). That takes care of resizing, pausing off-screen, a still frame under reduced motion and lost WebGL contexts. On the dev server it also warns if the picture flashes more than three times a second, which can trigger seizures.

## Dialog text effects

Dialog titles and text in the configs can contain tags, like in indie game dialog:

```ts
text: '*You feel {wave}dizzy{/wave}.{pause} {shake}Run!{/shake}';
```

| Tag                           | Effect                                             |
| ----------------------------- | -------------------------------------------------- |
| `{wave}…{/wave}`              | Letters ripple up and down                         |
| `{float}…{/float}`            | Letters drift and sway slowly                      |
| `{shake}…{/shake}`            | Letters twitch in place                            |
| `{rainbow}…{/rainbow}`        | Letters cycle through the title palette            |
| `{scramble}…{/scramble}`      | Letters decode from random symbols as they type in |
| `{scramble:loop}…{/scramble}` | The same, then letters keep glitching now and then |
| `{slow}…{/slow}` / `{slow:5}` | Types 3× (or 5×) slower                            |
| `{fast}…{/fast}` / `{fast:5}` | Types 3× (or 5×) faster                            |
| `{pause}` / `{pause:800}`     | Holds the typing for 500 ms (or 800 ms)            |
| `{{`                          | A literal `{`                                      |

- **Combining:** tags nest, e.g. `{rainbow}{wave}hi{/wave}{/rainbow}`. A letter moves with only its innermost motion effect (wave, float or shake).
- **Unclosed tags** run to the end of the text.
- **Mistakes:** a mistyped tag shows up as literal text, and `npm test` fails until it's fixed.
- **Tuning:** speeds and sizes are in `animation.textEffects` in the config.
- **Reduced motion:** with it on, nothing moves and text appears at once.
- **Demo:** press <kbd>`</kbd> on the dev server to open a dialog showing every effect. Set `textDemo.inProduction` to enable it on the live site.

How the engine works, and how to add an effect: [`src/text/README.md`](src/text/README.md).

## Sound

Buttons tick on hover and clunk when pressed, dialogs swoosh, their text
"talks" in blips, and the bus stop screen hums. Everything is synthesized
(no audio files) and tuned in `sound` in the config. Give a dialog a
different voice with `voice: sillyVoice` (or `typewriterVoice`, `screenVoice`, `hushVoice`,
or your own `{ pitch, wave }`); the default is `softVoice`.

Sound is on by default (off for visitors who prefer reduced motion) but, as
browsers require, starts on the visitor's first click or key press. The
speaker button in the corner, or <kbd>M</kbd>, mutes it; hovering it shows
a volume slider. Choices are remembered. Details: [`src/sound/README.md`](src/sound/README.md).

## How it fits together

- **Rendering:** the `site-pages` Vite plugin (`build/`) renders each page's `page.tsx` into its HTML shell at build time, with a small JSX runtime (`build/jsx/`) that outputs HTML strings: no React, nothing extra shipped. Every page therefore ships finished, crawlable markup, and scripts only add behaviour on top. It also writes `sitemap.xml`.
- **Screen sizes:** two layouts, `wide` and `compact`, chosen by a media query in the config. An inline head script sets `<html data-layout>` before first paint. The hero is a fixed-aspect "stage" whose children are positioned in percentages and sized from its width, so the whole composition scales together.
- **`src/core`** holds the small shared pieces:
  - the component base class and cleanup helper (`Disposer`)
  - a typed event emitter
  - `UserPreferences`, the visitor's typed settings saved in `localStorage`
  - one shared animation loop (`ticker`), so blobs and the title stay in sync
  - geometry helpers
  - `hydrateIslands`, which loads island scripts on demand
  - motion helpers that honour reduced-motion settings
- **`src/svg`** handles shapes: path parsing and flattening, radial jitter (a swappable `JitterStrategy`) and corner rounding.
- **`src/dialog`** is the reusable window system:
  - `placement.ts` picks where the window goes, avoiding marked elements and docking as a sheet on mobile.
  - `connector.ts` routes the right-angled line and detours around obstacles.
  - `spotlight.ts` provides the frosted dim layer that lifts the target above it.
  - `manager.ts` sequences the animations and handles focus, Esc, resizing and inert page content.

  Any page can point a dialog at an element with `dialogs.open({ anchor: elementAnchor(el), content })`. Elements marked `data-dialog-avoid` are kept clear. The spotlight can also cut a soft vignette around a spot instead of lifting an element (`elementAnchor(el, 'vignette')`), as the bus stop screen does.

- **`src/text`** is the dialog text engine: the tag parser, typing schedule, effects and typewriter ([details](src/text/README.md)).
- **`src/sound`** is the sound engine: synthesized patches, a mixer, rate limits and the page bindings ([details](src/sound/README.md)).
