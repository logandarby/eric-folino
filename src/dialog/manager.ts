import { $$ } from '../core/component.ts';
import { Disposer } from '../core/disposer.ts';
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
import { siteConfig, type DialogContent } from '../site.config.ts';
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
 * animations.
 */
export class DialogManager {
  private readonly spotlight = new Spotlight();
  private readonly connectorLayer = document.createElementNS(SVG_NS, 'svg');
  private readonly connector = document.createElementNS(SVG_NS, 'polyline');
  private active: ActiveDialog | null = null;
  private queue: Promise<void> = Promise.resolve();
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

  isOpenFor(anchor: DialogAnchor): boolean {
    return this.active?.anchor === anchor;
  }

  open(options: OpenOptions): Promise<void> {
    return this.enqueue(() => this.doOpen(options));
  }

  close(): Promise<void> {
    return this.enqueue(() => this.doClose());
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.queue.then(task);
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
      typewriterCharMs: prefersReducedMotion()
        ? 0
        : siteConfig.animation.typewriterCharMs,
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

    const t = siteConfig.animation;
    if (modal) this.inertRoots.forEach((root) => (root.inert = true));
    const dimmed = modal
      ? this.spotlight.show(options.anchor.element, duration(t.spotlightFadeMs))
      : Promise.resolve();

    await this.animateConnector(active, 'in', duration(t.connectorDrawMs));
    view.el.style.visibility = '';
    await this.animateWindow(active, 'in', duration(t.dialogOpenMs));
    await dimmed;

    if (modal) (view.closeButton ?? view.el).focus({ preventScroll: true });
    void view.typewriter.play();
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

    if (view.closeButton) {
      disposer.listen(view.closeButton, 'click', () => void this.close());
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
      avoid,
    });
    view.el.style.left = `${box.x}px`;
    view.el.style.top = `${box.y}px`;

    const points = routeConnector(
      box,
      { rect: anchorRect, center: anchor.center(), outline: anchor.outline() },
      {
        edgeInset: EDGE_INSET,
        minRun: MIN_RUN,
        clearance: CLEARANCE,
        obstacles: avoid,
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
    active.view.typewriter.cancel();

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

function avoidRects(anchorEl: HTMLElement): Rect[] {
  return $$(AVOID_SELECTOR)
    .filter((el) => el !== anchorEl && !el.contains(anchorEl))
    .map((el) => fromDOMRect(el.getBoundingClientRect()));
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
