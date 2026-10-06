import { bootstrap } from '../../app/bootstrap.ts';
import { hydrateIslands } from '../../core/islands.ts';

bootstrap();

hydrateIslands({
  'video-embed': () => import('../../components/video-embed/video-embed.ts'),
});
