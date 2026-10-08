import { faVolumeHigh, faVolumeXmark } from '@fortawesome/free-solid-svg-icons';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { soundConfig } from '../../site/sound.config.ts';
import { Icon } from '../icon/icon.tsx';

/**
 * The speaker button in the corner (beside the "?"), with
 * a volume slider that slides out on hover or focus. Render it outside the
 * page root, so it still works while a dialog has the page inert. Starts
 * pressed to match the config default; sound-control.ts corrects it from
 * the visitor's saved choice.
 */
export function SoundControl({
  scrolls = false,
}: {
  /** Scroll away with the page instead of staying put (for long pages). */
  scrolls?: boolean;
}) {
  stylesheet(import.meta.url, './sound-control.css');
  return (
    <div
      class={['corner sound-control', scrolls && 'corner--scrolls']
        .filter(Boolean)
        .join(' ')}
      data-sound-control
    >
      <button
        type="button"
        class="corner-button sound-toggle"
        data-sound-toggle
        data-dialog-avoid
        aria-label="Sound"
        aria-pressed={String(soundConfig.enabledByDefault)}
        aria-keyshortcuts="M"
        title="Sound (M)"
      >
        <Icon icon={faVolumeHigh} class="sound-toggle__on" />
        <Icon icon={faVolumeXmark} class="sound-toggle__off" />
      </button>
      <label class="sound-volume">
        <span class="sr-only">Volume</span>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value="100"
          data-sound-volume
        />
      </label>
      <span class="sr-only" role="status" data-sound-status></span>
    </div>
  );
}
