import { stylesheet } from '../../build/jsx/assets.ts';
import type { Child } from '../../build/jsx/jsx-runtime.ts';
import { Nav } from '../components/nav/nav.tsx';
import { SoundControl } from '../components/sound-control/sound-control.tsx';
import { Title } from '../components/title/title.tsx';
import type { PageConfig } from '../site/types.ts';

/**
 * A normal scrolling page for reading: the title and nav across the top,
 * then the page's content in a column. Used by the EPK.
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
      <div class="document" data-page-root>
        <header class="document__header">
          <Title class="document__title" />
          <Nav page={page} />
        </header>
        <main class="document__main">{children}</main>
      </div>
      <SoundControl scrolls />
    </>
  );
}
