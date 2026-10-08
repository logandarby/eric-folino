import { $$ } from '../core/component.ts';
import { prefersReducedMotion } from '../core/motion.ts';
import { UserPreferences } from '../core/preferences.ts';
import { LightFlicker } from '../components/background/light-flicker.ts';
import { SoundControl } from '../components/sound-control/sound-control.ts';
import { RainbowText } from '../components/title/rainbow.ts';
import { elementAnchor } from '../dialog/anchor.ts';
import { DialogManager } from '../dialog/manager.ts';
import { siteConfig } from '../site/site.config.ts';
import { soundConfig } from '../site/sound.config.ts';
import type { DialogContent } from '../site/types.ts';
import { bindSounds } from '../sound/bindings.ts';
import { SoundEngine, type SoundPreferences } from '../sound/sound-engine.ts';
import { installTextDemo } from './text-demo.ts';

export interface Site {
  dialogs: DialogManager;
  sound: SoundEngine;
}

export interface BootstrapOptions {
  /** What the "?" in the corner says on this page (default: siteConfig.help). */
  help?: DialogContent;
}

/**
 * Shared setup for every page: dialogs and sound, plus whichever shared
 * components the page's layout rendered (each is optional).
 */
export function bootstrap({
  help = siteConfig.help.dialog,
}: BootstrapOptions = {}): Site {
  const title = document.querySelector<HTMLElement>('[data-rainbow]');
  if (title) {
    new RainbowText(title, {
      palette: siteConfig.palette,
      intervalMs: siteConfig.animation.titleColorCycleIntervalMs,
      animate: !prefersReducedMotion(),
    });
  }

  const { flicker } = siteConfig.background;
  const lightsOff = document.querySelector<HTMLElement>('[data-lights-off]');
  if (lightsOff && flicker.enabled) {
    new LightFlicker(lightsOff, flicker);
  }

  // Layouts mark what a modal dialog makes inert with [data-page-root].
  const dialogs = new DialogManager($$('[data-page-root]'));
  installTextDemo(
    dialogs,
    document.querySelector<HTMLElement>('[data-text-demo-anchor]') ??
      document.body
  );

  const preferences = new UserPreferences<SoundPreferences>({
    // Reduced motion is the closest thing to a "less stimulation, please"
    // setting, so it also starts sound off. The visitor can still turn it on.
    sound: soundConfig.enabledByDefault && !prefersReducedMotion(),
    volume: 1,
  });
  const sound = new SoundEngine({ config: soundConfig, preferences });
  bindSounds(sound, dialogs);
  const control = document.querySelector<HTMLElement>('[data-sound-control]');
  if (control) new SoundControl(control, sound);

  // The "?" in the corner hints that there's more to click on.
  const helpButton = document.querySelector<HTMLElement>('[data-help]');
  if (helpButton) {
    const anchor = elementAnchor(helpButton);
    helpButton.addEventListener(
      'click',
      () => void dialogs.toggle({ anchor, content: help })
    );
  }

  return { dialogs, sound };
}
