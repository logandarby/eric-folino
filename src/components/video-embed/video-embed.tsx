import { faPlay } from '@fortawesome/free-solid-svg-icons';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { Icon } from '../icon/icon.tsx';

/**
 * A YouTube video that loads only when played: until then it's the
 * thumbnail and a link to the video, so the page stays fast, no YouTube
 * cookies are set and it works without JavaScript. video-embed.ts swaps
 * in the player on click.
 */
export function VideoEmbed({
  youtubeId,
  title,
}: {
  youtubeId: string;
  title: string;
}) {
  stylesheet(import.meta.url, './video-embed.css');
  const id = encodeURIComponent(youtubeId);
  return (
    <div
      class="video-embed"
      data-island="video-embed"
      data-youtube-id={youtubeId}
      data-title={title}
    >
      <a
        class="video-embed__poster"
        href={`https://www.youtube.com/watch?v=${id}`}
      >
        <img
          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span class="video-embed__play">
          <Icon icon={faPlay} class="video-embed__icon" />
          <span>Play “{title}”</span>
        </span>
      </a>
    </div>
  );
}
