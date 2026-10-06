import { h } from '../core/component.ts';
import { Emitter } from '../core/emitter.ts';
import { animate } from '../core/motion.ts';

const LIFTED_CLASS = 'is-spotlit';

/**
 * Dims the page except for one target element.
 *
 * The target is "lifted" above a full-screen dim layer with z-index. For this
 * to work the target must not sit inside an ancestor that creates its own
 * stacking context (transform, opacity < 1, filter, z-index, contain…),
 * otherwise it can't rise above the layer.
 */
export class Spotlight {
  readonly events = new Emitter<{ dismiss: undefined }>();
  private readonly layer = h('div', {
    class: 'spotlight',
    'aria-hidden': 'true',
  });
  private target: HTMLElement | null = null;

  constructor() {
    this.layer.addEventListener('click', () =>
      this.events.emit('dismiss', undefined)
    );
  }

  async show(target: HTMLElement | null, fadeMs: number): Promise<void> {
    this.target = target;
    target?.classList.add(LIFTED_CLASS);
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
}
