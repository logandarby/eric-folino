import type { Cleanup } from '../core/disposer.ts';
import { prefersReducedMotion } from '../core/motion.ts';
import { ticker } from '../core/ticker.ts';
import type { TextEffectsConfig } from '../site/types.ts';

const ACTIVE_CLASS = 'is-scrambling';

export type ScrambleMode = 'decode' | 'loop';

/**
 * Runs {scramble} for one dialog. A scrambling letter keeps its real
 * character (so layout and copy-paste are unaffected) and shows a random
 * symbol over it through CSS (`::after { content: attr(data-glyph) }`).
 *
 * - `decode`: each letter scrambles briefly as it types in, then settles.
 * - `loop`: the same, then now and then a letter glitches again.
 *
 * All letters share one ticker subscription that only runs while something
 * is scrambling (or could glitch), and only touches the letters currently
 * scrambling. Nothing scrambles with reduced motion on.
 */
export class ScrambleController {
  private readonly modes = new Map<HTMLElement, ScrambleMode>();
  /** Scrambling letters and their remaining ms. */
  private readonly active = new Map<HTMLElement, number>();
  /** Revealed `loop` letters, which may glitch. */
  private readonly loopers = new Set<HTMLElement>();
  private readonly symbols: string[];
  private stop: Cleanup | null = null;

  constructor(
    private readonly config: TextEffectsConfig['scramble'],
    private readonly random: () => number = Math.random
  ) {
    this.symbols = Array.from(config.symbols);
  }

  add(el: HTMLElement, mode: ScrambleMode): void {
    this.modes.set(el, mode);
  }

  /** Called as the typewriter shows a letter. */
  reveal(el: HTMLElement): void {
    const mode = this.modes.get(el);
    if (!mode || prefersReducedMotion()) return;
    this.start(el, this.config.durationMs);
    if (mode === 'loop') this.loopers.add(el);
  }

  dispose(): void {
    this.stop?.();
    this.stop = null;
    for (const el of this.active.keys()) this.settle(el);
    this.loopers.clear();
  }

  private start(el: HTMLElement, ms: number) {
    this.active.set(el, ms);
    el.classList.add(ACTIVE_CLASS);
    this.shuffle(el);
    this.stop ??= ticker.subscribe(this.config.intervalMs, (dt) =>
      this.tick(dt)
    );
  }

  private tick(dt: number) {
    if (prefersReducedMotion()) {
      this.dispose();
      return;
    }
    for (const [el, left] of this.active) {
      if (left <= dt) {
        this.settle(el);
      } else {
        this.active.set(el, left - dt);
        this.shuffle(el);
      }
    }
    const chance = (this.config.glitchesPerSecond * dt) / 1000;
    for (const el of this.loopers) {
      if (!this.active.has(el) && this.random() < chance) {
        this.start(el, this.config.glitchMs);
      }
    }
    if (!this.active.size && !this.loopers.size) {
      this.stop?.();
      this.stop = null;
    }
  }

  private shuffle(el: HTMLElement) {
    const { symbols } = this;
    el.dataset.glyph = symbols[Math.floor(this.random() * symbols.length)];
  }

  private settle(el: HTMLElement) {
    this.active.delete(el);
    el.classList.remove(ACTIVE_CLASS);
  }
}
