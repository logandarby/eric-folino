/**
 * Takes away the loading indicators (loading.tsx) in `root`: what they
 * stood in for is there.
 */
export function loaded(root: ParentNode = document): void {
  for (const el of root.querySelectorAll('[data-loading]')) el.remove();
}
