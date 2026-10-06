import { describe, expect, it } from 'vitest';
import type { FlickerConfig } from '../../site/types.ts';
import { dimBurst, flickerBurst, nextBurst } from './flicker-burst.ts';

const config: FlickerConfig = {
  enabled: true,
  minGapMs: 4000,
  maxGapMs: 14000,
  maxBlinks: 3,
  brownoutChance: 0.2,
  flickerDepth: 0.65,
  dimChance: 0.35,
  dimDurationMs: 1000,
  dimDepth: 0.55,
};

/** Deterministic pseudo-random sequence. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Times the light goes from on (opacity 0) to out. */
const blinks = (keyframes: Keyframe[]) =>
  keyframes.filter(
    (k, i) => i > 0 && keyframes[i - 1].opacity === 0 && Number(k.opacity) > 0
  ).length;

describe('flickerBurst', () => {
  it('produces valid keyframes that start and end with the light on', () => {
    for (let seed = 1; seed < 200; seed++) {
      const { keyframes, duration } = flickerBurst(config, seeded(seed));
      expect(duration).toBeGreaterThan(0);
      expect(keyframes[0].opacity).toBe(0);
      expect(keyframes[keyframes.length - 1].opacity).toBe(0);
      const offsets = keyframes.map((k) => Number(k.offset));
      expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
      expect(Math.min(...offsets)).toBe(0);
      expect(Math.max(...offsets)).toBe(1);
      for (const k of keyframes) {
        expect(Number(k.opacity)).toBeGreaterThanOrEqual(0);
        expect(Number(k.opacity)).toBeLessThanOrEqual(config.flickerDepth);
      }
    }
  });

  it('never blinks more than maxBlinks times (WCAG: ≤ 3 flashes a second)', () => {
    for (let seed = 1; seed < 200; seed++) {
      const { keyframes } = flickerBurst(config, seeded(seed));
      const n = blinks(keyframes);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(config.maxBlinks);
    }
  });

  it('cuts instantly between levels', () => {
    const { keyframes } = flickerBurst(config, seeded(7));
    // Every level change happens at a repeated offset (a hard cut).
    for (let i = 1; i < keyframes.length; i++) {
      if (keyframes[i].opacity !== keyframes[i - 1].opacity) {
        expect(keyframes[i].offset).toBe(keyframes[i - 1].offset);
      }
    }
  });
});

describe('dimBurst', () => {
  it('eases down to about dimDepth and back up over about dimDurationMs', () => {
    for (let seed = 1; seed < 50; seed++) {
      const { keyframes, duration } = dimBurst(config, seeded(seed));
      expect(duration).toBeGreaterThanOrEqual(850);
      expect(duration).toBeLessThanOrEqual(1150);
      expect(keyframes[0].opacity).toBe(0);
      expect(keyframes[keyframes.length - 1].opacity).toBe(0);
      const peak = Math.max(...keyframes.map((k) => Number(k.opacity)));
      expect(peak).toBeGreaterThan(config.dimDepth * 0.8);
      expect(peak).toBeLessThan(config.dimDepth * 1.2);
      // Smooth: no hard cuts.
      const offsets = keyframes.map((k) => k.offset);
      expect(new Set(offsets).size).toBe(offsets.length);
    }
  });
});

describe('nextBurst', () => {
  it('picks a dim or a flicker according to dimChance', () => {
    const always = { ...config, dimChance: 1 };
    const never = { ...config, dimChance: 0 };
    expect(nextBurst(always, seeded(3)).keyframes).toHaveLength(4);
    expect(nextBurst(never, seeded(3)).keyframes.length).toBeGreaterThan(4);
  });
});
