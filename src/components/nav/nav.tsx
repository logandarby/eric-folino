import { stylesheet } from '../../../build/jsx/assets.ts';
import type { Style } from '../../../build/jsx/jsx-runtime.ts';
import { pages } from '../../pages/pages.ts';
import { siteConfig } from '../../site/site.config.ts';
import type { PageConfig } from '../../site/types.ts';

/**
 * The main nav. The page you're on is highlighted and has no href, so it
 * can't be clicked or tabbed to (that would only reload the page), or
 * left out if its item says so (`hideWhenCurrent`).
 */
export function Nav({
  page,
  class: cls,
  id,
  style,
}: {
  page: PageConfig;
  class?: string;
  id?: string;
  style?: Style;
}) {
  stylesheet(import.meta.url, './nav.css');
  const items = siteConfig.nav.map((item) => {
    const target = pages.find((p) => p.path === item.href);
    const current = item.href === page.path;
    if (current && item.hideWhenCurrent) return null;
    return (
      <li>
        <a
          class="nav__link"
          href={current ? undefined : item.href}
          aria-current={current ? 'page' : undefined}
          data-nav={target?.id ?? ''}
          data-dialog-avoid
        >
          {item.label}
        </a>
      </li>
    );
  });
  return (
    <nav
      class={['nav', cls].filter(Boolean).join(' ')}
      id={id}
      style={style}
      aria-label="Main"
    >
      <ul>{items}</ul>
    </nav>
  );
}
