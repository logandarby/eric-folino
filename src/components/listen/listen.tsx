import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { Icon } from '../icon/icon.tsx';

/**
 * The bus stop screen as a music player: a button over the screen, with a
 * play or pause sign on it, and the call to listen below it in the
 * Cordata font, which does the same. Playing, the screen shows the
 * collage video (ListenVideo). Place it in the PhotoLayer (background.tsx),
 * which says where the screen is; listen.ts makes it play.
 */
export function Listen({ label, cta }: { label: string; cta: string }) {
  stylesheet(import.meta.url, './listen.css');
  return (
    <div class="listen" data-listen data-state="idle">
      <button
        type="button"
        class="listen__screen"
        data-listen-toggle
        aria-label={label}
        aria-pressed="false"
      >
        <span class="listen__sign" data-listen-sign>
          <Icon icon={faPlay} class="listen__icon listen__icon--play" />
          <Icon icon={faPause} class="listen__icon listen__icon--pause" />
        </span>
      </button>
      <button
        type="button"
        class="listen__cta"
        data-listen-toggle
        aria-pressed="false"
      >
        {cta}
      </button>
    </div>
  );
}

/**
 * Where the video and its light show, under the stage so they never
 * cover the nav: place it in a PhotoLayer `below`. listen.ts gives it
 * the player's state too.
 */
export function ListenVideo() {
  stylesheet(import.meta.url, './listen.css');
  return (
    <div class="listen listen__video" data-listen-video data-state="idle"></div>
  );
}
