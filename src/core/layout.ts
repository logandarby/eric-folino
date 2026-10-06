import { siteConfig } from '../site/site.config.ts';
import type { LayoutName } from '../site/types.ts';
import type { Cleanup } from './disposer.ts';

/*
 * The active layout is written to <html data-layout> by a tiny inline script
 * in <head> (see src/layouts/head.tsx) so CSS has it before first paint. This
 * module mirrors that for scripts.
 */

const query = matchMedia(siteConfig.layout.compactQuery);

export const currentLayout = (): LayoutName =>
  query.matches ? 'compact' : 'wide';

export function onLayoutChange(handler: (layout: LayoutName) => void): Cleanup {
  const listener = () => handler(currentLayout());
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
