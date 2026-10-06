import { blip } from './blip.ts';
import { hover } from './hover.ts';
import { hum } from './hum.ts';
import type { LoopPatch, OneShotPatch } from './patch.ts';
import { press } from './press.ts';
import { close, open } from './swoosh.ts';

/** Every sound the site makes. Adding a name here needs a patch to compile. */
export type OneShotName = 'hover' | 'press' | 'open' | 'close' | 'blip';
export type LoopName = 'hum';

export interface PatchRegistry {
  oneShots: Record<OneShotName, OneShotPatch>;
  loops: Record<LoopName, LoopPatch>;
}

export const PATCHES: PatchRegistry = {
  oneShots: { hover, press, open, close, blip },
  loops: { hum },
};

export type { PlayOptions } from './patch.ts';
