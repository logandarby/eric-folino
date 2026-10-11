import type { SoundConfig } from './types.ts';
import { softVoice } from './voices.ts';

/**
 * Game-style UI sounds, all synthesized (no audio files); see
 * src/sound/README.md for what each one is made of. The press, swooshes
 * and blips are set to sit about as loud as the recorded paper and
 * cassette sounds (src/assets/audio/); the hover tick stays quiet.
 */
export const soundConfig: SoundConfig = {
  enabledByDefault: true,
  volume: 0.6,
  channels: { ui: 0.7, voice: 0.45, ambient: 0.6 },
  maxVoices: 8,
  idleSuspendMs: 30_000,
  hover: { volume: 0.1, minGapMs: 50, sameTargetGapMs: 150 },
  press: { volume: 1, minGapMs: 80 },
  open: { volume: 1.2, minGapMs: 120, durationMs: 300 },
  close: { volume: 1, minGapMs: 120, durationMs: 200 },
  blip: {
    volume: 0.75,
    minGapMs: 45,
    voice: softVoice,
    pitchJitter: 0.08,
  },
  hum: { volume: 0.5, pitch: 60, fadeMs: 180 },
};
