import { Component, $$ } from '../../core/component.ts';
import { ticker } from '../../core/ticker.ts';
import { letterColor } from './letter-color.ts';

export interface RainbowTextOptions {
  palette: readonly string[];
  intervalMs: number;
  animate: boolean;
}

/** Cycles colours through the `[data-letter]` spans inside `el`. */
export class RainbowText extends Component {
  private readonly letters = $$('[data-letter]', this.el);
  private offset = 0;

  constructor(
    el: HTMLElement,
    private readonly options: RainbowTextOptions
  ) {
    super(el);
    if (options.animate) {
      this.disposer.add(
        ticker.subscribe(options.intervalMs, () => this.step())
      );
    }
  }

  step(): void {
    this.offset++;
    this.letters.forEach((letter, i) => {
      letter.style.color = letterColor(this.options.palette, i, this.offset);
    });
  }
}
