import '../styles/main.css';

import { $, $$ } from '../core/component.ts';
import { prefersReducedMotion } from '../core/motion.ts';
import { LightFlicker } from '../components/light-flicker.ts';
import { RainbowText } from '../components/rainbow.ts';
import { DialogManager } from '../dialog/manager.ts';
import { siteConfig, type PageConfig } from '../site.config.ts';
import { installTextDemo } from './text-demo.ts';

export interface Site {
  page: PageConfig;
  dialogs: DialogManager;
  scene: HTMLElement;
}

/** Shared setup for every page: title animation and the dialog system. */
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
  return { page, dialogs, scene };
}
