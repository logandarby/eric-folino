import { PhotoLayer } from '../../components/background/background.tsx';
import { BlobButton } from '../../components/blob/blob.tsx';
import { Listen, ListenVideo } from '../../components/listen/listen.tsx';
import { StageLayout } from '../../layouts/stage.tsx';
import page from './page.config.ts';

/** The bus stop scene, with blobs and the screen that plays our music. */
export default function HomePage() {
  return (
    <StageLayout
      page={page}
      socials={page.mobileSocials}
      underlay={
        <PhotoLayer below>
          <ListenVideo />
        </PhotoLayer>
      }
      scene={
        <PhotoLayer>
          <Listen label={page.listen.label} cta={page.listen.cta} />
        </PhotoLayer>
      }
    >
      {page.blobs.map((blob, index) => (
        <BlobButton blob={blob} index={index} />
      ))}
    </StageLayout>
  );
}
