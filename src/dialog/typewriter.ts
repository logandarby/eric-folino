import { h } from '../core/component.ts';
import type { Cleanup } from '../core/disposer.ts';
import { ticker } from '../core/ticker.ts';

const CHAR_CLASS = 'tw-char';
const SHOWN_CLASS = 'is-shown';

/**
 * Builds text that a Typewriter can reveal. The full string is laid out up
 * front (hidden characters still take up space), so the container never
 * changes size while typing. Screen readers get the plain text immediately.
 */
export function typeable(text: string): DocumentFragment {
  const visual = h('span', { 'aria-hidden': 'true' });
  // Words are kept whole so the browser never breaks lines mid-word.
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      visual.append(charSpan(part));
      continue;
    }
    const word = h('span', { class: 'tw-word' });
    for (const ch of part) word.append(charSpan(ch));
    visual.append(word);
  }
  const fragment = document.createDocumentFragment();
  fragment.append(h('span', { class: 'sr-only' }, [text]), visual);
  return fragment;
}

const charSpan = (ch: string) => h('span', { class: CHAR_CLASS }, [ch]);

/** Reveals the `typeable` characters inside `root`, first to last. */
export class Typewriter {
  private readonly chars: HTMLElement[];
  private shown = 0;
  private stop: Cleanup | null = null;
  private resolve: (() => void) | null = null;

  constructor(
    root: HTMLElement,
    private readonly charMs: number
  ) {
    this.chars = Array.from(
      root.querySelectorAll<HTMLElement>(`.${CHAR_CLASS}`)
    );
  }

  get done(): boolean {
    return this.shown >= this.chars.length;
  }

  play(): Promise<void> {
    this.cancel();
    if (this.charMs <= 0) {
      this.finish();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.resolve = resolve;
      let elapsed = 0;
      this.stop = ticker.subscribe(0, (dt) => {
        elapsed += dt;
        this.reveal(Math.floor(elapsed / this.charMs));
      });
    });
  }

  /** Shows everything immediately. */
  finish(): void {
    this.reveal(this.chars.length);
  }

  /** Stops without revealing the rest. */
  cancel(): void {
    this.stop?.();
    this.stop = null;
    this.resolve?.();
    this.resolve = null;
  }

  private reveal(count: number): void {
    const target = Math.min(count, this.chars.length);
    while (this.shown < target) {
      this.chars[this.shown++].classList.add(SHOWN_CLASS);
    }
    if (this.done) this.cancel();
  }
}
