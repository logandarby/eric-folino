import type { LayoutName, TextPlacement } from '../site/types.ts';

/*
 * Build-time helpers for the stage layout: positions from the config become
 * per-layout CSS variables (--x-wide, --x-compact, …), and stage.css picks
 * the set for the current layout.
 */

export const LAYOUTS: LayoutName[] = ['wide', 'compact'];

export type CssVars = Record<string, string>;

/** One variable per layout: `name` → `--name-wide`, `--name-compact`. */
export function perLayout(
  values: (layout: LayoutName) => Record<string, string | number>
): CssVars {
  return Object.fromEntries(
    LAYOUTS.flatMap((layout) =>
      Object.entries(values(layout)).map(([name, value]) => [
        `--${name}-${layout}`,
        String(value),
      ])
    )
  );
}

export function placementVars(
  get: (layout: LayoutName) => TextPlacement
): CssVars {
  return perLayout((layout) => {
    const p = get(layout);
    return {
      x: `${p.x}%`,
      y: `${p.y}%`,
      fs: p.fontSize,
      tx: { start: '0%', center: '-50%', end: '-100%' }[p.align ?? 'start'],
    };
  });
}
