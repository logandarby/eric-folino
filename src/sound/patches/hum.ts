import { noise, voice, type LoopPatch } from './patch.ts';

/**
 * Electric mains hum, for the glowing screen: two slightly detuned sawtooth
 * waves (the beating makes it waver) through a low-pass filter that slowly
 * breathes, plus a faint fizz of noise fluttering at 13 Hz. Fades in and
 * out instead of starting abruptly.
 */
export const hum: LoopPatch = {
  channel: 'ambient',
  start(c) {
    const { ctx, now: t } = c.graph;
    const { volume, pitch, fadeMs } = c.config.hum;
    const fade = fadeMs / 1000;

    const out = new GainNode(ctx, { gain: 0 });
    out.gain.setTargetAtTime(volume * 0.5, t, fade / 3);
    out.connect(c.out);

    const filter = new BiquadFilterNode(ctx, {
      type: 'lowpass',
      frequency: 520,
      Q: 2,
    });
    filter.connect(out);

    const base = new OscillatorNode(ctx, {
      type: 'sawtooth',
      frequency: pitch,
    });
    const octave = new OscillatorNode(ctx, {
      type: 'sawtooth',
      frequency: pitch * 2 + 0.7,
    });
    base.connect(filter);
    octave.connect(new GainNode(ctx, { gain: 0.4 })).connect(filter);

    const breathe = new OscillatorNode(ctx, { frequency: 0.4 });
    breathe.connect(new GainNode(ctx, { gain: 80 })).connect(filter.frequency);

    const fizzGain = new GainNode(ctx, { gain: 0.05 });
    const flutter = new OscillatorNode(ctx, { frequency: 13 });
    flutter.connect(new GainNode(ctx, { gain: 0.04 })).connect(fizzGain.gain);
    const fizz = noise(c, t, { loop: true });
    fizz
      .connect(new BiquadFilterNode(ctx, { type: 'highpass', frequency: 2500 }))
      .connect(fizzGain)
      .connect(out);

    const sources = [base, octave, breathe, flutter];
    sources.forEach((s) => s.start(t));
    return voice(c, out, [...sources, fizz], Infinity, fade);
  },
};
