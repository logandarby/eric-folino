# Dialog text engine

Turns dialog text from the configs (`src/site/`, `src/pages/*/page.config.ts`) into animated, typed-out text.
Writing text? The tag list is in the [main README](../../README.md#dialog-text-effects).
Press <kbd>`</kbd> on the dev server to see every effect.

## Pipeline

```
"You feel {wave}dizzy{/wave}."
        │
        ▼  markup/lexer.ts      text and tag tokens: {name}, {name:arg}, {/name}, {{
        ▼  markup/parser.ts     styled pieces + pauses, looking tags up in markup/tags.ts
        ▼  markup/timeline.ts   one Glyph per character: its effects and when it appears
        │                       (= a TextScript)
        ▼  text-engine.ts       DOM: a <span> per character, decorated by effects.ts
        ▼  typewriter.ts        reveals the spans on schedule, emitting `reveal`
        │
     CSS (src/styles/text-effects.css) animates; scramble.ts handles {scramble}
```

Everything under `markup/` is pure (no DOM), so it is unit tested in
`markup/markup.test.ts`. `config-text.test.ts` fails the build if any text in
the config has a bad tag.

## Pieces and patterns

- **Tag registry** (`markup/tags.ts`). Every tag is one entry saying its
  kind and how to parse its argument. The parser has no tag names hard-coded.
  - `effect`: changes how letters look; effects nest.
  - `pacing`: changes typing speed; the innermost wins.
  - `instant`: happens at a point, like `{pause}`.
- **Forgiving parser** (`markup/parser.ts`). Bad markup never breaks a page:
  - unknown tags and bad arguments stay as literal text;
  - stray closing tags are dropped;
  - an unclosed tag runs to the end;
  - a closing tag closes the most recent matching tag, even out of order.

  Problems are returned as `diagnostics`, logged on the dev server and
  caught by the config test.

- **Timeline up front** (`markup/timeline.ts`). Reveal times are computed
  once, at parse time:
  - `{slow}`, `{fast}` and `{pause}` are just arithmetic;
  - with reduced motion (`charMs: 0`), everything gets time 0;
  - anything that reacts to typing shares the schedule.
- **Effect renderers** (`effects.ts`, strategy pattern). Each effect gets
  a renderer.
  - Most renderers only add a class and CSS variables to a letter's span, and
    the browser animates it.
  - "Motion" effects (wave, float, shake) all move the letter, so a letter
    gets only the innermost one. Colour and scramble combine freely with them.
  - The renderer map is typed by effect name, so a new effect tag won't
    compile until it has a renderer.
- **Facade** (`text-engine.ts`). `DialogView` only talks to `TextEngine`:
  `render()` per text, then `typewriter()` across them. There is one engine
  per dialog, and `dispose()` stops its scripted effects.
- **Observer** (`typewriter.ts`). The typewriter emits `reveal` for each
  character. Scramble listens to it to decode letters as they type in.
  The voice blips listen too (see `src/sound/`); `instant` marks letters
  shown all at once, which shouldn't blip.

## Performance

- **Moving letters** use CSS `translate`/`rotate` animations, which run on
  the compositor:
  - no JavaScript per frame, and no layout or paint;
  - letters move without reflowing the text.
- **`{rainbow}`** animates `color`, so it repaints, but only on a 500 ms step
  and only for its own letters.
- **`{scramble}`** is the only effect driven by JavaScript.
  - The whole dialog shares one subscription to the shared `ticker`, at
    about 16 fps. It runs only while something is scrambling, or a
    `{scramble:loop}` letter could glitch.
  - Each tick touches only the letters currently scrambling.
  - The real letter stays in place, transparent, with the symbol drawn over
    it by CSS, so the layout never shifts.
- **Overflow room:** the dialog body is padded on every side, cancelled out
  by a negative margin, so moving letters never cause a scrollbar.
  - The padding (`--fx-room`) is the largest movement, plus slack for
    rotation and rounding.
  - Even 0.4 px of overflow made the scrollbar flicker, so a new effect that
    moves letters further must be included in `textEffectStyles()`.

## Accessibility

- **Screen readers** get the plain sentence: tags are removed and the text
  is in one `.sr-only` span. The per-letter spans are `aria-hidden`.
- **With reduced motion on:**
  - nothing moves or cycles, including if the setting changes while a
    dialog is open (CSS);
  - rainbow letters keep fixed colours;
  - scramble never starts;
  - text appears at once, ignoring `{slow}`, `{fast}` and `{pause}`.
- **Copy-paste** gets the real text, even mid-scramble.
- **Stopping motion:** effects stop when their dialog closes. That covers
  WCAG 2.2.2 ("pause, stop, hide") for closable dialogs, so don't use motion
  tags in the About, Secret or 404 dialogs, which can't be closed.

## Adding an effect

1. Add its name to `EFFECT_NAMES` and an entry to `TAGS` in
   `markup/tags.ts`, with an argument parser if it takes one.
2. Add a renderer in `effects.ts`; TypeScript will point at the gap.
3. If it's CSS-driven:
   - add the class and keyframes to `src/styles/text-effects.css`, setting
     `--fx-motion` or `--fx-color` so it combines with the other effects;
   - make sure the reduced-motion rule there covers it;
   - put any tuning in `textEffects` in the config, passed to CSS by
     `textEffectStyles()` in `src/layouts/head.tsx`.
4. Add a line to the `textDemo` dialog in the config, and a row to the
   table in the main README.

Adding a pacing or instant tag works the same way, but its behaviour goes in
`markup/timeline.ts` instead of a renderer.
