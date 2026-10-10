import { stylesheet } from '../../build/jsx/assets.ts';
import type { Child } from '../../build/jsx/jsx-runtime.ts';
import { HelpButton } from '../components/help-button/help-button.tsx';
import { SiteHeader } from '../components/site-header/site-header.tsx';
import { SoundControl } from '../components/sound-control/sound-control.tsx';
import { Title } from '../components/title/title.tsx';
import type { PageConfig } from '../site/types.ts';

/**
 * A normal scrolling page for reading: the site header, the title, then
 * the page's content in a column. Used by the EPK.
 */
export function DocumentLayout({
  page,
  children,
}: {
  page: PageConfig;
  children?: Child;
}) {
  stylesheet(import.meta.url, './document.css');
  return (
    <>
      <SiteHeader page={page} />
      <div class="document" data-page-root>
        <div class="document__header">
          <Title class="document__title" />
        </div>
        <main class="document__main">{children}</main>
        <HelpButton scrolls header />
      </div>
      <SoundControl scrolls header />
    </>
  );
}
