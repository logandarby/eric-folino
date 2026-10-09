import type { SoundConfig } from './types.ts';
import { softVoice } from './voices.ts';

/**
 * Game-style UI sounds, all synthesized (no audio files). Kept quiet on
 * purpose; see src/sound/README.md for what each one is made of.
 */
export const soundConfig: SoundConfig = {
  enabledByDefault: true,
  volume: 0.6,
  channels: { ui: 0.7, voice: 0.45, ambient: 0.6 },
  maxVoices: 8,
  idleSuspendMs: 30_000,
  hover: { volume: 0.1, minGapMs: 50, sameTargetGapMs: 150 },
  press: { volume: 0.3, minGapMs: 80 },
  open: { volume: 0.5, minGapMs: 120, durationMs: 300 },
  close: { volume: 0.35, minGapMs: 120, durationMs: 200 },
  blip: {
    volume: 0.5,
    minGapMs: 45,
    voice: softVoice,
    pitchJitter: 0.08,
  },
  hum: { volume: 0.5, pitch: 60, fadeMs: 180 },
};
