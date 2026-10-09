import type { Cleanup } from './disposer.ts';

interface Subscription {
  interval: number;
  /** Towards the next call, with what's left past the last one's due time. */
  elapsed: number;
  /** Real time since the last call, which is what it's given. */
  since: number;
  callback: (dt: number) => void;
}

/** Frame gaps longer than this (e.g. a backgrounded tab) are clamped. */
const MAX_FRAME_MS = 250;

/**
 * A single requestAnimationFrame loop shared by everything that animates.
 * Subscribers fire every `interval` ms (0 = every frame), all driven by the
 * same clock so they stay in step. The loop only runs while it has
 * subscribers, and pauses with the tab since rAF does.
 */
export class Ticker {
  private subs = new Set<Subscription>();
  private frame = 0;
  private last = 0;

  subscribe(interval: number, callback: (dt: number) => void): Cleanup {
    const sub: Subscription = { interval, elapsed: 0, since: 0, callback };
    this.subs.add(sub);
    this.start();
    return () => {
      this.subs.delete(sub);
      if (!this.subs.size) this.stop();
    };
  }

  private start() {
    if (this.frame) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private tick = (now: number) => {
    const dt = Math.min(now - this.last, MAX_FRAME_MS);
    this.last = now;
    for (const sub of this.subs) {
      sub.elapsed += dt;
      sub.since += dt;
      if (sub.elapsed >= sub.interval) {
        // Keep the remainder so long-run timing doesn't drift, but never
        // fire more than once per frame. The time given is only what's
        // passed since the last call, so the remainder isn't counted twice.
        const fired = sub.since;
        sub.elapsed = sub.interval > 0 ? sub.elapsed % sub.interval : 0;
        sub.since = 0;
        sub.callback(fired);
      }
    }
    this.frame = this.subs.size ? requestAnimationFrame(this.tick) : 0;
  };
}

export const ticker = new Ticker();
