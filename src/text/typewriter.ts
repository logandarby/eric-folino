import type { Cleanup } from '../core/disposer.ts';
import { Emitter } from '../core/emitter.ts';
import { ticker } from '../core/ticker.ts';
import type { Glyph } from './markup/timeline.ts';

const SHOWN_CLASS = 'is-shown';

/** A rendered character and when it appears (ms from the start). */
export interface TimedGlyph {
  el: HTMLElement;
  glyph: Glyph;
  at: number;
}

/** A character appearing. */
export interface Reveal extends TimedGlyph {
  /**
   * Shown all at once with the rest (skipped, or reduced motion) rather
   * than typed in, so per-letter feedback like voice blips should skip it.
   */
  instant: boolean;
}

/**
 * Reveals rendered characters on their schedule (see timeline.ts), so
 * {slow}, {fast} and {pause} come for free. Emits `reveal` for each one as
 * it appears, which is what scramble and the voice blips listen to.
 */
export class Typewriter {
  readonly events = new Emitter<{ reveal: Reveal }>();
  private shown = 0;
  private stop: Cleanup | null = null;
  private resolve: (() => void) | null = null;

  /** @param glyphs in reveal order. */
  constructor(private readonly glyphs: TimedGlyph[]) {}

  get done(): boolean {
    return this.shown >= this.glyphs.length;
  }

  play(): Promise<void> {
    this.cancel();
    if ((this.glyphs.at(-1)?.at ?? 0) <= 0) {
      this.finish();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.resolve = resolve;
      let elapsed = 0;
      this.stop = ticker.subscribe(0, (dt) => {
        elapsed += dt;
        this.revealUntil(elapsed);
      });
    });
  }

  /** Shows everything immediately. */
  finish(): void {
    this.revealUntil(Infinity, true);
  }

  /** Stops without revealing the rest. */
  cancel(): void {
    this.stop?.();
    this.stop = null;
    this.resolve?.();
    this.resolve = null;
  }

  private revealUntil(time: number, instant = false): void {
    while (!this.done && this.glyphs[this.shown].at <= time) {
      const item = this.glyphs[this.shown++];
      item.el.classList.add(SHOWN_CLASS);
      this.events.emit('reveal', { ...item, instant });
    }
    if (this.done) this.cancel();
  }
}
