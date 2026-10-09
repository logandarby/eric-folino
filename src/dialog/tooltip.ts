/*
 * A tooltip: a small box of text by something, shown at once while the
 * mouse is on it or it has keyboard focus, and gone when that ends or Esc
 * is pressed. Unlike a dialog it has nothing to click and nothing to type
 * out. It only repeats what its element already says to a screen reader
 * (its name or label), so it's hidden from them. One shows at a time.
 *
 * `tooltip()` gives an element one; a page that decides for itself when
 * to show one (the web of poems, say) uses `showTooltip()` and
 * `hideTooltip()`.
 */

/** How far the box is from what it's for. */
const GAP = 8;
/** How close it comes to the window's edges. */
const MARGIN = 8;

let box: HTMLElement | null = null;
/** Where the shown tooltip's element is, now. */
let target: (() => DOMRect) | null = null;
/**
 * The box's size and the window's width, measured once it's shown: it may
 * follow something that moves every frame, and measuring then would make
 * the browser lay out the page there and then.
 */
let size = { width: 0, height: 0, viewport: 0 };

/**
 * Shows `text` above `rect` (or below, without room), until hidden or
 * replaced. Call `repositionTooltip()` when what it's for moves.
 */
export function showTooltip(text: string, rect: () => DOMRect): void {
  box ??= createBox();
  box.textContent = text;
  box.hidden = false;
  target = rect;
  const { width, height } = box.getBoundingClientRect();
  size = { width, height, viewport: document.documentElement.clientWidth };
  repositionTooltip();
}

export function hideTooltip(): void {
  if (box) box.hidden = true;
  target = null;
}

export function repositionTooltip(): void {
  if (!box || !target) return;
  const anchor = target();
  const { width, height, viewport } = size;
  const above = anchor.top - GAP - height;
  const top = above >= MARGIN ? above : anchor.bottom + GAP;
  const left = Math.min(
    Math.max(anchor.left + anchor.width / 2 - width / 2, MARGIN),
    viewport - MARGIN - width
  );
  box.style.translate = `${Math.round(left)}px ${Math.round(top)}px`;
}

/**
 * Gives `el` a tooltip of `text()`: on mouse hover and keyboard focus,
 * not touch (a tap would show it and leave it there). `text` is read
 * again after a click, for a button whose label changes. Returns a
 * function that takes it away.
 */
export function tooltip(el: HTMLElement, text: () => string): () => void {
  const rect = () => el.getBoundingClientRect();
  let shown = false;
  const show = () => {
    shown = true;
    showTooltip(text(), rect);
  };
  const hide = () => {
    if (!shown) return;
    shown = false;
    hideTooltip();
  };
  const listeners: [string, (e: Event) => void][] = [
    [
      'pointerenter',
      (e) => (e as PointerEvent).pointerType === 'mouse' && show(),
    ],
    ['pointerleave', hide],
    ['focus', () => el.matches(':focus-visible') && show()],
    ['blur', hide],
    // After the click's own handlers, so it shows what they changed.
    ['click', () => requestAnimationFrame(() => shown && show())],
  ];
  for (const [type, listener] of listeners) el.addEventListener(type, listener);
  return () => {
    hide();
    for (const [type, listener] of listeners) {
      el.removeEventListener(type, listener);
    }
  };
}

function createBox(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tooltip';
  el.setAttribute('aria-hidden', 'true');
  el.hidden = true;
  document.body.append(el);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTooltip();
  });
  window.addEventListener('scroll', repositionTooltip, {
    passive: true,
    capture: true,
  });
  window.addEventListener('resize', () => {
    if (box && target) showTooltip(box.textContent ?? '', target);
  });
  return el;
}
