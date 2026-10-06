import { stylesheet } from '../../build/jsx/assets.ts';
import type { Child } from '../../build/jsx/jsx-runtime.ts';
import { SoundControl } from '../components/sound-control/sound-control.tsx';

/**
 * An empty page: no title, no nav, no conventions. The page brings
 * everything, including its own way back. Only the sound control stays
 * (`sound={false}` drops it too), because the shared sounds still play.
 */
export function VoidLayout({
  children,
  sound = true,
}: {
  children?: Child;
  sound?: boolean;
}) {
  stylesheet(import.meta.url, './void.css');
  return (
    <>
      <main class="void" data-page-root>
        {children}
      </main>
      {sound && <SoundControl />}
    </>
  );
}
