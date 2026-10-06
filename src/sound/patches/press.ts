import { jitter, noise, pluck, voice, type OneShotPatch } from './patch.ts';

/**
 * A soft, short click, like a quiet mouse button: a tiny pop of a sine
 * dropping in pitch, under a few milliseconds of filtered noise.
 */
export const press: OneShotPatch = {
  channel: 'ui',
  play(c) {
    const { ctx, now: t } = c.graph;
    const volume = c.config.press.volume;
    const out = new GainNode(ctx, { gain: 1 });
    out.connect(c.out);

    const pitch = jitter(c, 900, 0.05);
    const pop = new OscillatorNode(ctx, { type: 'sine', frequency: pitch });
    pop.frequency.exponentialRampToValueAtTime(pitch * 0.55, t + 0.025);
    pop.connect(pluck(c, out, t, volume, 0.001, 0.03));
    pop.start(t);

    const filter = new BiquadFilterNode(ctx, {
      type: 'bandpass',
      frequency: 3000,
      Q: 1.2,
    });
    filter.connect(pluck(c, out, t, volume * 0.35, 0.001, 0.008));
    const tick = noise(c, t);
    tick.connect(filter);

    return voice(c, out, [pop, tick], t + 0.04);
  },
};
