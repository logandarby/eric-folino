import { Disposer } from './disposer.ts';

/**
 * Base class for components that enhance server-rendered markup. Subclasses
 * register listeners/subscriptions through `this.disposer` so `destroy()`
 * tears everything down.
 */
export abstract class Component<E extends Element = HTMLElement> {
  protected readonly disposer = new Disposer();

  constructor(readonly el: E) {}

  destroy(): void {
    this.disposer.dispose();
  }
}

/** Finds a required element, failing loudly if the markup is missing it. */
export function $<E extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document
): E {
  const el = root.querySelector<E>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

export function $$<E extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document
): E[] {
  return Array.from(root.querySelectorAll<E>(selector));
}

/** Creates an element with classes and attributes in one go. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'class') el.className = value;
    else el.setAttribute(name, value);
  }
  el.append(...children);
  return el;
}
