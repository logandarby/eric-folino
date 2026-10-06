import type { DialogVoice, SoundConfig } from '../../site/types.ts';
import type { AudioGraph, Channel, NoiseColour } from '../audio-graph.ts';
import type { Voice } from '../rate-limit.ts';

/** Everything a patch needs to make its sound. */
export interface PatchContext {
  graph: AudioGraph;
  /** Where to connect: the patch's channel. */
  out: AudioNode;
  config: SoundConfig;
  random: () => number;
}

export interface PlayOptions {
  /** The element that triggered the sound, for per-element rate limits. */
  target?: object;
  /** Blips only: the speaking dialog's voice. */
  voice?: Partial<DialogVoice>;
}

/** A sound that plays once and ends by itself. */
export interface OneShotPatch {
  channel: Channel;
  play(c: PatchContext, options: PlayOptions): Voice;
}

/** A sound that plays until stopped. */
export interface LoopPatch {
  channel: Channel;
  start(c: PatchContext): Voice;
}

/** Silence below this counts as off (exponential ramps can't reach 0). */
const FLOOR = 0.0001;

/**
 * A gain that rises to `peak` over `attack` seconds from `at`, then falls
 * away exponentially until `at + attack + release`. Connected to `out`.
 */
export function pluck(
  c: PatchContext,
  out: AudioNode,
  at: number,
  peak: number,
  attack: number,
  release: number
): GainNode {
  const gain = new GainNode(c.graph.ctx, { gain: 0 });
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(FLOOR, at + attack + release);
  gain.connect(out);
  return gain;
}

/** A stretch of the shared noise, started at `at`. */
export function noise(
  c: PatchContext,
  at: number,
  {
    loop = false,
    colour = 'white',
  }: { loop?: boolean; colour?: NoiseColour } = {}
) {
  const source = new AudioBufferSourceNode(c.graph.ctx, {
    buffer: c.graph.noise(colour),
    loop,
  });
  // Start somewhere random so repeated bursts don't sound identical.
  source.start(at, c.random() * 0.5);
  return source;
}

/**
 * Wraps a patch's nodes as a Voice: it ends at `endsAt` by itself, or fades
 * out over `fadeS` when stopped early. `output` is the patch's last gain.
 */
export function voice(
  c: PatchContext,
  output: GainNode,
  sources: AudioScheduledSourceNode[],
  endsAt: number,
  fadeS = 0.015
): Voice {
  const { ctx } = c.graph;
  if (Number.isFinite(endsAt)) sources.forEach((s) => s.stop(endsAt));
  sources[0].addEventListener('ended', () => output.disconnect());

  let stopped = false;
  return {
    get endsAt() {
      return stopped ? 0 : endsAt;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      output.gain.cancelScheduledValues(now);
      output.gain.setValueAtTime(output.gain.value, now);
      output.gain.setTargetAtTime(0, now, fadeS / 3);
      sources.forEach((s) => {
        try {
          s.stop(now + fadeS * 2);
        } catch {
          // Already stopped.
        }
      });
    },
  };
}

/** `value` nudged randomly by up to ±`amount` (a fraction). */
export const jitter = (c: PatchContext, value: number, amount: number) =>
  value * (1 + (c.random() * 2 - 1) * amount);
