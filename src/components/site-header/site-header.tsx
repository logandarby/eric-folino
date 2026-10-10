import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons';
import { stylesheet } from '../../../build/jsx/assets.ts';
import type { PageConfig } from '../../site/types.ts';
import { Icon } from '../icon/icon.tsx';
import { Nav } from '../nav/nav.tsx';

/**
 * The site's header: the nav in a bar across the top of the page, the same
 * on every page that has it. Wide screens: the nav on the right, and the
 * corner buttons ("?" and sound) fixed top left, in the bar. Phones: the
 * nav folds into a menu button top left, with the corner buttons top
 * right. Give the corner buttons `header` so they go there (the layouts
 * do). It's part of the page root, so a dialog makes it inert with the
 * rest of the page. bindSiteHeader (site-header.ts) opens and closes the
 * menu, and --site-header-height is its height.
 */
export function SiteHeader({ page }: { page: PageConfig }) {
  stylesheet(import.meta.url, './site-header.css');
  return (
    <header class="site-header" data-site-header data-page-root>
      <button
        type="button"
        class="corner-button site-header__menu"
        aria-label="Menu"
        aria-expanded="false"
        aria-controls="site-menu"
        data-menu-toggle
        data-dialog-avoid
      >
        <Icon icon={faBars} class="site-header__open" />
        <Icon icon={faXmark} class="site-header__close" />
      </button>
      <Nav page={page} class="site-header__nav" id="site-menu" />
    </header>
  );
}
