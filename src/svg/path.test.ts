import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { flattenPath, parsePath, serializePath } from './path.ts';

describe('parsePath', () => {
  it('normalises H/V and relative commands to absolute L', () => {
    expect(parsePath('M10 10h5v5l-5 0z')).toEqual([
      { type: 'M', points: [{ x: 10, y: 10 }] },
      { type: 'L', points: [{ x: 15, y: 10 }] },
      { type: 'L', points: [{ x: 15, y: 15 }] },
      { type: 'L', points: [{ x: 10, y: 15 }] },
      { type: 'Z', points: [] },
    ]);
  });

  it('treats extra pairs after M as line-tos', () => {
    expect(parsePath('M0 0 10 0 10 10').map((c) => c.type)).toEqual([
      'M',
      'L',
      'L',
    ]);
  });

  it('handles exponents, implicit separators and leading dots', () => {
    const cmds = parsePath('M1.5e-5-2L.5.5');
    expect(cmds[0].points[0]).toEqual({ x: 1.5e-5, y: -2 });
    expect(cmds[1].points[0]).toEqual({ x: 0.5, y: 0.5 });
  });

  it('reflects the previous control point for S', () => {
    const [, , s] = parsePath('M0 0C0 10 10 10 10 0S20 -10 20 0');
    expect(s.points[0]).toEqual({ x: 10, y: -10 });
  });

  it('rejects arcs', () => {
    expect(() => parsePath('M0 0A5 5 0 0 1 10 10')).toThrow(/Unsupported/);
  });

  it('parses every blob asset', () => {
    const dir = new URL('../assets/blobs/', import.meta.url);
    for (const file of readdirSync(dir)) {
      const svg = readFileSync(new URL(file, dir), 'utf8');
      const d = /\sd="([^"]+)"/.exec(svg)?.[1] ?? '';
      expect(() => parsePath(d), file).not.toThrow();
      expect(flattenPath(parsePath(d)).length, file).toBeGreaterThan(3);
    }
  });
});

describe('serializePath', () => {
  it('round-trips', () => {
    const d = 'M0 0L10 0C10 5 5 10 0 10Z';
    expect(serializePath(parsePath(d))).toBe(d);
  });
});

describe('flattenPath', () => {
  it('drops a closing point that repeats the start', () => {
    expect(flattenPath(parsePath('M0 0L10 0L10 10L0 0Z'))).toHaveLength(3);
  });

  it('samples curves', () => {
    expect(flattenPath(parsePath('M0 0C0 10 10 10 10 0'), 4)).toHaveLength(5);
  });
});
