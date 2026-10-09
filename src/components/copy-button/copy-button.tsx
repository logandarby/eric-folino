import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { Icon } from '../icon/icon.tsx';

/**
 * A button that copies the text of the element with id `target`, as
 * formatted text where it can (italics and links survive a paste into a
 * document) and plain text otherwise. copy-button.ts makes it work and
 * shows it; without scripts it stays hidden. `label` says what it copies,
 * for screen readers.
 */
export function CopyButton({
  target,
  label,
}: {
  target: string;
  label: string;
}) {
  stylesheet(import.meta.url, './copy-button.css');
  return (
    <span class="copy-button" data-island="copy-button" data-target={target}>
      <button type="button" class="copy-button__button" hidden>
        <Icon icon={faCopy} class="copy-button__icon copy-button__icon--copy" />
        <Icon
          icon={faCheck}
          class="copy-button__icon copy-button__icon--done"
        />
        <span class="copy-button__label" aria-hidden="true">
          Copy
        </span>
        <span class="sr-only">Copy {label}</span>
      </button>
      <span class="sr-only" role="status"></span>
    </span>
  );
}
