import { jitter, pluck, voice, type OneShotPatch } from './patch.ts';

/** A faint menu tick: a sine whose pitch dips as it fades. */
export const hover: OneShotPatch = {
  channel: 'ui',
  play(c) {
    const { ctx, now: t } = c.graph;
    const pitch = jitter(c, 800, 0.04);
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: pitch });
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.7, t + 0.03);
    const env = pluck(c, c.out, t, c.config.hover.volume, 0.002, 0.03);
    osc.connect(env);
    osc.start(t);
    return voice(c, env, [osc], t + 0.035);
  },
};
