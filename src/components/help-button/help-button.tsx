import { stylesheet } from '../../../build/jsx/assets.ts';
import { siteConfig } from '../../site/site.config.ts';

/**
 * The "?" in the corner that hints there are secrets to click on, on every
 * page (the layouts add it, beside the sound control). Render it inside
 * the page root, so a dialog makes it inert like the rest of the page.
 * bootstrap() opens its dialog.
 */
export function HelpButton({
  scrolls = false,
  bottom = false,
  header = false,
}: {
  /** Scroll away with the page instead of staying put (for long pages). */
  scrolls?: boolean;
  /** In the bottom corner on desktop too, not just on mobile. */
  bottom?: boolean;
  /** In the site header (site-header.tsx): top right on mobile. */
  header?: boolean;
}) {
  stylesheet(import.meta.url, './help-button.css');
  return (
    <button
      type="button"
      class={[
        'corner corner-button help',
        scrolls && 'corner--scrolls',
        bottom && 'corner--bottom',
        header && 'corner--header',
      ]
        .filter(Boolean)
        .join(' ')}
      data-help
      data-dialog-avoid
      aria-label={siteConfig.help.label}
      aria-haspopup="dialog"
    >
      <span class="help__mark" aria-hidden="true">
        ?
      </span>
    </button>
  );
}
