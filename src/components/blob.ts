import { Component, $ } from '../core/component.ts';
import { Emitter } from '../core/emitter.ts';
import { fromDOMRect, type Point } from '../core/geometry.ts';
import { ticker } from '../core/ticker.ts';
import type { DialogAnchor } from '../dialog/anchor.ts';
import { blobShape, roundedPathData } from '../svg/blob-shape.ts';
import type { JitterStrategy } from '../svg/jitter.ts';
import { flattenPath, parsePath } from '../svg/path.ts';

export interface BlobOptions {
  jitter: JitterStrategy;
  /** Corner rounding in SVG user units (see roundPolygon). */
  cornerRadius: number;
  /** See siteConfig.animation.blobMinPointSpacing. */
  minPointSpacing: number;
  intervalMs: number;
  animate: boolean;
}

/**
 * A clickable SVG blob that "boils": every interval its outline snaps to a
 * fresh jittered version of the original shape, with rounded corners.
 * Doubles as a dialog anchor.
 *
 * Expects markup: <button data-blob><svg><path data-shape="original d"/></svg></button>
 */
export class Blob extends Component<HTMLButtonElement> implements DialogAnchor {
  readonly events = new Emitter<{ select: Blob }>();
  readonly index: number;

  private readonly svg = $<SVGSVGElement>('svg', this.el);
  private readonly path = $<SVGPathElement>('path', this.el);
  /** Unrounded source polygon that each boil starts from. */
  private readonly base: Point[];
  /** Rounded outline and centre in SVG user units. */
  private readonly localOutline: Point[];
  private readonly localCenter: Point;

  constructor(
    el: HTMLButtonElement,
    private readonly options: BlobOptions
  ) {
    super(el);
    this.index = Number(el.dataset.blob);
    const shape = blobShape(
      this.path.dataset.shape ?? '',
      options.minPointSpacing
    );
    this.base = shape.polygon;
    this.localCenter = shape.center;
    this.localOutline = flattenPath(
      parsePath(roundedPathData(shape.polygon, options.cornerRadius))
    );

    this.disposer.listen(el, 'click', () => this.events.emit('select', this));
    if (options.animate) {
      this.disposer.add(
        ticker.subscribe(options.intervalMs, () => this.boil())
      );
    }
  }

  private boil(): void {
    const { jitter, cornerRadius } = this.options;
    const points = jitter.apply(this.base, this.localCenter);
    this.path.setAttribute('d', roundedPathData(points, cornerRadius));
  }

  // DialogAnchor ------------------------------------------------------------

  get element(): HTMLElement {
    return this.el;
  }

  rect() {
    return fromDOMRect(this.svg.getBoundingClientRect());
  }

  center(): Point {
    return this.toClient(this.localCenter);
  }

  outline(): Point[] {
    return this.localOutline.map((p) => this.toClient(p));
  }

  private toClient(p: Point): Point {
    const m = this.svg.getScreenCTM();
    if (!m) return p;
    return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
  }
}
