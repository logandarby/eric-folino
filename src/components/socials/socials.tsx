import {
  faApple,
  faInstagram,
  faSpotify,
  faTiktok,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { stylesheet } from '../../../build/jsx/assets.ts';
import type { Style } from '../../../build/jsx/jsx-runtime.ts';
import { socials, type SocialId } from '../../site/socials.ts';
import { Icon } from '../icon/icon.tsx';

/** Typed by id, so a new profile in socials.ts won't build without an icon. */
const ICONS: Record<SocialId, IconDefinition> = {
  spotify: faSpotify,
  'apple-music': faApple,
  tiktok: faTiktok,
  youtube: faYoutube,
  instagram: faInstagram,
};

/**
 * Links to every profile in src/site/socials.ts: icons only, or icons with
 * their names (`labelled`). They open in a new tab, which the accessible
 * name says. `rel="me"` tells Mastodon and the like that the profiles are
 * Eric's own.
 */
export function Socials({
  labelled = false,
  class: cls,
  style,
}: {
  labelled?: boolean;
  class?: string;
  style?: Style;
}) {
  stylesheet(import.meta.url, './socials.css');
  const classes = ['socials', labelled && 'socials--labelled', cls]
    .filter(Boolean)
    .join(' ');
  return (
    <ul class={classes} style={style} aria-label="Elsewhere">
      {socials.map(({ id, label, url }) => (
        <li>
          <a
            class="socials__link"
            href={url}
            target="_blank"
            rel="me noopener noreferrer"
            aria-label={labelled ? undefined : `${label} (opens in a new tab)`}
            title={labelled ? undefined : label}
            data-dialog-avoid
          >
            <Icon icon={ICONS[id]} class="socials__icon" />
            {labelled && (
              <span class="socials__label">
                {label}
                <span class="sr-only"> (opens in a new tab)</span>
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
