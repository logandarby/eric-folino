/** How long to wait for the next page's stylesheets before showing it anyway. */
const STYLESHEET_TIMEOUT_MS = 3000;

/** The <html> attributes that differ from page to page. */
const ATTRIBUTES = ['lang', 'data-page'];

/**
 * Brings over what the next page's <head> sets, for the router: its
 * stylesheets and the attributes on <html>. Swup does the title, and the
 * rest of a <head> is the same on every page or only matters on arrival
 * (its script is the router's, see router.ts).
 *
 * The stylesheets keep the next page's order, since a later sheet
 * overrides an earlier one of the same specificity (see
 * build/css-order.ts). Sheets both pages link stay where they are, as
 * moving a <link> makes the browser load it again; the new ones go in
 * between, in place. Resolves once they've loaded and the old page's are
 * gone, so the next page never shows unstyled.
 */
export async function updateHead(next: Document): Promise<void> {
  const head = document.head;
  const have = new Map(stylesheets(document).map((l) => [href(l), l]));
  const want = stylesheets(next);
  const kept = want.flatMap((l) => have.get(href(l)) ?? []);
  // Pages link the sheets they share in the same order, so this is rare.
  const keptInOrder = kept.every(
    (l, i) =>
      i === 0 ||
      kept[i - 1].compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING
  );

  // From the last sheet back, each goes just before the one after it.
  const added: HTMLLinkElement[] = [];
  const last = [...have.values()].pop();
  let before: Node | null = last ? last.nextSibling : null;
  for (const link of [...want].reverse()) {
    let el = have.get(href(link));
    if (!el) {
      el = document.importNode(link, true);
      added.push(el);
    }
    if (!have.has(href(link)) || !keptInOrder) head.insertBefore(el, before);
    before = el;
  }

  await Promise.all(added.map(loaded));
  const wanted = new Set(want.map(href));
  for (const [key, el] of have) if (!wanted.has(key)) el.remove();

  const html = document.documentElement;
  for (const name of ATTRIBUTES) {
    const value = next.documentElement.getAttribute(name);
    if (value === null) html.removeAttribute(name);
    else html.setAttribute(name, value);
  }
}

function stylesheets(doc: Document): HTMLLinkElement[] {
  return [
    ...doc.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ];
}

const href = (link: HTMLLinkElement) => link.getAttribute('href') ?? '';

/** Resolves when `link` has loaded or failed, or after a while. */
function loaded(link: HTMLLinkElement): Promise<void> {
  return new Promise((resolve) => {
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    setTimeout(resolve, STYLESHEET_TIMEOUT_MS);
  });
}
