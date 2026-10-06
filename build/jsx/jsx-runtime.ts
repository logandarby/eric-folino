/**
 * A tiny JSX runtime that renders to HTML strings at build time. No React,
 * no virtual DOM: `<p class="x">{text}</p>` becomes an `Html` value whose
 * text and attributes are escaped. Wired up in tsconfig.json
 * (`jsxImportSource: "#jsx"`, which package.json maps to this file).
 *
 * Differences from React:
 * - attributes are plain HTML: `class`, `for`, `aria-label`, `data-x`;
 * - `true` renders a bare attribute, `false`/`null`/`undefined` omit it;
 * - `style` takes a string or an object of properties (custom properties
 *   too), written as-is;
 * - text is always escaped. Use `raw()` for markup you trust, like inlined
 *   SVG, rendered Markdown or the contents of <script> and <style>.
 */

/** Rendered HTML. Wrapping it (rather than using strings) is what lets
 * the runtime tell markup apart from text that needs escaping. */
export class Html {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

export type Child =
  Html | string | number | boolean | null | undefined | Child[];

type AttributeValue = string | number | boolean | null | undefined;
export type Style = string | Record<string, string | number>;

interface Attributes {
  [name: string]: AttributeValue | Style | Child;
  style?: Style;
  children?: Child;
}

type Component<P> = (props: P) => Html;

/** Trusted markup, inserted without escaping. */
export const raw = (html: string): Html => new Html(html);

/** Everything a component may return or take as children, as one Html. */
export function render(child: Child): Html {
  return new Html(renderChild(child));
}

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

export function jsx(
  type: string | Component<Record<string, unknown>>,
  props: Attributes
): Html {
  if (typeof type === 'function') return type(props);
  const { children, ...attrs } = props;
  const open = `<${type}${renderAttributes(attrs)}>`;
  if (VOID_ELEMENTS.has(type)) return new Html(open);
  return new Html(`${open}${renderChild(children)}</${type}>`);
}

export { jsx as jsxs, jsx as jsxDEV };

export function Fragment({ children }: { children?: Child }): Html {
  return render(children);
}

function renderChild(child: Child): string {
  if (child instanceof Html) return child.value;
  if (Array.isArray(child)) return child.map(renderChild).join('');
  if (child === null || child === undefined || typeof child === 'boolean') {
    return '';
  }
  return escapeText(String(child));
}

function renderAttributes(attrs: Omit<Attributes, 'children'>): string {
  let out = '';
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (value === true) {
      out += ` ${name}`;
      continue;
    }
    const text =
      name === 'style' && typeof value === 'object'
        ? styleText(value as Record<string, string | number>)
        : String(value);
    out += ` ${name}="${escapeAttribute(text)}"`;
  }
  return out;
}

const styleText = (style: Record<string, string | number>) =>
  Object.entries(style)
    .map(([property, value]) => `${property}:${value}`)
    .join(';');

export const escapeText = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const escapeAttribute = (text: string): string =>
  escapeText(text).replace(/"/g, '&quot;');

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace JSX {
  type Element = Html;
  interface IntrinsicElements {
    [tag: string]: Attributes;
  }
  interface ElementChildrenAttribute {
    children: unknown;
  }
}
