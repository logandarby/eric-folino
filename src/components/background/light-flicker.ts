import { Component } from '../../core/component.ts';
import { prefersReducedMotion } from '../../core/motion.ts';
import type { FlickerConfig } from '../../site/types.ts';
import { nextBurst } from './flicker-burst.ts';

/**
 * Makes the bus stop light flicker now and then by fading in a pre-rendered
 * "lights off" copy of the background over it. Only opacity animates, so it
 * runs on the compositor; between bursts nothing runs at all.
 *
 * Never flickers with reduced motion on, including if the setting is
 * switched on mid-visit (background.css also hides the layer then).
 */
export class LightFlicker extends Component {
  private timer = 0;
  private animation: Animation | undefined;

  constructor(
    el: HTMLElement,
    private readonly config: FlickerConfig,
    private readonly random: () => number = Math.random
  ) {
    super(el);
    this.disposer.add(() => {
      clearTimeout(this.timer);
      this.animation?.cancel();
    });

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      if (reducedMotion.matches) this.animation?.cancel();
    };
    reducedMotion.addEventListener('change', onChange);
    this.disposer.add(() =>
      reducedMotion.removeEventListener('change', onChange)
    );

    // Don't flicker to a half-loaded overlay.
    const img = el.querySelector('img');
    void (img?.decode() ?? Promise.resolve()).then(
      () => this.schedule(),
      () => undefined
    );
  }

  private schedule() {
    const { minGapMs, maxGapMs } = this.config;
    const gap = minGapMs + this.random() * (maxGapMs - minGapMs);
    this.timer = window.setTimeout(() => this.burst(), gap);
  }

  private burst() {
    // Hidden tabs: skip, don't queue up bursts for when it comes back.
    if (!document.hidden && !prefersReducedMotion()) {
      const { keyframes, duration } = nextBurst(this.config, this.random);
      this.animation = this.el.animate(keyframes, { duration });
    }
    this.schedule();
  }
}
