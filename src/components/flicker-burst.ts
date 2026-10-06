import type { FlickerConfig } from '../site.config.ts';

export interface FlickerBurst {
  /** Opacity keyframes for the "lights off" layer (0 = on, 1 = off). */
  keyframes: Keyframe[];
  duration: number;
}

type Random = () => number;

const between = (random: Random, min: number, max: number) =>
  min + random() * (max - min);

/**
 * One blink: [ms the light is out, how far out (0..1, before scaling by
 * flickerDepth), ms back on after].
 */
function blink(
  config: FlickerConfig,
  random: Random
): [number, number, number] {
  if (random() < config.brownoutChance) {
    // A sagging brown-out: dims for a while, never quite fully off.
    return [between(random, 350, 900), between(random, 0.6, 0.85), 0];
  }
  // A quick stutter: drops (almost) fully out for a moment.
  return [
    between(random, 40, 140),
    between(random, 0.85, 1),
    between(random, 60, 220),
  ];
}

/**
 * The next thing the light does: usually a flicker burst, sometimes
 * (`dimChance`) a smooth dim.
 */
export function nextBurst(
  config: FlickerConfig,
  random: Random = Math.random
): FlickerBurst {
  return random() < config.dimChance
    ? dimBurst(config, random)
    : flickerBurst(config, random);
}

/**
 * A slow sag: eases down to roughly `dimDepth`, holds, and eases back up
 * over about `dimDurationMs`, like the supply briefly dipping.
 */
export function dimBurst(
  config: FlickerConfig,
  random: Random = Math.random
): FlickerBurst {
  const duration = config.dimDurationMs * between(random, 0.85, 1.15);
  const depth = Math.min(1, config.dimDepth * between(random, 0.85, 1.15));
  const ease = 'ease-in-out';
  return {
    keyframes: [
      { opacity: 0, offset: 0, easing: ease },
      { opacity: depth, offset: 0.35 },
      { opacity: depth, offset: 0.6, easing: ease },
      { opacity: 0, offset: 1 },
    ],
    duration,
  };
}

/**
 * A burst of 1..maxBlinks blinks as hard-cut opacity keyframes (repeated
 * offsets make instant jumps, like a failing tube rather than a fade).
 */
export function flickerBurst(
  config: FlickerConfig,
  random: Random = Math.random
): FlickerBurst {
  const count = 1 + Math.floor(random() * Math.max(1, config.maxBlinks));
  const segments: { at: number; opacity: number }[] = [];
  let t = 0;
  for (let i = 0; i < count; i++) {
    const [off, depth, on] = blink(config, random);
    segments.push(
      { at: t, opacity: depth * config.flickerDepth },
      { at: t + off, opacity: 0 }
    );
    t += off + (i < count - 1 ? on : 0);
  }

  const keyframes: Keyframe[] = [{ opacity: 0, offset: 0 }];
  for (const { at, opacity } of segments) {
    const offset = at / t;
    const previous = keyframes[keyframes.length - 1].opacity;
    keyframes.push({ opacity: previous, offset }, { opacity, offset });
  }
  keyframes.push({ opacity: 0, offset: 1 });
  return { keyframes, duration: t };
}
