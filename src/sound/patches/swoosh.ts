import type { SoundConfig } from '../../site.config.ts';
import { noise, voice, type OneShotPatch } from './patch.ts';

/**
 * Air rushing past: noise through a band-pass filter that sweeps up (open)
 * or down (close), swelling and fading.
 */
function swoosh(
  name: 'open' | 'close',
  from: number,
  to: number
): OneShotPatch {
  return {
    channel: 'ui',
    play(c) {
      const { ctx, now: t } = c.graph;
      const settings: SoundConfig['open'] = c.config[name];
      const end = t + settings.durationMs / 1000;

      const filter = new BiquadFilterNode(ctx, {
        type: 'bandpass',
        frequency: from,
        Q: 0.9,
      });
      filter.frequency.exponentialRampToValueAtTime(to, end);

      const env = new GainNode(ctx, { gain: 0 });
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(
        settings.volume * 0.6,
        t + (end - t) * 0.35
      );
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      env.connect(c.out);

      const source = noise(c, t);
      source.connect(filter).connect(env);
      return voice(c, env, [source], end);
    },
  };
}

export const open = swoosh('open', 350, 2600);
export const close = swoosh('close', 2000, 300);
