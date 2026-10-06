/**
 * Eric's profiles elsewhere, in display order. Rendered by the Socials
 * component (src/components/socials/), which also gives each one its icon,
 * and listed in the home page's structured data so search engines link
 * them to the site.
 */

export type SocialId =
  'spotify' | 'apple-music' | 'tiktok' | 'youtube' | 'instagram';

export interface Social {
  id: SocialId;
  label: string;
  url: string;
}

export const socials: Social[] = [
  {
    id: 'spotify',
    label: 'Spotify',
    url: 'https://open.spotify.com/artist/5xJPKbHL8q0eMVKZJG1FvI',
  },
  {
    id: 'apple-music',
    label: 'Apple Music',
    url: 'https://music.apple.com/ca/artist/eric-folino/1634985575',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    url: 'https://www.instagram.com/eric.folino',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    url: 'https://www.tiktok.com/@ericfolino',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com/channel/UCdR6ZNTxlyQN2Bw4iwdETQQ',
  },
];
