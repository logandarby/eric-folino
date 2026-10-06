import { distance, polygonCentroid, type Point } from '../core/geometry.ts';
import { flattenPath, parsePath, serializePath } from './path.ts';
import { roundPolygon } from './round.ts';
import { simplifyPolygon } from './simplify.ts';

/**
 * A blob outline prepared for boiling: the source path flattened to a
 * polygon (the thing that gets jittered) plus its centre. Shared by the
 * build-time template and the Blob component so the first paint matches.
 */
export interface BlobShape {
  polygon: Point[];
  center: Point;
}

/**
 * @param minSpacing closest two neighbouring points may be, as a fraction
 *   of the shape's mean radius.
 */
export function blobShape(d: string, minSpacing: number): BlobShape {
  const raw = flattenPath(parsePath(d));
  const rawCenter = polygonCentroid(raw);
  const meanRadius =
    raw.reduce((sum, p) => sum + distance(p, rawCenter), 0) / raw.length;
  const polygon = simplifyPolygon(raw, minSpacing * meanRadius);
  return { polygon, center: polygonCentroid(polygon) };
}

/** Path data for a polygon with rounded corners. */
export const roundedPathData = (polygon: Point[], radius: number) =>
  serializePath(roundPolygon(polygon, radius));
