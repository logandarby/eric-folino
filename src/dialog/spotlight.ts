import { h } from '../core/component.ts';
import { Emitter } from '../core/emitter.ts';
import { animate } from '../core/motion.ts';

const LIFTED_CLASS = 'is-spotlit';
const VIGNETTE_CLASS = 'spotlight--vignette';
/** Fraction of the vignette's radius that stays fully clear. */
const VIGNETTE_CLEAR = 0.55;

/**
 * How the target shows through the dim layer:
 * - `lift`: the target itself is raised above the layer with z-index. It
 *   must not sit inside an ancestor that creates its own stacking context
 *   (transform, opacity < 1, filter, z-index, contain…), or it can't rise.
 * - `vignette`: the layer gets a soft elliptical hole around the target.
 *   Works anywhere, for things that aren't elements of their own (like a
 *   spot in the background photo).
 */
export type SpotlightStyle = 'lift' | 'vignette';

/** Dims the page except for one target element. */
export class Spotlight {
  readonly events = new Emitter<{ dismiss: undefined }>();
  private readonly layer = h('div', {
    class: 'spotlight',
    'aria-hidden': 'true',
  });
  private target: HTMLElement | null = null;
  private style: SpotlightStyle = 'lift';

  constructor() {
    this.layer.addEventListener('click', () =>
      this.events.emit('dismiss', undefined)
    );
  }

  async show(
    target: HTMLElement | null,
    fadeMs: number,
    style: SpotlightStyle = 'lift'
  ): Promise<void> {
    this.target = target;
    this.style = style;
    if (style === 'lift') target?.classList.add(LIFTED_CLASS);
    this.layer.classList.toggle(VIGNETTE_CLASS, style === 'vignette');
    this.reframe();
    if (!this.layer.isConnected) document.body.append(this.layer);
    await animate(this.layer, [{ opacity: 0 }, { opacity: 1 }], {
      duration: fadeMs,
    });
  }

  async hide(fadeMs: number): Promise<void> {
    await animate(this.layer, [{ opacity: 1 }, { opacity: 0 }], {
      duration: fadeMs,
      fill: 'forwards',
    });
    this.layer.getAnimations().forEach((a) => a.cancel());
    this.layer.remove();
    this.target?.classList.remove(LIFTED_CLASS);
    this.target = null;
  }

  /** Vignette style: re-centres the hole on the target after it moves. */
  reframe(): void {
    if (this.style !== 'vignette' || !this.target) return;
    const r = this.target.getBoundingClientRect();
    // The clear part is an ellipse through the target's corners.
    const scale = Math.SQRT2 / 2 / VIGNETTE_CLEAR;
    const vars = {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      rx: r.width * scale,
      ry: r.height * scale,
    };
    for (const [key, px] of Object.entries(vars)) {
      this.layer.style.setProperty(`--vignette-${key}`, `${px}px`);
    }
    this.layer.style.setProperty(
      '--vignette-clear',
      `${VIGNETTE_CLEAR * 100}%`
    );
  }
}
