import { stylesheet } from '../../build/jsx/assets.ts';
import type { Child } from '../../build/jsx/jsx-runtime.ts';
import { HelpButton } from '../components/help-button/help-button.tsx';
import { SiteHeader } from '../components/site-header/site-header.tsx';
import { SoundControl } from '../components/sound-control/sound-control.tsx';
import type { PageConfig } from '../site/types.ts';

/**
 * An empty page: no title, no nav, no conventions. The page brings
 * everything, including its own way back. Only the corner buttons stay,
 * the "?" and the sound control (`corner={false}` drops them too,
 * `corner="bottom"` puts them bottom left everywhere). With `header`, the
 * site header (site-header.tsx) goes across the top, holding them.
 */
export function VoidLayout({
  children,
  corner = true,
  header,
}: {
  children?: Child;
  corner?: boolean | 'bottom';
  /** The page, to give it the site header. */
  header?: PageConfig;
}) {
  stylesheet(import.meta.url, './void.css');
  const inHeader = Boolean(header);
  return (
    <>
      {header && <SiteHeader page={header} />}
      <main class="void" data-page-root>
        {children}
        {corner && (
          <HelpButton bottom={corner === 'bottom'} header={inHeader} />
        )}
      </main>
      {corner && (
        <SoundControl bottom={corner === 'bottom'} header={inHeader} />
      )}
    </>
  );
}
