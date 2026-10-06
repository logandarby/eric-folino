import type { Cleanup } from './disposer.ts';

/** The script for an island: brings one `[data-island]` element to life. */
export interface Island {
  mount(el: HTMLElement): Cleanup | undefined;
}

export type IslandLoaders = Record<string, () => Promise<Island>>;

/** Islands start loading this far before they scroll into view. */
const LOAD_MARGIN = '300px';

/**
 * Islands: markup rendered at build time whose script loads only when it's
 * needed. A page lists the islands it can have, as dynamic imports, so
 * each becomes its own small bundle:
 *
 *   hydrateIslands({ 'video-embed': () => import('…/video-embed.ts') });
 *
 * An element `<div data-island="video-embed">` then fetches and mounts its
 * script when it nears the viewport, or straight away with
 * `data-island-load="eager"`. Heavy things (shaders, players) cost nothing
 * until someone gets close to them.
 */
export function hydrateIslands(
  loaders: IslandLoaders,
  root: ParentNode = document
): Cleanup {
  const cleanups: Cleanup[] = [];
  let disposed = false;

  const mount = (el: HTMLElement) => {
    const name = el.dataset.island ?? '';
    const load = loaders[name];
    if (!load) {
      console.warn(`No loader for island "${name}"`, el);
      return;
    }
    void load().then((island) => {
      if (disposed) return;
      const cleanup = island.mount(el);
      if (cleanup) cleanups.push(cleanup);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        mount(entry.target as HTMLElement);
      }
    },
    { rootMargin: LOAD_MARGIN }
  );

  for (const el of root.querySelectorAll<HTMLElement>('[data-island]')) {
    if (el.dataset.islandLoad === 'eager') mount(el);
    else observer.observe(el);
  }

  return () => {
    disposed = true;
    observer.disconnect();
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
}
