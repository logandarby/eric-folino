import type { DialogVoice } from '../../site/types.ts';
import {
  jitter,
  noise,
  pluck,
  voice,
  type OneShotPatch,
  type PatchContext,
} from './patch.ts';

/**
 * One "talking" blip per letter, like Undertale: a very short tone at the
 * dialog's voice pitch, nudged randomly so speech sounds alive. A low-pass
 * filter takes the edge off square and sawtooth waves. The 'noise' voice
 * whispers instead (see `whisper`).
 */
export const blip: OneShotPatch = {
  channel: 'voice',
  play(c, { voice: dialogVoice }) {
    const settings = c.config.blip;
    const v = { ...settings.voice, ...dialogVoice };
    const frequency = jitter(c, v.pitch, settings.pitchJitter);
    const { wave } = v;
    if (wave === 'noise') return whisper(c, frequency);

    const { ctx, now: t } = c.graph;
    const attack = (v.attackMs ?? 3) / 1000;
    const release = (v.releaseMs ?? 40) / 1000;
    const end = t + attack + release;
    const filter = new BiquadFilterNode(ctx, {
      type: 'lowpass',
      frequency: v.cutoffHz ?? 2400,
    });
    const env = pluck(c, c.out, t, settings.volume, attack, release);
    filter.connect(env);

    // Unison copies are spread evenly across the detune range and turned
    // down so the stack is no louder than one.
    const copies = Math.max(1, v.unison?.voices ?? 1);
    const spread = copies > 1 ? (v.unison?.spreadCents ?? 0) : 0;
    const mix = new GainNode(ctx, { gain: 1 / Math.sqrt(copies) });
    mix.connect(filter);
    const oscs = Array.from({ length: copies }, (_, i) => {
      const detune = copies > 1 ? spread * (i / (copies - 1) - 0.5) : 0;
      const osc = new OscillatorNode(ctx, { type: wave, frequency, detune });
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.97, end);
      osc.connect(mix);
      osc.start(t);
      return osc;
    });
    return voice(c, env, oscs, end + 0.005);
  },
};

/**
 * A hushed, breathy syllable: pink noise (softer than white's hiss) through
 * a broad band-pass around `frequency`, with the top rolled off. It eases
 * in and lingers, so consecutive letters blur into one breath instead of
 * clicking. Filtered noise is quiet, so it's boosted to sit level with the
 * tonal voices.
 */
function whisper(c: PatchContext, frequency: DialogVoice['pitch']) {
  const { ctx, now: t } = c.graph;
  const env = pluck(c, c.out, t, c.config.blip.volume * 1.6, 0.03, 0.13);
  const source = noise(c, t, { colour: 'brown' });
  source
    .connect(new BiquadFilterNode(ctx, { type: 'bandpass', frequency, Q: 0.6 }))
    .connect(new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 4000 }))
    .connect(env);
  return voice(c, env, [source], t + 0.17);
}
