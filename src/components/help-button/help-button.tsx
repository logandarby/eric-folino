import { stylesheet } from '../../../build/jsx/assets.ts';

/** The "?" in the corner that hints there are secrets to click on. */
export function HelpButton({ label }: { label: string }) {
  stylesheet(import.meta.url, './help-button.css');
  return (
    <button
      type="button"
      class="corner corner-button help"
      data-help
      data-dialog-avoid
      aria-label={label}
      aria-haspopup="dialog"
    >
      <span class="help__mark" aria-hidden="true">
        ?
      </span>
    </button>
  );
}
