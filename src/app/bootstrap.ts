import { $$ } from '../core/component.ts';
import { Disposer, type Cleanup } from '../core/disposer.ts';
import { prefersReducedMotion } from '../core/motion.ts';
import { UserPreferences } from '../core/preferences.ts';
import { LightFlicker } from '../components/background/light-flicker.ts';
import { bindSiteHeader } from '../components/site-header/site-header.ts';
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

/** What lasts the whole visit, from page to page (see router.ts). */
export interface Site {
  dialogs: DialogManager;
  sound: SoundEngine;
}

export interface PageOptions {
  /** What the "?" in the corner says on this page (default: siteConfig.help). */
  help?: DialogContent;
  /** The text demo's key (see text-demo.ts); off for pages that use it. Default true. */
  textDemo?: boolean;
}

/**
 * Sets up what lasts the whole visit: the dialogs and the sound, so audio
 * the visitor has started keeps going from page to page. Once, on the
 * first page. Also returns a function that stops sounds held by the page
 * that's going.
 */
export function startSite(): { site: Site; releaseSounds: Cleanup } {
  // Layouts mark what a modal dialog makes inert with [data-page-root].
  const dialogs = new DialogManager(() => $$('[data-page-root]'));
  const preferences = new UserPreferences<SoundPreferences>({
    // Reduced motion is the closest thing to a "less stimulation, please"
    // setting, so it also starts sound off. The visitor can still turn it on.
    sound: soundConfig.enabledByDefault && !prefersReducedMotion(),
    volume: 1,
  });
  const sound = new SoundEngine({ config: soundConfig, preferences });
  // There was a volume slider; a level saved with it can't be changed
  // any more, so it goes back to full (the device's volume is the knob).
  if (sound.volume !== 1) sound.setVolume(1);
  const releaseSounds = bindSounds(sound, dialogs);
  return { site: { dialogs, sound }, releaseSounds };
}

/**
 * Brings each page's shared components to life, whichever its layout
 * rendered (each is optional): the title's colours, the light's flicker,
 * the header's menu, the sound button, the "?" and the text demo. Returns a function that
 * stops them, for when the page goes.
 */
export function mountLayout(
  { dialogs, sound }: Site,
  { help = siteConfig.help.dialog, textDemo = true }: PageOptions = {}
): Cleanup {
  const disposer = new Disposer();

  const title = document.querySelector<HTMLElement>('[data-rainbow]');
  if (title) {
    const rainbow = new RainbowText(title, {
      palette: siteConfig.palette,
      intervalMs: siteConfig.animation.titleColorCycleIntervalMs,
      animate: !prefersReducedMotion(),
    });
    disposer.add(() => rainbow.destroy());
  }

  const { flicker } = siteConfig.background;
  const lightsOff = document.querySelector<HTMLElement>('[data-lights-off]');
  if (lightsOff && flicker.enabled) {
    const flickering = new LightFlicker(lightsOff, flicker);
    disposer.add(() => flickering.destroy());
  }

  if (textDemo) {
    disposer.add(
      installTextDemo(
        dialogs,
        document.querySelector<HTMLElement>('[data-text-demo-anchor]') ??
          document.body
      )
    );
  }

  const header = document.querySelector<HTMLElement>('[data-site-header]');
  if (header) disposer.add(bindSiteHeader(header));

  const control = document.querySelector<HTMLElement>('[data-sound-control]');
  if (control) {
    const soundControl = new SoundControl(control, sound);
    disposer.add(() => soundControl.destroy());
  }

  // The "?" in the corner hints that there's more to click on.
  const helpButton = document.querySelector<HTMLElement>('[data-help]');
  if (helpButton) {
    const anchor = elementAnchor(helpButton);
    disposer.listen(
      helpButton,
      'click',
      () => void dialogs.toggle({ anchor, content: help })
    );
  }

  return () => disposer.dispose();
}
