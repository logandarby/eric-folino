/**
 * Remembers when each key last fired, so callers can drop repeats that come
 * too soon. Keys can be names ('blip') or objects (an element), which are
 * held weakly.
 */
export class Throttle {
  private readonly byName = new Map<string, number>();
  private readonly byObject = new WeakMap<object, number>();

  constructor(private readonly now: () => number = () => performance.now()) {}

  /** True if `key` hasn't fired in the last `gapMs`. Doesn't record anything. */
  ready(key: string | object, gapMs: number): boolean {
    const last = this.last(key);
    return last === undefined || this.now() - last >= gapMs;
  }

  /** Records that `key` fired now. */
  mark(key: string | object): void {
    if (typeof key === 'string') this.byName.set(key, this.now());
    else this.byObject.set(key, this.now());
  }

  private last(key: string | object): number | undefined {
    return typeof key === 'string'
      ? this.byName.get(key)
      : this.byObject.get(key);
  }
}

/** Something playing that can be cut short. */
export interface Voice {
  /** When it ends by itself, in the audio clock's seconds (Infinity for loops). */
  readonly endsAt: number;
  /** Fades it out quickly. Safe to call more than once. */
  stop(): void;
}

/**
 * Caps how many one-shot sounds play at once. Adding one past the cap cuts
 * off the oldest, so a burst of sounds never piles up into noise.
 */
export class VoicePool {
  private voices: Voice[] = [];

  constructor(private readonly max: number) {}

  get size(): number {
    return this.voices.length;
  }

  add(voice: Voice, now: number): void {
    this.voices = this.voices.filter((v) => v.endsAt > now);
    while (this.voices.length >= this.max) this.voices.shift()?.stop();
    this.voices.push(voice);
  }

  stopAll(): void {
    this.voices.forEach((v) => v.stop());
    this.voices = [];
  }
}
