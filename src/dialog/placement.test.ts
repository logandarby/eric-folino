import { describe, expect, it } from 'vitest';
import { intersectionArea, rect } from '../core/geometry.ts';
import { placeDialog, type PlacementInput } from './placement.ts';

const base: PlacementInput = {
  anchor: rect(900, 200, 100, 50),
  size: { width: 400, height: 200 },
  viewport: rect(0, 0, 1440, 810),
  mode: 'floating',
  margin: 16,
  gap: 40,
  edgeInset: 16,
  sides: ['left', 'right', 'bottom', 'top'],
};

describe('placeDialog (floating)', () => {
  it('uses the preferred side when there is room', () => {
    const { rect: r, side } = placeDialog(base);
    expect(side).toBe('left');
    expect(r.x + r.width).toBe(900 - 40);
    expect(r.y).toBe(225 - 16); // top-aligned with the anchor centre
  });

  it('falls back to another side when the preferred one is off-screen', () => {
    const { side, rect: r } = placeDialog({
      ...base,
      anchor: rect(50, 200, 100, 50),
    });
    expect(side).toBe('right');
    expect(r.x).toBe(190);
  });

  it('never covers the anchor and stays inside the viewport', () => {
    for (const anchor of [
      rect(0, 0, 80, 80),
      rect(1360, 730, 80, 80),
      rect(700, 380, 60, 60),
    ]) {
      const { rect: r } = placeDialog({ ...base, anchor });
      expect(intersectionArea(r, anchor)).toBe(0);
      expect(r.x).toBeGreaterThanOrEqual(16);
      expect(r.y).toBeGreaterThanOrEqual(16);
      expect(r.x + r.width).toBeLessThanOrEqual(1440 - 16);
      expect(r.y + r.height).toBeLessThanOrEqual(810 - 16);
    }
  });

  it('steers clear of avoid areas', () => {
    const avoid = [rect(400, 150, 300, 200)];
    const { rect: r } = placeDialog({ ...base, avoid });
    expect(intersectionArea(r, avoid[0])).toBe(0);
  });
});

describe('placeDialog (docked)', () => {
  const docked = {
    ...base,
    mode: 'docked' as const,
    size: { width: 358, height: 200 },
    viewport: rect(0, 0, 390, 844),
  };

  it('docks to the bottom when the anchor is in the top half', () => {
    const { rect: r, side } = placeDialog({
      ...docked,
      anchor: rect(40, 80, 90, 40),
    });
    expect(side).toBe('bottom');
    expect(r).toEqual(rect(16, 844 - 16 - 200, 358, 200));
  });

  it('docks to the top when the anchor is in the bottom half', () => {
    const { rect: r, side } = placeDialog({
      ...docked,
      anchor: rect(40, 700, 90, 40),
    });
    expect(side).toBe('top');
    expect(r.y).toBe(16);
  });

  it('centres a sheet narrower than the viewport', () => {
    const { rect: r } = placeDialog({
      ...docked,
      size: { width: 576, height: 200 },
      viewport: rect(0, 0, 820, 1180),
      anchor: rect(40, 80, 90, 40),
    });
    expect(r.x).toBe(122);
  });
});
