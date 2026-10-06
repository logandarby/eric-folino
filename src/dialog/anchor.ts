import {
  center,
  fromDOMRect,
  rectPolygon,
  type Point,
  type Rect,
} from '../core/geometry.ts';

/**
 * Anything a dialog can point at. All geometry is in viewport (client)
 * coordinates and is re-read on every layout pass.
 */
export interface DialogAnchor {
  /** Lifted above the dim layer while its dialog is open. */
  readonly element: HTMLElement;
  rect(): Rect;
  /** Where the connector aims. */
  center(): Point;
  /** Closed polygon the connector stops at. */
  outline(): Point[];
}

/** Anchors to an element's bounding box. */
export function elementAnchor(element: HTMLElement): DialogAnchor {
  const rect = () => fromDOMRect(element.getBoundingClientRect());
  return {
    element,
    rect,
    center: () => center(rect()),
    outline: () => rectPolygon(rect()),
  };
}
