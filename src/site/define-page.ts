import type { PageConfig } from './types.ts';

/**
 * Declares a page's config. `Extra` types any settings the page adds for
 * its own components, like the home page's blobs:
 *
 *   export default definePage<{ blobs: BlobConfig[] }>({ id: 'home', … });
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function definePage<Extra = {}>(
  page: PageConfig & Extra
): PageConfig & Extra {
  return page;
}
