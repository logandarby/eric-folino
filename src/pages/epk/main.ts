import { pageScript } from '../../app/router.ts';
import { hydrateIslands } from '../../core/islands.ts';

pageScript(import.meta.url, () =>
  hydrateIslands({
    'video-embed': () => import('../../components/video-embed/video-embed.ts'),
    'press-gallery': () =>
      import('../../components/press-gallery/press-gallery.ts'),
    'copy-button': () => import('../../components/copy-button/copy-button.ts'),
  })
);
