import { Emitter } from '../core/emitter.ts';
import { prefersReducedMotion } from '../core/motion.ts';
import { siteConfig } from '../site/site.config.ts';

/*
 * The iris wipe, as old cartoons end: the screen goes black but for a
 * circle round the link that was clicked, which holds a moment, then snaps
 * shut. The next page comes in under the black, and the circle opens again
 * from the middle. For links marked `data-iris-wipe`, router.ts runs it;
 * a back link so marked goes back with history.back(), so it hands itself
 * over first (`irisWipeBack`). Skipped when motion's reduced.
 */

/** Links whose visit gets the iris wipe. */
export const IRIS_WIPE = '[data-iris-wipe]';

/** How long a back link waits for its visit to start (ms) before it's forgotten. */
const BACK_MS = 1000;

let back: { link: Element; at: number } | null = null;

/** Marks the visit history.back() is about to start as from `link`. */
export function irisWipeBack(link: Element): void {
  if (link.matches(IRIS_WIPE)) back = { link, at: performance.now() };
}

/**
 * The link a visit's wipe closes in on, if the visit gets one: the link
 * that started it, or for going back, the back link that did.
 */
export function irisWipeLink(
  trigger: Element | undefined,
  popstate: boolean
): Element | null {
  const pending = back;
  back = null;
  if (prefersReducedMotion()) return null;
  if (!popstate) return trigger?.closest(IRIS_WIPE) ?? null;
  return pending && performance.now() - pending.at < BACK_MS
    ? pending.link
    : null;
}

export interface IrisWipeEvents extends Record<string, unknown> {
  /** The circle starts closing in on the link. */
  close: undefined;
  /** It's shut: all black. */
  shut: undefined;
  /** It starts opening on the next page. */
  open: undefined;
}

/**
 * The black, with its hole: a fixed element over everything, masked by a
 * hard-edged circle (iris-wipe.css). Only there while wiping. `events`
 * announces each step (sounds hook in there).
 */
export class IrisWipe {
  readonly events = new Emitter<IrisWipeEvents>();
  private el: HTMLElement | null = null;
  /** The circle's radius now (px). */
  private radius = 0;
  /** Counts runs, so one that's been taken over stops. */
  private run = 0;

  /** Whether the black is up (closing, shut or opening). */
  get active(): boolean {
    return this.el !== null;
  }

  /**
   * Closes in on `link`, holds on it, and snaps shut. Resolves once it's
   * black, or as soon as another run takes over.
   */
  async close(link: Element): Promise<void> {
    const id = ++this.run;
    const t = siteConfig.animation.irisWipe;
    const box = link.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    // Round the whole link, tilted or not.
    const around = Math.hypot(box.width, box.height) / 2 + t.paddingPx;
    const from = this.el ? this.radius : farthestCorner(x, y);
    this.place(x, y);
    this.events.emit('close', undefined);
    if (!(await this.tween(id, from, around, t.closeMs, easeOut))) return;
    if (!(await this.wait(id, t.holdMs))) return;
    if (!(await this.tween(id, around, 0, t.snapMs, easeIn))) return;
    this.events.emit('shut', undefined);
    await this.wait(id, t.blackMs);
  }

  /** Opens from the middle of the screen, then goes. */
  async open(): Promise<void> {
    if (!this.el) return;
    const id = ++this.run;
    const x = innerWidth / 2;
    const y = innerHeight / 2;
    this.place(x, y);
    this.events.emit('open', undefined);
    const { openMs } = siteConfig.animation.irisWipe;
    if (
      !(await this.tween(
        id,
        this.radius,
        farthestCorner(x, y),
        openMs,
        easeOut
      ))
    ) {
      return;
    }
    this.el.remove();
    this.el = null;
  }

  /** Puts the circle's middle at (x, y), putting up the black if it isn't. */
  private place(x: number, y: number): void {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'iris-wipe';
      this.el.setAttribute('aria-hidden', 'true');
      document.body.append(this.el);
    }
    this.el.style.setProperty('--iris-x', `${x}px`);
    this.el.style.setProperty('--iris-y', `${y}px`);
  }

  private setRadius(r: number): void {
    this.radius = Math.max(0, r);
    this.el?.style.setProperty('--iris-r', `${this.radius}px`);
  }

  /** Eases the radius from `from` to `to`; false if another run took over. */
  private tween(
    id: number,
    from: number,
    to: number,
    ms: number,
    ease: (p: number) => number
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = (now: number) => {
        if (id !== this.run) return resolve(false);
        const p = Math.min(1, (now - start) / ms);
        this.setRadius(from + (to - from) * ease(p));
        if (p < 1) requestAnimationFrame(frame);
        else resolve(true);
      };
      this.setRadius(from);
      requestAnimationFrame(frame);
    });
  }

  /** Waits `ms`; false if another run took over meanwhile. */
  private wait(id: number, ms: number): Promise<boolean> {
    return new Promise((resolve) =>
      setTimeout(() => resolve(id === this.run), ms)
    );
  }
}

/** How far (x, y) is from the screen's farthest corner: a circle that big covers it. */
function farthestCorner(x: number, y: number): number {
  return Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
}

const easeIn = (p: number) => p * p * p;
const easeOut = (p: number) => 1 - (1 - p) ** 3;
