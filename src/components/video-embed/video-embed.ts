import type { Cleanup } from '../../core/disposer.ts';

/** The player URL: no tracking cookies until played, and no unrelated suggestions. */
export const playerUrl = (youtubeId: string): string =>
  `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0`;

/** Island: swaps video-embed.tsx's thumbnail for the YouTube player when clicked. */
export function mount(el: HTMLElement): Cleanup | undefined {
  const { youtubeId, title } = el.dataset;
  const poster = el.querySelector('a');
  if (!youtubeId || !poster) return;
  const play = (e: MouseEvent) => {
    // Let modified clicks open YouTube in a new tab as usual.
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const player = document.createElement('iframe');
    player.className = 'video-embed__player';
    player.src = playerUrl(youtubeId);
    player.title = title ?? 'Video';
    player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    player.allowFullscreen = true;
    poster.replaceWith(player);
    player.focus();
  };
  poster.addEventListener('click', play);
  return () => poster.removeEventListener('click', play);
}
