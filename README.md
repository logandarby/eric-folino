# ericfolino.com

A static site built with Vite and plain TypeScript (no UI framework), deployed to GitHub Pages.

## Commands

| Command                  | What it does                                      |
| ------------------------ | ------------------------------------------------- |
| `npm run dev`            | Dev server with hot reload                        |
| `npm run build`          | Type-check and production build into `dist/`      |
| `npm run preview`        | Serve the production build locally                |
| `npm test`               | Unit tests (Vitest)                               |
| `npm run lint`           | ESLint                                            |
| `npm run format`         | Prettier                                          |
| `npm run images`         | Regenerate background variants from `assets-src/` |
| `npm run check-circular` | Fail on circular imports                          |

Requires Node 20.19+ (CI uses 22).

The pre-commit hook formats and lints staged files, then runs the type-check, tests and circular-import check. CI runs everything again, builds, and deploys `main`.

## Editing the site

- **`src/site.config.ts`**: content and behaviour. This covers the title, nav, pages, blob positions and dialog text, plus animation timing, jitter, corner rounding, dialog spacing, dim and blur, layout breakpoints and background framing.
- **Dialog text** can use effect tags; see [Dialog text effects](#dialog-text-effects).
- **`src/styles/tokens.css`**: colours, fonts and z-index order.
- **`src/assets/blobs/*.svg`**: blob shapes (one `<path>` each; the colour comes from its `fill`).
- **`assets-src/web-background.png`**: the full-size background. Run `npm run images` after changing it.

## Dialog text effects

Dialog titles and text in `src/site.config.ts` can contain tags, like in indie game dialog:

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

- **Pages** are thin HTML shells (`index.html`, `about/index.html`, …) containing directives like `<!-- @hero -->`. The `site-pages` Vite plugin (`build/`) expands these at build time from the config. Every page therefore ships finished, crawlable markup, and scripts only add behaviour on top.
- **Layouts:** two of them, `wide` and `compact`, chosen by a media query in the config. An inline head script sets `<html data-layout>` before first paint. The hero is a fixed-aspect "stage" whose children are positioned in percentages and sized from its width, so the whole composition scales together.
- **`src/core`** holds the small shared pieces:
  - the component base class and cleanup helper (`Disposer`)
  - a typed event emitter
  - `UserPreferences`, the visitor's typed settings saved in `localStorage`
  - one shared animation loop (`ticker`), so blobs and the title stay in sync
  - geometry helpers
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
