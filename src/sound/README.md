# Sound engine

Game-style UI sounds, all synthesized with Web Audio: no audio files to
download. Settings are in `src/site/sound.config.ts`, voices in `src/site/voices.ts`.

| Sound   | When                                                       | Made of                                                        |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| `hover` | a button or link is hovered or tabbed to                   | a faint, low-ish sine tick, pitch dipping                      |
| `press` | a button or link is pressed                                | a soft click: a tiny sine pop under a few ms of filtered noise |
| `open`  | a dialog opens                                             | noise through a band-pass filter sweeping up                   |
| `close` | a dialog closes                                            | the same, sweeping down, quieter                               |
| `blip`  | each letter typed in a dialog                              | a very short tone in the dialog's voice, pitch jittered        |
| `hum`   | while the enter page's TV is hovered or its dialog is open | detuned 60 Hz sawtooth buzz, low-passed, plus fluttering fizz  |

## Pieces and patterns

```
bindings.ts ──play/loop──▶ sound-engine.ts ──▶ patches/*.ts ──▶ audio-graph.ts ──▶ speakers
(page events)              (may it play?)       (what it sounds like)  (mixer)
```

- **Facade** (`sound-engine.ts`). The rest of the site only calls
  `play()`, `loop()` and `setEnabled()`. The engine decides whether a sound
  actually plays: sound on, audio unlocked, not rate limited.
- **Patch registry** (`patches/`, strategy pattern). One file per sound,
  each implementing `OneShotPatch` or `LoopPatch`. The registry is typed by
  sound name, so a new name won't compile until it has a patch.
- **Mixer** (`audio-graph.ts`). The page's single `AudioContext`:
  `sound → channel (ui / voice / ambient) → master → limiter → speakers`.
  The limiter is a gentle compressor so stacked sounds never get harsh.
- **Observer** (`bindings.ts`). Components never know about sound:
  - one document-level listener per event handles every button and link;
  - `DialogManager.events` announces `open` and `close`;
  - the typewriter's `reveal` event drives the blips, so they follow
    `{slow}`, `{fast}` and `{pause}`.

## Rate limiting and performance

- Each sound has a `minGapMs`; extra plays are dropped. Hovering the same
  element again within `sameTargetGapMs` is silent, so edges don't chatter.
- At most `maxVoices` one-shots play at once; the oldest is cut off.
- Blips skip spaces and punctuation, and text revealed all at once (skipped
  or reduced motion) doesn't blip (`Reveal.instant`).
- The `AudioContext` is made, paused, once the page is first still
  (`prepare()`), since making one can take a fifth of a second; the first
  click or key press only resumes it (or makes it, without
  `requestIdleCallback`). Nothing sounds before then. The noise is
  generated once and shared. Sounds are a few throwaway nodes; no
  per-frame JavaScript.
- Audio is suspended while the tab is hidden and after `idleSuspendMs` of
  silence, and resumes on the next sound.

## Settings

The visitor's choices live in `UserPreferences` (`src/core/preferences.ts`),
a typed store on `localStorage` (`pref:sound`, `pref:volume`), so they last
across pages and visits. The engine follows its `change` events, so
changes made in another tab apply here too.

## Accessibility

- **Autoplay:** browsers block audio until the visitor clicks or presses a
  key, so sound is "on" by default but starts on that first interaction.
  Hovers before it are silent. Links don't reload the page (see
  `src/app/router.ts`), so once started, sound lasts the whole visit.
- **Reduced motion:** visitors who prefer it start with sound off. It's
  the closest thing browsers have to a "less stimulation" setting. Their
  own choice still wins.
- **Mute anywhere:** the speaker button sits above the dim layer, so it
  works while a dialog is open, and <kbd>M</kbd> toggles sound from
  anywhere (announced to screen readers as "Sound on" / "Sound off"). The
  "?" dialog mentions both.
- **Volume:** hovering or focusing the speaker slides out a slider. Moving
  it while muted turns sound back on.
- **iPhones:** the audio session is set to `ambient`, so our sounds mix
  with the visitor's music instead of pausing it, and respect the silent
  switch (Safari 16.4+).
- **Nothing relies on sound:** every sound echoes something visible.
- **WCAG 1.4.2:** the hum is the only sound over 3 seconds; it only plays
  while you're on the TV or its dialog is open, and muting stops it. (The
  home page's music plays only when asked, and muting pauses it too.)
- **Keyboard and touch:** only focus moved with Tab ticks (not focus
  moved by clicks or dialogs), and Enter / Space click like a press. Touch
  has no hover, so taps only click. The volume slider is hard to reach on
  touch screens (no hover); muting works everywhere.

## Adding a sound

1. Add its name to `OneShotName` or `LoopName` in `patches/index.ts`.
2. Write its patch in `patches/`, using the helpers in `patch.ts`
   (`pluck` for an envelope, `noise`, `voice` to return it), and register it.
3. Add its settings to `SoundConfig` and `sound` in the config.
4. Trigger it from `bindings.ts`.

## Per-element and per-dialog tweaks

- `data-sound="none"` on an element: no hover tick.
- `data-sound="hum"`: the element plays the hum loop while hovered or
  focused, or while a dialog pointing at it is open, instead of the tick.
- `voice` on a dialog's content changes how it "talks". The config has
  named voices: `softVoice` (the default), `sillyVoice`, `typewriterVoice`,
  `screenVoice` (smooth detuned saws in unison) and `hushVoice` (a whisper, `wave: 'noise'`).
