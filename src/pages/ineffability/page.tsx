import { stylesheet } from '../../../build/jsx/assets.ts';
import { BackLink } from '../../components/back-link/back-link.tsx';
import { VoidLayout } from '../../layouts/void.tsx';
import page from './page.config.ts';

/**
 * Back (in Eric too) at the top, and the title and the block of cipher
 * text in the middle of the rest of the screen.
 */
export default function IneffabilityPage() {
  stylesheet(import.meta.url, './ineffability.css');
  return (
    <VoidLayout>
      <div class="ineffability">
        <BackLink class="ineffability__back" href="/mysteries/" />
        <div class="ineffability__body">
          <div class="ineffability__cipher" data-cipher>
            {/* Light and inset by turns (ineffability.css). */}
            {page.cipher.map((text, i) => (
              <p class={i % 2 ? 'ineffability__inset' : 'ineffability__light'}>
                {text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </VoidLayout>
  );
}
