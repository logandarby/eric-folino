import { stylesheet } from '../../build/jsx/assets.ts';
import type { Child } from '../../build/jsx/jsx-runtime.ts';
import { HelpButton } from '../components/help-button/help-button.tsx';
import { SoundControl } from '../components/sound-control/sound-control.tsx';

/**
 * An empty page: no title, no nav, no conventions. The page brings
 * everything, including its own way back. Only the corner buttons stay,
 * the "?" and the sound control (`corner={false}` drops them too).
 */
export function VoidLayout({
  children,
  corner = true,
}: {
  children?: Child;
  corner?: boolean;
}) {
  stylesheet(import.meta.url, './void.css');
  return (
    <>
      <main class="void" data-page-root>
        {children}
        {corner && <HelpButton />}
      </main>
      {corner && <SoundControl />}
    </>
  );
}
