import {
  center,
  fromDOMRect,
  rectPolygon,
  type Point,
  type Rect,
} from '../core/geometry.ts';
import type { SpotlightStyle } from './spotlight.ts';

/**
 * Anything a dialog can point at. All geometry is in viewport (client)
 * coordinates and is re-read on every layout pass.
 */
export interface DialogAnchor {
  /** Spotlit while its dialog is open. */
  readonly element: HTMLElement;
  /** How it shows through the dim layer. Default `lift`. */
  readonly spotlight?: SpotlightStyle;
  rect(): Rect;
  /** Where the connector aims. */
  center(): Point;
  /** Closed polygon the connector stops at. */
  outline(): Point[];
}

/** Anchors to an element's bounding box. */
export function elementAnchor(
  element: HTMLElement,
  spotlight?: SpotlightStyle
): DialogAnchor {
  const rect = () => fromDOMRect(element.getBoundingClientRect());
  return {
    element,
    spotlight,
    rect,
    center: () => center(rect()),
    outline: () => rectPolygon(rect()),
  };
}
