import { describe, expect, it } from 'vitest';
import {
  center,
  rect,
  rectPolygon,
  type Point,
  type Rect,
} from '../core/geometry.ts';
import {
  crossings,
  routeConnector,
  type ConnectorOptions,
} from './connector.ts';

const options: ConnectorOptions = { edgeInset: 16, minRun: 12, clearance: 10 };
const target = (r: Rect) => ({
  rect: r,
  center: center(r),
  outline: rectPolygon(r),
});

const isOrthogonal = (points: Point[]) =>
  points.every(
    (p, i) => i === 0 || p.x === points[i - 1].x || p.y === points[i - 1].y
  );

describe('routeConnector', () => {
  const dialog = rect(100, 100, 200, 100);

  it('draws a straight line when the target lines up with a side edge', () => {
    const points = routeConnector(
      dialog,
      target(rect(400, 130, 40, 40)),
      options
    );
    expect(points).toEqual([
      { x: 300, y: 150 },
      { x: 400, y: 150 },
    ]);
  });

  it('turns once when the target is diagonal, ending on its outline', () => {
    const points = routeConnector(
      dialog,
      target(rect(400, 300, 40, 40)),
      options
    );
    expect(points).toHaveLength(3);
    expect(isOrthogonal(points)).toBe(true);
    expect(points[0].x).toBe(300);
    expect(points[2]).toEqual({ x: 420, y: 300 }); // top edge of target
  });

  it('leaves from the top edge when the target is above', () => {
    const points = routeConnector(
      dialog,
      target(rect(180, 0, 40, 40)),
      options
    );
    expect(points).toEqual([
      { x: 200, y: 100 },
      { x: 200, y: 40 },
    ]);
  });

  it('detours around obstacles between dialog and target', () => {
    // Target above the dialog with a wider obstacle in between.
    const goal = rect(150, 0, 60, 30);
    const obstacle = rect(140, 50, 90, 30);
    const direct = routeConnector(dialog, target(goal), options);
    expect(crossings(direct, [obstacle])).toBe(1);

    const routed = routeConnector(dialog, target(goal), {
      ...options,
      obstacles: [obstacle],
    });
    expect(crossings(routed, [obstacle])).toBe(0);
    expect(isOrthogonal(routed)).toBe(true);
    // Enters the target from one of its sides.
    expect([150, 210]).toContain(routed[routed.length - 1].x);
  });

  it('returns nothing when the target is inside the dialog', () => {
    expect(
      routeConnector(dialog, target(rect(150, 120, 20, 20)), options)
    ).toEqual([]);
  });
});
