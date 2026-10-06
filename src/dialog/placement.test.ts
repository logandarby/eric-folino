import { describe, expect, it } from 'vitest';
import { intersectionArea, rect } from '../core/geometry.ts';
import { edgeCrowding, placeDialog, type PlacementInput } from './placement.ts';

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

describe('placeDialog (edge comfort)', () => {
  const comfort = 65;
  const nearTop = { ...base, anchor: rect(900, 20, 100, 50) };

  it('hugs the edge without a comfort zone', () => {
    const { rect: r } = placeDialog(nearTop);
    expect(r.y).toBeLessThan(16 + 20);
  });

  it('moves away from the edges when it can', () => {
    const { rect: r, side } = placeDialog({ ...nearTop, comfort });
    expect(side).toBe('left');
    expect(r.y).toBeGreaterThanOrEqual(16 + comfort);
    expect(intersectionArea(r, nearTop.anchor)).toBe(0);
  });

  it('leaves comfortably placed dialogs alone', () => {
    expect(placeDialog({ ...base, comfort })).toEqual(placeDialog(base));
  });

  it('still fits a dialog too big for the comfort zone', () => {
    const viewport = rect(0, 0, 500, 300);
    const { rect: r } = placeDialog({
      ...base,
      viewport,
      anchor: rect(440, 20, 40, 40),
      size: { width: 400, height: 250 },
      comfort,
    });
    expect(r.x).toBeGreaterThanOrEqual(16);
    expect(r.y).toBeGreaterThanOrEqual(16);
    expect(r.x + r.width).toBeLessThanOrEqual(500 - 16);
    expect(r.y + r.height).toBeLessThanOrEqual(300 - 16);
  });
});

describe('placeDialog (soft avoid)', () => {
  it('will cover a little of a soft area to get off the edge', () => {
    const nearTop = { ...base, anchor: rect(900, 20, 100, 50), comfort: 65 };
    // Blocks the comfortable spot left of the anchor.
    const blocker = rect(440, 90, 60, 60);
    const hard = placeDialog({ ...nearTop, avoid: [blocker] });
    const soft = placeDialog({ ...nearTop, softAvoid: [blocker] });
    expect(intersectionArea(hard.rect, blocker)).toBe(0);
    expect(intersectionArea(soft.rect, blocker)).toBeGreaterThan(0);
    expect(soft.rect.y).toBeGreaterThanOrEqual(16 + 65);
  });
});

describe('edgeCrowding', () => {
  const viewport = rect(0, 0, 1000, 800);

  it('is 0 well away from every edge and with comfort off', () => {
    expect(edgeCrowding(rect(300, 300, 200, 100), viewport, 16, 60)).toBe(0);
    expect(edgeCrowding(rect(16, 16, 200, 100), viewport, 16, 0)).toBe(0);
  });

  it('grows smoothly as the dialog nears an edge', () => {
    const at = (y: number) =>
      edgeCrowding(rect(300, y, 200, 100), viewport, 16, 60);
    expect(at(16)).toBe(1);
    expect(at(30)).toBeGreaterThan(at(50));
    expect(at(50)).toBeGreaterThan(0);
    expect(at(76)).toBe(0);
  });

  it('counts corners double', () => {
    expect(edgeCrowding(rect(16, 16, 200, 100), viewport, 16, 60)).toBe(2);
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
      comfort: 65, // ignored when docked
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
