# ericfolino.com

A static site built with Vite and plain TypeScript (no UI framework), deployed to GitHub Pages. Pages are written in JSX that runs only at build time, so visitors get finished HTML plus small scripts.

## Commands

| Command                       | What it does                                           |
| ----------------------------- | ------------------------------------------------------ |
| `npm run dev`                 | Dev server with live reload (drafts shown in full)     |
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

## The pages

| Page   | Path       | What it is                                                                                 |
| ------ | ---------- | ------------------------------------------------------------------------------------------ |
| Home   | `/`        | The bus stop scene: clickable blobs, screen and "?", with the social links above the title |
| EPK    | `/epk/`    | The press kit: contact, bio, listening links, press photo downloads and interviews         |
| Secret | `/secret/` | secrets                                                                                    |
| 404    | any other  | A placeholder dialog pointing back home                                                    |

## Editing the site

**Site-wide settings** are in `src/site/`:

- `site.config.ts`: title, nav, palette, the stage layout (including where the socials sit), animation timing, dialog spacing, dim and blur, breakpoints, background framing and the text-effects demo.
- `socials.ts`: links to Eric's profiles, shown above the title on the home page and in the EPK.
- `sound.config.ts`: sound tuning. `voices.ts`: the dialog voices.

**Each page's settings and text** are in `src/pages/<page>/page.config.ts`, like the home page's blobs and their dialogs, or the EPK's contact address.

**The EPK's content** lives in `src/pages/epk/`:

- **Contact:** `contacts` in `page.config.ts`, shown as a button at the top of the page.
- **Bio:** `content/bio.md`, in Markdown.
- **Interviews:** one Markdown file each in `content/interviews/`. Copy `_example.md` to a new name and fill in its header (`title`, `outlet`, `date` as `YYYY-MM-DD`, and optionally `url`). They're listed newest first. Files starting with `_` are skipped, which is handy for drafts.
- **Press photos:** drop full-size images into `content/press/`. Each appears in the gallery with a download of the original at `/press/<file name>`, plus a ZIP of them all once there's more than one. Alt text and photographer credits are optional, in `photoDetails` in `page.config.ts`.
- **Music video:** `video` in `page.config.ts` (a YouTube ID). It loads the player only when someone presses play.
- **Text size:** `--body-size` in `src/layouts/document.css`.

Sections with nothing in them are left out, and the line of links at the top of the page lists whichever sections are showing.

**Images in Markdown** (`![Alt text](./press/photo.jpg)`) are resized automatically at build time into AVIF and WebP at several widths, so add full-size originals. Paths can be relative to the Markdown file, from the project root (`/src/…`), or to files in `public/` (`/press/…`). A misspelled path stops the build.

**Other things you might edit:**

- **Dialog text** can use effect tags; see [Dialog text effects](#dialog-text-effects).
- **`src/styles/tokens.css`**: colours, fonts and z-index order.
- **`src/assets/blobs/*.svg`**: blob shapes (one `<path>` each; the colour comes from its `fill`).
- **`assets-src/web-background.png`**: the full-size background. Run `npm run images` after changing it.

## How pages are built

Each page is a folder in `src/pages/`:

| File             | What it is                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `page.config.ts` | Title, description, path and the page's own settings (`definePage`) |
| `page.tsx`       | The markup, written in JSX and rendered to HTML at build time       |
| `main.ts`        | The browser script, if the page needs one                           |
| `*.css`          | The page's own styles, linked from `page.tsx` with `stylesheet()`   |

A page without `page.tsx` (like the 404) is a **placeholder**: the bus stop with a dialog from its `placeholder` setting.

**Drafts.** A page with `draft: true` is built in full only on the dev server and with `SHOW_DRAFTS=1`. Everywhere else, including the live site, it shows its placeholder instead, and its files (like the press downloads) are left out. To publish a draft, remove `draft` from its config.

**Adding a page:**

1. Make its folder in `src/pages/`. The folder name must match the page's `id`.
2. Add its config to `src/pages/pages.ts`.
3. Add it to `nav` in the site config if it belongs there.
4. Add an HTML shell at its path (e.g. `shows/index.html`) holding just `<!-- @page shows -->`.

**Layouts** (`src/layouts/`) are the page skeletons a `page.tsx` wraps itself in:

- `StageLayout`: the bus stop scene, with the title and nav placed on a "stage" (home and placeholders).
- `DocumentLayout`: a normal scrolling page for reading (the EPK).
- `VoidLayout`: nothing at all, for pages that make their own rules (the secret page).

**Components** (`src/components/<name>/`) keep everything about one thing together. `name.tsx` renders its markup at build time (and links its `name.css`), and `name.ts` brings it to life in the browser. **`.tsx` files only ever run at build time; `.ts` files in `src/` run in the browser.**

**Islands** are components whose script loads only when needed. A page lists them in its `main.ts` with `hydrateIslands({ name: () => import(…) })`, and each `<div data-island="name">` fetches its code as it nears the screen. The video embed works this way, so its code never slows down a page that doesn't show it.

**Shader art** for the secret page goes in `src/pages/secret/pieces/<name>/`: a `.frag` shader plus a small island that runs it with `ShaderCanvas` (`src/gl/`). That takes care of resizing, pausing off-screen, a still frame under reduced motion and lost WebGL contexts. On the dev server it also warns if the picture flashes more than three times a second, which can trigger seizures. One piece, `static-bloom`, is ready to use but not currently on the page.

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
- **Tuning:** speeds and sizes are in `animation.textEffects` in `src/site/site.config.ts`.
- **Reduced motion:** with it on, nothing moves and text appears at once.
- **Demo:** press <kbd>`</kbd> on the dev server to open a dialog showing every effect. Set `textDemo.inProduction` in the site config to enable it on the live site.

How the engine works, and how to add an effect: [`src/text/README.md`](src/text/README.md).

## Sound

Buttons tick on hover and clunk when pressed, dialogs swoosh, their text "talks" in blips, and the bus stop screen hums. Everything is synthesized (no audio files) and tuned in `src/site/sound.config.ts`. Give a dialog a different voice with `voice: sillyVoice` (or `typewriterVoice`, `screenVoice`, `hushVoice`, or your own `{ pitch, wave }`, all in `src/site/voices.ts`); the default is `softVoice`.

Sound is on by default (off for visitors who prefer reduced motion) but, as browsers require, starts on the visitor's first click or key press. The speaker button in the corner, or <kbd>M</kbd>, mutes it; hovering it shows a volume slider. Choices are remembered. Details: [`src/sound/README.md`](src/sound/README.md).

## How it fits together

- **`build/`** turns the pages into HTML:
  - `site-pages-plugin.ts`: the Vite plugin. It renders each page into its HTML shell, writes `sitemap.xml`, serves the 404 page like GitHub Pages does, and handles files published at fixed addresses.
  - `render-page.tsx`: renders one page's `page.tsx` (or its placeholder) into a full document, with the stylesheets its components asked for.
  - `jsx/`: a small JSX runtime that outputs HTML strings (no React, nothing shipped to visitors), and the `stylesheet()` helper.
  - `markdown.ts`: Markdown with front matter, for the EPK's content.
  - `images.ts`: responsive images, resized with `sharp` and cached in `node_modules/.cache/responsive-images/`.
  - `published-files.ts`: files kept at a permanent address, like the press photo downloads and their ZIP.
- **Screen sizes:** two layouts, `wide` and `compact`, chosen by a media query in the site config. An inline head script sets `<html data-layout>` before first paint. On the home page, the "stage" has a fixed aspect ratio and its children are positioned in percentages and sized from its width, so the whole composition scales together.
- **`src/app`**: what every page's script starts with (`bootstrap.ts`: dialogs, sound and the shared components), the entry for placeholder pages, and the text-effects demo.
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
- **`src/gl`** runs WebGL shaders for the secret page's art (see [Shader art](#how-pages-are-built)).
