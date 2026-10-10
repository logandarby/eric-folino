import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { Icon } from '../icon/icon.tsx';

/**
 * "Back", for pages with no nav (VoidLayout). It goes home, unless the
 * last page was one of the site's: then back-link.ts takes it there.
 * Where it sits is up to the page.
 */
export function BackLink({ class: cls }: { class?: string }) {
  stylesheet(import.meta.url, './back-link.css');
  return (
    <a class={cls ? `back-link ${cls}` : 'back-link'} href="/" data-back-link>
      <Icon icon={faArrowLeft} class="back-link__icon" />
      Back
    </a>
  );
}
