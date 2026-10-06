import { ScreenHotspot } from '../../components/background/background.tsx';
import { BlobButton } from '../../components/blob/blob.tsx';
import { HelpButton } from '../../components/help-button/help-button.tsx';
import { StageLayout } from '../../layouts/stage.tsx';
import page from './page.config.ts';

/** The bus stop scene, with blobs, the screen and the "?" to click. */
export default function HomePage() {
  return (
    <StageLayout
      page={page}
      socials
      help
      scene={
        <>
          <ScreenHotspot label={page.screen.label} />
          <HelpButton label={page.help.label} />
        </>
      }
    >
      {page.blobs.map((blob, index) => (
        <BlobButton blob={blob} index={index} />
      ))}
    </StageLayout>
  );
}
