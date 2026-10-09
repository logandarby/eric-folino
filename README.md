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
| `npm run eyes`                | Re-cut the iris page's eyes from `assets-src/eyes/`    |
| `npm run tv:collage`          | Remake the TV's photos from `assets-src/tv-collage/`   |
| `npm run poems`               | Re-link the poems after adding or changing one         |
| `npm run check-circular`      | Fail on circular imports                               |

Requires Node 20.19+ (CI uses 22).

The pre-commit hook formats and lints staged files, then runs the type-check, tests and circular-import check. CI runs everything again, builds, and deploys `main`.

## The pages

| Page  | Path      | What it is                                                                                                                                                     |
| ----- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home  | `/`       | The bus stop scene: clickable blobs and screen, with the social links above the title                                                                          |
| EPK   | `/epk/`   | The press kit: contact, bio, listening links, press photo downloads and interviews                                                                             |
| Enter | `/enter/` | An old TV playing the band through static that asks if you'd like to enter. The nav's "Secret" leads here                                                      |
| Iris  | `/iris/`  | Four eyes that follow the pointer, over "MORE EYES ARE GOOD". Not linked yet, and noindex                                                                      |
| Poems | `/poems/` | The web of poems: a welcome, and "begin" goes to a random poem. Each poem links to others by what it means. Linked from the nav. Not indexed by search engines |
| 404   | any other | A placeholder dialog pointing back home                                                                                                                        |

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
- **Dialog buttons**: give a dialog `actions: [{ label: 'yes', href: '/' }]` for buttons along its bottom, which appear once the text has typed out. One without `href` just closes the dialog.
- **Instant dialogs**: `instant: true` on a dialog shows its text all at once, uncovered by the window as it opens. Use it for UI and menus; dialogs where something speaks type their text out.
- **The "?" button's dialog**: `help` in `src/site/site.config.ts`. Every layout puts the "?" in the corner beside the sound button; a page can say something else with `pageScript(import.meta.url, mount, { help: … })` in its `main.ts`.
- **`src/styles/base.css`**: the dashed outline that marks anything usable. Every button gets it on hover, and anything focusable gets it on keyboard focus, so new pages have it for free; set `--outline-offset` on an element to move it.
- **`src/assets/blobs/*.svg`**: blob shapes (one `<path>` each; the colour comes from its `fill`).
- **`assets-src/web-background.png`**: the full-size background. Run `npm run images` after changing it.
- **`assets-src/strange-tv.png`**: the enter page's TV photo, with a transparent hole where the screen plays. Run `npm run tv` after changing it; it finds the hole and makes a whole-photo crop and a tall phone crop. Where the TV is (for its button), the "enter?" text, the picture's brightness, how the static fades and the CRT look are in `src/pages/enter/page.config.ts`; the background colour and tile are at the top of `enter.css`.
- **`assets-src/tv-collage/`**: the photos the TV cuts between, like a video, behind the static (`photoSeconds` in `src/pages/enter/page.config.ts` sets how long each shows). Run `npm run tv:collage` after adding or changing one; it crops them to the screen's shape and puts them in one image, in a shuffled order (change `SEED` in `scripts/build-tv-collage.mjs` for another).
- **`assets-src/eyes/`**: the iris page's eyes, as three same-size layers (`base`, `iris`, `skin`) holding all four eyes. Run `npm run eyes` after changing them; where each eye sits, and how much the irises are shrunk (`IRIS_SCALE`), are set in `scripts/slice-eyes.mjs`. Their placement, iris reach, dialogs, backdrop text and dither (palette and pixelation) are in `src/pages/iris/page.config.ts`.
- **`src/pages/poems/content/*.md`**: the poems, one per file: the title on the first line, then a blank line, then the poem as it should read (Prettier leaves them alone). Run `npm run poems` after adding or changing one. A local language model (Qwen2.5 7B through `node-llama-cpp`, about 4.7 GB, downloaded on first run) writes each new or changed poem a card in `src/pages/poems/cards/`: a few themes, each with the line it comes from, and a few of the poem's words with what each suggests. Cards are committed, so building the site never needs the model, and they're never shown on the site; edit one by hand to change what a poem is about, or rewrite it with `npm run poems -- <slug>`. A word links to another poem when it, or what it suggests, is close in meaning to that poem's title or one of its themes, and clicking it opens a dialog with that poem's title, the line it lands on and a button to go there. The settings are at the top of `scripts/build-poems.mjs`. `/poems/web/`, the web, draws the poems as a graph (d3-force, pulled together as hard as each link scores); each poem is a pixel star, purple once read; poems the visitor hasn't opened yet (remembered in localStorage) are locked: grey and untitled. Yellow specks drift along the links the way they point, over a faint inverted copy of `strange-2.webp`. On the dev server, backtick shows every link and its score. Each poem sits in a pixel-art frame, vines or waves by vilemagus (free to use, from [their assets page](https://vilemagus.neocities.org/pages/assets.html), kept in `src/assets/borders/`); which one, its grey and its size are in `src/pages/poem/poem.config.ts`.

## How pages are built

Each page is a folder in `src/pages/`:

| File             | What it is                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `page.config.ts` | Title, description, path and the page's own settings (`definePage`) |
| `page.tsx`       | The markup, written in JSX and rendered to HTML at build time       |
| `main.ts`        | The browser script, if the page needs one (see `pageScript` below)  |
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
- `VoidLayout`: nothing at all, for pages that make their own rules (the iris and enter pages).

**Components** (`src/components/<name>/`) keep everything about one thing together. `name.tsx` renders its markup at build time (and links its `name.css`), and `name.ts` brings it to life in the browser. **`.tsx` files only ever run at build time; `.ts` files in `src/` run in the browser.**

**Moving between pages** doesn't reload the page: links swap in the next page's content (with [Swup](https://swup.js.org), in `src/app/router.ts`), so sound keeps playing and visitors only have to start it once. So a page's `main.ts` doesn't set the page up straight away. It hands that to `pageScript(import.meta.url, ({ dialogs, sound }) => { …; return cleanup; })`, which runs each time the page shows and calls `cleanup` when it goes. The cleanup must undo anything outside the page's own markup:

- listeners on `window` or `document` (`Disposer.listen` keeps track of them);
- timers and `ticker` subscriptions;
- shaders (`dispose()`);
- handlers on `dialogs.events`.

Listeners on the page's own elements go with them, and open dialogs and tooltips close on their own. Links to files (a ZIP, an image) load as usual, and so does any link marked `data-no-swup`.

**Islands** are components whose script loads only when needed. A page lists them in its `main.ts` with `hydrateIslands({ name: () => import(…) })`, and each `<div data-island="name">` fetches its code as it nears the screen. The video embed works this way, so its code never slows down a page that doesn't show it.

**Invisible buttons over a picture**, like the bus stop screen or the enter page's TV, are the `Hotspot` component (`src/components/hotspot/`): place it with `--spot-x`, `--spot-y`, `--spot-w` and `--spot-h`, and `bindHotspot(dialogs, name, content)` in `main.ts` opens its dialog with a vignette spotlight around it (and returns what undoes that).

**Shaders** run with `ShaderCanvas` (`src/gl/`), as on the iris and enter pages. That takes care of resizing, pausing off-screen, a still frame under reduced motion and lost WebGL contexts. It can also read images (`textures`), draw only when asked (`animate: false`) and draw at a capped resolution for chunky pixels (`maxSize`), as the iris page's eyes do. `src/gl/dither.ts` adds Dithermark-style ordered dithering to a palette to any shader. On the dev server it also warns if the picture flashes more than three times a second, which can trigger seizures.

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

## Credits

- **Px437 Cordata PPC-400** (the enter page's "enter?") is from [The Ultimate Oldschool PC Font Pack](https://int10h.org/oldschool-pc-fonts/) by VileR, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- The enter page's CRT look is adapted from daenavan's [crt-threejs](https://daenavan.github.io/crt-threejs/).

## How it fits together

- **`build/`** turns the pages into HTML:
  - `site-pages-plugin.ts`: the Vite plugin. It renders each page into its HTML shell, writes `sitemap.xml`, serves the 404 page like GitHub Pages does, and handles files published at fixed addresses.
  - `render-page.tsx`: renders one page's `page.tsx` (or its placeholder) into a full document, with the stylesheets its components asked for.
  - `jsx/`: a small JSX runtime that outputs HTML strings (no React, nothing shipped to visitors), and the `stylesheet()` helper.
  - `markdown.ts`: Markdown with front matter, for the EPK's content.
  - `images.ts`: responsive images, resized with `sharp` and cached in `node_modules/.cache/responsive-images/`.
  - `published-files.ts`: files kept at a permanent address, like the press photo downloads and their ZIP.
- **Screen sizes:** two layouts, `wide` and `compact`, chosen by a media query in the site config. An inline head script sets `<html data-layout>` before first paint. On the home page, the "stage" has a fixed aspect ratio and its children are positioned in percentages and sized from its width, so the whole composition scales together.
- **`src/app`**: moving between pages (`router.ts`, with `head.ts` bringing over each page's stylesheets in order), what lasts the whole visit and what every page sets up (`bootstrap.ts`: dialogs and sound, then the shared components), the entry for placeholder pages, and the text-effects demo.
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

  Any page can point a dialog at an element with `dialogs.open({ anchor: elementAnchor(el), content })`. Elements marked `data-dialog-avoid` are kept clear. The spotlight can also cut a soft vignette around a spot instead of lifting an element (`elementAnchor(el, 'vignette')`), as the bus stop screen and the enter page's TV do.

- **`src/text`** is the dialog text engine: the tag parser, typing schedule, effects and typewriter ([details](src/text/README.md)).
- **`src/sound`** is the sound engine: synthesized patches, a mixer, rate limits and the page bindings ([details](src/sound/README.md)).
- **`src/gl`** runs WebGL shaders, like the iris page's eyes and the enter page's TV (see [Shaders](#how-pages-are-built)).
