import { stylesheet } from '../../../build/jsx/assets.ts';
import { BlobButton } from '../../components/blob/blob.tsx';
import { BackLink } from '../../components/back-link/back-link.tsx';
import { VoidLayout } from '../../layouts/void.tsx';
import page from './page.config.ts';

/** Where the art is served from (Vite hashes and bundles it). */
const ART_URL = '/src/pages/window/art';

/**
 * The desk by its window, in the middle of the screen, with the video
 * playing behind the window's panes. main.ts covers it with a dithered
 * shader drawing the same; without WebGL, this is the picture. The
 * window is a link to the eyes.
 */
export default function WindowPage() {
  stylesheet(import.meta.url, './window.css');
  const { desk } = page;
  const w = desk.window;
  return (
    <VoidLayout>
      <div class="window">
        <h1 class="sr-only">{page.title}</h1>
        <BackLink irisWipe />
        <div
          class="window__scene"
          data-window-scene
          style={{
            '--ar': String(desk.width / desk.height),
            '--x': String(w.x),
            '--y': String(w.y),
            '--w': String(w.width),
            '--h': String(w.height),
          }}
        >
          {/* Decorative, and silent: main.ts plays it on a loop. */}
          <video
            class="window__video"
            src={`${ART_URL}/mars.webm`}
            muted
            loop
            playsinline
            preload="auto"
            aria-hidden="true"
            data-window-video
          />
          <img
            class="window__desk"
            src={`${ART_URL}/desk.webp`}
            alt={desk.alt}
            width={desk.width}
            height={desk.height}
            decoding="async"
            data-window-desk
          />
          {/* After the desk, so it's over the dithered picture main.ts puts there. */}
          <a
            class="window__link"
            href={page.link.href}
            aria-label={page.link.label}
            data-iris-wipe
            style={{
              '--link-x': String(page.link.box.x),
              '--link-y': String(page.link.box.y),
              '--link-w': String(page.link.box.width),
              '--link-h': String(page.link.box.height),
            }}
          />
          {page.blobs.map((blob, index) => (
            <BlobButton blob={blob} index={index} />
          ))}
        </div>
      </div>
    </VoidLayout>
  );
}
