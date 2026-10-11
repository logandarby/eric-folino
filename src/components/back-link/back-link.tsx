import { faArrowLeft, faHouse } from '@fortawesome/free-solid-svg-icons';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { Icon } from '../icon/icon.tsx';

/**
 * "Back", for pages with no nav (VoidLayout). It goes home, unless the
 * last page was one of the site's: then back-link.ts takes it there.
 * With `home`, it's "Home" instead, and always goes home. With `href`,
 * it always goes there, wherever the visitor came from. With
 * `irisWipe`, it leaves with the iris wipe (src/app/iris-wipe.ts). Where
 * it sits is up to the page.
 */
export function BackLink({
  class: cls,
  home = false,
  href,
  irisWipe = false,
}: {
  class?: string;
  home?: boolean;
  href?: string;
  irisWipe?: boolean;
}) {
  stylesheet(import.meta.url, './back-link.css');
  return (
    <a
      class={cls ? `back-link ${cls}` : 'back-link'}
      href={href ?? '/'}
      data-back-link={!home && !href}
      data-iris-wipe={irisWipe}
    >
      <Icon icon={home ? faHouse : faArrowLeft} class="back-link__icon" />
      {home ? 'Home' : 'Back'}
    </a>
  );
}
