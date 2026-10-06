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
- **`src/styles/tokens.css`**: colours, fonts and z-index order.
- **`src/assets/blobs/*.svg`**: blob shapes (one `<path>` each; the colour comes from its `fill`).
- **`assets-src/web-background.png`**: the full-size background. Run `npm run images` after changing it.

## How it fits together

- **Pages** are thin HTML shells (`index.html`, `about/index.html`, …) containing directives like `<!-- @hero -->`. The `site-pages` Vite plugin (`build/`) expands these at build time from the config. Every page therefore ships finished, crawlable markup, and scripts only add behaviour on top.
- **Layouts:** two of them, `wide` and `compact`, chosen by a media query in the config. An inline head script sets `<html data-layout>` before first paint. The hero is a fixed-aspect "stage" whose children are positioned in percentages and sized from its width, so the whole composition scales together.
- **`src/core`** holds the small shared pieces:
  - the component base class and cleanup helper (`Disposer`)
  - a typed event emitter
  - one shared animation loop (`ticker`), so blobs and the title stay in sync
  - geometry helpers
  - motion helpers that honour reduced-motion settings
- **`src/svg`** handles shapes: path parsing and flattening, radial jitter (a swappable `JitterStrategy`) and corner rounding.
- **`src/dialog`** is the reusable window system:
  - `placement.ts` picks where the window goes, avoiding marked elements and docking as a sheet on mobile.
  - `connector.ts` routes the right-angled line and detours around obstacles.
  - `spotlight.ts` provides the frosted dim layer that lifts the target above it.
  - `typewriter.ts` reveals text letter by letter.
  - `manager.ts` sequences the animations and handles focus, Esc, resizing and inert page content.

  Any page can point a dialog at an element with `dialogs.open({ anchor: elementAnchor(el), content })`. Elements marked `data-dialog-avoid` are kept clear.
