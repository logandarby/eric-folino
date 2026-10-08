import { $$ } from '../core/component.ts';
import { Disposer } from '../core/disposer.ts';
import { Emitter } from '../core/emitter.ts';
import {
  center,
  fromDOMRect,
  polylineLength,
  rect,
  type Point,
  type Rect,
} from '../core/geometry.ts';
import { currentLayout, onLayoutChange } from '../core/layout.ts';
import { animate, duration, prefersReducedMotion } from '../core/motion.ts';
import { siteConfig } from '../site/site.config.ts';
import type { DialogContent } from '../site/types.ts';
import type { DialogAnchor } from './anchor.ts';
import { routeConnector } from './connector.ts';
import { DialogView } from './dialog.ts';
import { placeDialog, type PlacementMode } from './placement.ts';
import { Spotlight } from './spotlight.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** How far from a dialog corner the connector may attach. */
const EDGE_INSET = 16;
/** Shortest connector segment leaving a dialog's side edge. */
const MIN_RUN = 12;
/** Distance the connector keeps from things it detours around. */
const CLEARANCE = 14;
/** Elements dialogs try not to cover. */
const AVOID_SELECTOR = '[data-dialog-avoid]';

export interface OpenOptions {
  anchor: DialogAnchor;
  content: DialogContent;
  /**
   * Dims everything but the anchor, makes the page inert and moves focus
   * into the dialog. Default true.
   */
  modal?: boolean;
  /** Shows a close button and allows Esc / click-outside. Default true. */
  closable?: boolean;
}

export interface DialogEvents extends Record<string, unknown> {
  /** A dialog starts opening; its typewriter hasn't started yet. */
  open: { view: DialogView; content: DialogContent; anchor: DialogAnchor };
  /** The open dialog starts closing. */
  close: { view: DialogView };
}

interface ActiveDialog {
  anchor: DialogAnchor;
  view: DialogView;
  modal: boolean;
  closable: boolean;
  disposer: Disposer;
  returnFocus: HTMLElement | null;
  /** Where the connector meets the dialog, relative to the dialog's box. */
  attach: Point;
  size: { width: number; height: number };
  connectorLength: number;
}

/**
 * Opens one dialog at a time, pointing at an anchor with a right-angled
 * connector line, and keeps it positioned as the viewport changes.
 *
 * Open/close requests are queued, so rapid clicks can't interleave
 * animations; only the latest waiting request runs. `events` announces each open and close (sounds hook in there).
 */
export class DialogManager {
  readonly events = new Emitter<DialogEvents>();
  private readonly spotlight = new Spotlight();
  private readonly connectorLayer = document.createElementNS(SVG_NS, 'svg');
  private readonly connector = document.createElementNS(SVG_NS, 'polyline');
  private active: ActiveDialog | null = null;
  private queue: Promise<void> = Promise.resolve();
  /** Counts requests, so a waiting one can tell it's been overtaken. */
  private requests = 0;
  private layoutFrame = 0;

  /** @param inertRoots page regions disabled while a modal dialog is open. */
  constructor(private readonly inertRoots: HTMLElement[]) {
    this.connectorLayer.classList.add('connector-layer');
    this.connectorLayer.setAttribute('aria-hidden', 'true');
    this.connector.classList.add('connector');
    this.connectorLayer.append(this.connector);

    this.spotlight.events.on('dismiss', () => {
      if (this.active?.closable) void this.close();
    });
  }

  get isOpen(): boolean {
    return this.active !== null;
  }

  isOpenFor(anchor: DialogAnchor): boolean {
    return this.active?.anchor === anchor;
  }

  open(options: OpenOptions): Promise<void> {
    return this.enqueue(() => this.doOpen(options));
  }

  close(): Promise<void> {
    return this.enqueue(() => this.doClose());
  }

  /** Opens the dialog, or closes it if it's already open for this anchor. */
  toggle(options: OpenOptions): Promise<void> {
    return this.isOpenFor(options.anchor) ? this.close() : this.open(options);
  }

  /**
   * Re-places the open dialog, for an anchor that moved on its own (one
   * that's animated, say). Scrolling and resizing already do this.
   */
  reposition(): void {
    if (this.active) this.scheduleLayout();
  }

  /**
   * Runs `task` after whatever is animating now. A request that's still
   * waiting when a newer one arrives is dropped, since the newer one decides
   * what ends up open: tabbing quickly through many anchors shows the last
   * one's dialog, not each in turn.
   */
  private enqueue(task: () => Promise<void>): Promise<void> {
    const request = ++this.requests;
    const run = this.queue.then(() =>
      request === this.requests ? task() : undefined
    );
    this.queue = run.catch((err: unknown) => console.error(err));
    return run;
  }

  // Opening -----------------------------------------------------------------

  private async doOpen(options: OpenOptions): Promise<void> {
    if (this.active) await this.doClose();

    const modal = options.modal ?? true;
    const closable = options.closable ?? true;
    const view = new DialogView(options.content, {
      modal,
      closable,
      text: {
        charMs: prefersReducedMotion()
          ? 0
          : siteConfig.animation.typewriterCharMs,
        effects: siteConfig.animation.textEffects,
        palette: siteConfig.palette,
        rainbowIntervalMs: siteConfig.animation.titleColorCycleIntervalMs,
      },
    });
    view.el.style.visibility = 'hidden';
    document.body.append(view.el);
    if (!this.connectorLayer.isConnected)
      document.body.append(this.connectorLayer);

    const active: ActiveDialog = {
      anchor: options.anchor,
      view,
      modal,
      closable,
      disposer: new Disposer(),
      returnFocus:
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null,
      attach: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
      connectorLength: 0,
    };
    this.active = active;
    this.layout(active);
    this.bindEvents(active);

    this.events.emit('open', {
      view,
      content: options.content,
      anchor: options.anchor,
    });
    const t = siteConfig.animation;
    if (modal) this.inertRoots.forEach((root) => (root.inert = true));
    const dimmed = modal
      ? this.spotlight.show(
          options.anchor.element,
          duration(t.spotlightFadeMs),
          options.anchor.spotlight
        )
      : Promise.resolve();

    await this.animateConnector(active, 'in', duration(t.connectorDrawMs));
    // Instant text is all there before the window opens, so opening
    // uncovers it.
    if (options.content.instant) view.typewriter.finish();
    view.el.style.visibility = '';
    await this.animateWindow(active, 'in', duration(t.dialogOpenMs));
    await dimmed;

    if (view.typewriter.done) {
      if (modal) {
        (view.firstAction ?? view.closeButton ?? view.el).focus({
          preventScroll: true,
        });
      }
    } else {
      if (modal) (view.closeButton ?? view.el).focus({ preventScroll: true });
      void view.typewriter.play();
    }
  }

  private bindEvents(active: ActiveDialog): void {
    const { disposer, view } = active;
    const relayout = () => this.scheduleLayout();

    disposer.listen(window, 'resize', relayout);
    disposer.listen(window, 'scroll', relayout, {
      passive: true,
      capture: true,
    });
    disposer.add(onLayoutChange(relayout));
    // Catches late font loads and anything else that resizes the window.
    const observer = new ResizeObserver(relayout);
    observer.observe(view.el);
    disposer.add(() => observer.disconnect());
    disposer.add(() => cancelAnimationFrame(this.layoutFrame));

    for (const button of [view.closeButton, ...view.closingActions]) {
      if (button) disposer.listen(button, 'click', () => void this.close());
    }
    disposer.listen(view.el, 'click', () => view.typewriter.finish());

    if (!active.modal) return;
    disposer.listen(document, 'keydown', (e) => {
      if (e.key === 'Escape' && active.closable) {
        e.preventDefault();
        void this.close();
      } else if (!view.typewriter.done && !isModifierOrNav(e.key)) {
        // First key press skips the typing; it shouldn't also activate
        // whatever is focused.
        e.preventDefault();
        view.typewriter.finish();
      }
    });
  }

  // Layout ------------------------------------------------------------------

  private scheduleLayout(): void {
    cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = requestAnimationFrame(() => {
      if (this.active) this.layout(this.active);
    });
  }

  /** Measures, places the dialog and routes the connector. */
  private layout(active: ActiveDialog): void {
    const { anchor, view } = active;
    const mode: PlacementMode =
      currentLayout() === 'compact' ? 'docked' : 'floating';
    view.el.dataset.mode = mode;

    const size = { width: view.el.offsetWidth, height: view.el.offsetHeight };
    const viewport = rect(
      0,
      0,
      document.documentElement.clientWidth,
      window.innerHeight
    );
    const anchorRect = anchor.rect();
    const avoid = avoidRects(anchor.element);
    const { rect: box } = placeDialog({
      anchor: anchorRect,
      size,
      viewport,
      mode,
      margin: siteConfig.dialog.viewportMargin,
      gap: siteConfig.dialog.anchorGap,
      edgeInset: EDGE_INSET,
      sides: siteConfig.dialog.sidePreference,
      avoid: avoid.hard,
      softAvoid: avoid.soft,
      comfort:
        Math.min(viewport.width, viewport.height) *
        siteConfig.dialog.edgeComfort,
    });
    if (active.modal) this.spotlight.reframe();
    view.el.style.left = `${box.x}px`;
    view.el.style.top = `${box.y}px`;

    const points = routeConnector(
      box,
      { rect: anchorRect, center: anchor.center(), outline: anchor.outline() },
      {
        edgeInset: EDGE_INSET,
        minRun: MIN_RUN,
        clearance: CLEARANCE,
        obstacles: [...avoid.hard, ...avoid.soft],
      }
    );
    this.connector.setAttribute(
      'points',
      points.map((p) => `${p.x},${p.y}`).join(' ')
    );

    const start = points.length ? points[0] : center(box);
    active.attach = { x: start.x - box.x, y: start.y - box.y };
    active.size = size;
    active.connectorLength = polylineLength(points);
  }

  // Closing -----------------------------------------------------------------

  private async doClose(): Promise<void> {
    const active = this.active;
    if (!active) return;
    this.active = null;
    active.disposer.dispose();
    active.view.dispose();
    this.events.emit('close', { view: active.view });

    const t = siteConfig.animation;
    await this.animateWindow(active, 'out', duration(t.dialogCloseMs));
    active.view.el.remove();

    const undim = active.modal
      ? this.spotlight.hide(duration(t.spotlightFadeMs))
      : Promise.resolve();
    if (active.modal) this.inertRoots.forEach((root) => (root.inert = false));
    await Promise.all([
      this.animateConnector(active, 'out', duration(t.dialogCloseMs)),
      undim,
    ]);
    this.connector.getAnimations().forEach((a) => a.cancel());
    this.connector.removeAttribute('points');

    if (active.modal && active.returnFocus?.isConnected) {
      active.returnFocus.focus({ preventScroll: true });
    }
  }

  // Animation ---------------------------------------------------------------

  /** Draws the line outward from the anchor, or retracts it back. */
  private animateConnector(
    active: ActiveDialog,
    direction: 'in' | 'out',
    ms: number
  ): Promise<void> {
    const length = active.connectorLength;
    // Points run dialog → anchor; a negative offset grows the dash from the
    // anchor end.
    const hidden = {
      strokeDasharray: `${length} ${length}`,
      strokeDashoffset: -length,
    };
    const shown = {
      strokeDasharray: `${length} ${length}`,
      strokeDashoffset: 0,
    };
    return animate(
      this.connector,
      direction === 'in' ? [hidden, shown] : [shown, hidden],
      {
        duration: ms,
        fill: direction === 'out' ? 'forwards' : 'none',
      }
    );
  }

  /**
   * Opens the window like a game dialog: a thin line grows out from where
   * the connector attaches, then unfolds into the full box.
   */
  private animateWindow(
    active: ActiveDialog,
    direction: 'in' | 'out',
    ms: number
  ): Promise<void> {
    const { width: w, height: h } = active.size;
    const { x, y } = active.attach;
    const onSideEdge = x <= 1 || x >= w - 1;
    const inset = (t: number, r: number, b: number, l: number) =>
      `inset(${t}px ${r}px ${b}px ${l}px)`;

    const point = inset(y, w - x, h - y, x);
    const line = onSideEdge
      ? inset(Math.max(0, y - 1), 0, Math.max(0, h - y - 1), 0)
      : inset(0, Math.max(0, w - x - 1), 0, Math.max(0, x - 1));
    const full = inset(0, 0, 0, 0);

    const frames: Keyframe[] =
      direction === 'in'
        ? [
            { clipPath: point, easing: 'ease-in' },
            { clipPath: line, offset: 0.4, easing: 'ease-out' },
            { clipPath: full },
          ]
        : [
            { clipPath: full, easing: 'ease-in' },
            { clipPath: line, offset: 0.6, easing: 'ease-out' },
            { clipPath: point },
          ];
    return animate(active.view.el, frames, {
      duration: ms,
      easing: 'linear',
      fill: direction === 'out' ? 'forwards' : 'none',
    });
  }
}

/**
 * Rects of `[data-dialog-avoid]` elements other than the anchor, split into
 * hard ones (text) and soft ones (`="soft"`: fine to cover a little).
 */
function avoidRects(anchorEl: HTMLElement): { hard: Rect[]; soft: Rect[] } {
  const hard: Rect[] = [];
  const soft: Rect[] = [];
  for (const el of $$(AVOID_SELECTOR)) {
    if (el === anchorEl || el.contains(anchorEl)) continue;
    const r = fromDOMRect(el.getBoundingClientRect());
    (el.dataset.dialogAvoid === 'soft' ? soft : hard).push(r);
  }
  return { hard, soft };
}

const NON_SKIP_KEYS = new Set([
  'Tab',
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
]);
const isModifierOrNav = (key: string) => NON_SKIP_KEYS.has(key);
