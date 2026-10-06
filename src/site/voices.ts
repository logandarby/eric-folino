import type { DialogVoice } from './types.ts';

/*
 * Voices for dialog text blips. Give a dialog one with `voice: hushVoice`;
 * dialogs without one use `sound.blip.voice`.
 */

/** Soft and high: the default. */
export const softVoice: DialogVoice = { pitch: 620, wave: 'sine' };
/** Chirpy chiptune square wave. */
export const sillyVoice: DialogVoice = { pitch: 440, wave: 'square' };
/** Low and buzzy, like an old machine typing. */
export const typewriterVoice: DialogVoice = { pitch: 170, wave: 'sawtooth' };
/**
 * The bus stop screen: a smooth, droning stack of detuned saws, pitched at
 * a harmonic of its 60 Hz hum. Letters ease in and linger like the hush
 * voice, so they blend into one wavering drone, and the filter is low to
 * keep the saws from buzzing.
 */
export const screenVoice: DialogVoice = {
  pitch: 80,
  wave: 'sawtooth',
  attackMs: 30,
  releaseMs: 130,
  cutoffHz: 1100,
  unison: { voices: 3, spreadCents: 24 },
};
/** A hushed whisper: soft breaths of pink noise. */
export const hushVoice: DialogVoice = { pitch: 1400, wave: 'noise' };
