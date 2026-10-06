# TODO

- **Dialog voice blips.** Play a short "talking" sound per character as
  dialog text types out, like Undertale or Animal Crossing. Ideas:
  - Hook into the typewriter's per-character `reveal` event (planned in the
    text engine work), not a separate timer, so blips follow `{slow}`,
    `{fast}` and `{pause}`.
  - Web Audio with one short pre-decoded sample (or a tiny oscillator),
    slightly pitch-shifted per character; skip whitespace and punctuation,
    and rate-limit so fast text doesn't buzz.
  - Optional per-dialog voice (pitch/sample) in site.config.ts.
  - Off until the visitor turns sound on (autoplay rules, and nobody
    expects a website to beep). Remember the choice; add a visible mute
    toggle.
