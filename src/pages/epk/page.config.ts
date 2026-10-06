import { definePage } from '../../site/define-page.ts';
import type { PhotoDetails } from '../../components/press-gallery/press-gallery.tsx';

/*
 * About: the EPK (electronic press kit). The bio and interviews are
 * Markdown files in ./content/, so they can be edited without touching
 * code. Still a draft: see `draft` in PageConfig.
 */

export interface AboutPage {
  /** The latest music video, embedded click-to-play. `null` hides it. */
  video: { youtubeId: string; title: string } | null;
  /**
   * Optional alt text and photographer credit for the press photos in
   * ./content/press/, by file name. Every photo there is listed anyway.
   */
  photoDetails: Record<string, PhotoDetails>;
  /** Where press and bookers should write, shown at the top of the page. */
  contacts: { label: string; email: string }[];
}

export default definePage<AboutPage>({
  id: 'epk',
  path: '/epk/',
  title: 'EPK',
  description: 'About Eric Folino.',
  draft: true,
  placeholder: {
    title: 'EPK',
    body: [
      {
        kind: 'quote',
        text: '“This page is still being assembled by little critters somewhere in the dark.”',
      },
      { kind: 'narration', text: '*You hear a voice beckoning you back.' },
    ],
  },

  // TODO: the YouTube ID of the latest music video (the part after `v=`).
  video: null,
  // TODO: describe each photo for screen readers, and credit the photographer.
  photoDetails: {
    'press_photo1.jpg': {
      alt: 'Eric Folino and The Disappearing Acts',
    },
  },
  contacts: [{ label: 'Booking & press', email: 'info@ericfolino.com' }],
});
