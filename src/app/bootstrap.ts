import '../styles/main.css';

import { $, $$ } from '../core/component.ts';
import { prefersReducedMotion } from '../core/motion.ts';
import { LightFlicker } from '../components/light-flicker.ts';
import { RainbowText } from '../components/rainbow.ts';
import { SoundControl } from '../components/sound-control.ts';
import { DialogManager } from '../dialog/manager.ts';
import { siteConfig, type PageConfig } from '../site.config.ts';
import { bindSounds } from '../sound/bindings.ts';
import { UserPreferences } from '../core/preferences.ts';
import { SoundEngine, type SoundPreferences } from '../sound/sound-engine.ts';
import { installTextDemo } from './text-demo.ts';

export interface Site {
  page: PageConfig;
  dialogs: DialogManager;
  sound: SoundEngine;
  scene: HTMLElement;
}

/** Shared setup for every page: title animation, dialogs and sound. */
export function bootstrap(): Site {
  const scene = $('[data-scene]');
  const pageId = scene.dataset.page;
  const page = siteConfig.pages.find((p) => p.id === pageId);
  if (!page) throw new Error(`Unknown page "${pageId ?? ''}"`);

  new RainbowText($('[data-rainbow]'), {
    palette: siteConfig.palette,
    intervalMs: siteConfig.animation.titleColorCycleIntervalMs,
    animate: !prefersReducedMotion(),
  });

  const { flicker } = siteConfig.background;
  const lightsOff = document.querySelector<HTMLElement>('[data-lights-off]');
  if (lightsOff && flicker.enabled) {
    new LightFlicker(lightsOff, flicker);
  }

  const dialogs = new DialogManager([scene, ...$$('[data-background]')]);
  installTextDemo(dialogs, $('.title', scene));

  const preferences = new UserPreferences<SoundPreferences>({
    // Reduced motion is the closest thing to a "less stimulation, please"
    // setting, so it also starts sound off. The visitor can still turn it on.
    sound: siteConfig.sound.enabledByDefault && !prefersReducedMotion(),
    volume: 1,
  });
  const sound = new SoundEngine({ config: siteConfig.sound, preferences });
  bindSounds(sound, dialogs);
  new SoundControl($('[data-sound-control]'), sound);

  return { page, dialogs, sound, scene };
}
