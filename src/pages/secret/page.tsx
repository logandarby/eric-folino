import { readFileSync } from 'node:fs';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { BackLink } from '../../components/back-link/back-link.tsx';
import { BlobButton } from '../../components/blob/blob.tsx';
import { VoidLayout } from '../../layouts/void.tsx';
import page from './page.config.ts';

/** Where the art is served from (Vite hashes and bundles it). */
const ART_URL = '/src/pages/secret/art';

interface Size {
  width: number;
  height: number;
}

/**
 * The fridge with the TV on it, as big as fits on the screen, on the
 * moon, which fills it and pans (secret.css).
 * The polaroids are links, placed on the fridge by the page config: each
 * a photo behind art/polaroid.webp's frame, with its caption as text.
 * main.ts dithers the pictures (data-dither) where they are; the captions
 * stay text, over them. Without WebGL, these are the pictures.
 */
export default function SecretPage() {
  stylesheet(import.meta.url, './secret.css');
  // Made by `npm run secret`.
  const art = JSON.parse(
    readFileSync(new URL('art/art.json', import.meta.url), 'utf8')
  ) as { fridge: Size; tv: Size; moon: Size };
  const { tv } = page;
  // In fridge widths: the TV's height, less what sits behind the fridge's
  // top, and the fridge's.
  const tvHeight = (tv.width * art.tv.height) / art.tv.width;
  const fridgeHeight = art.fridge.height / art.fridge.width;
  const height = tvHeight * (1 - tv.sink) + fridgeHeight;
  return (
    <VoidLayout>
      <div class="secret" data-secret>
        <h1 class="sr-only">{page.title}</h1>
        <div
          class="secret__moon"
          style={{
            '--pan': `${page.moon.seconds}s`,
            '--brightness': String(page.moon.brightness),
          }}
        >
          <img
            src={`${ART_URL}/moon.webp`}
            alt={page.moon.alt}
            width={art.moon.width}
            height={art.moon.height}
            decoding="async"
            data-dither
          />
        </div>
        <BackLink home />
        <div
          class="secret__stack"
          style={{
            '--ar': String(1 / height),
            '--tv-w': String(tv.width),
            '--tv-x': String(tv.x),
            // A share of the width, as margins are.
            '--tv-sink': String(tv.sink * tvHeight),
            '--tv-tilt': `${tv.tilt}deg`,
          }}
        >
          <img
            class="secret__tv"
            src={`${ART_URL}/tv.webp`}
            alt={tv.alt}
            width={art.tv.width}
            height={art.tv.height}
            decoding="async"
            data-dither
          />
          <div class="secret__fridge">
            <img
              class="secret__fridge-art"
              src={`${ART_URL}/fridge.webp`}
              alt={page.fridge.alt}
              width={art.fridge.width}
              height={art.fridge.height}
              decoding="async"
              data-dither
            />
            <ul class="secret__polaroids">
              {page.polaroids.map((polaroid, i) => (
                <li
                  class="secret__slot"
                  style={{
                    '--x': `${polaroid.x}%`,
                    // Out of step: each starts a different way into it.
                    '--sway-delay': `${-1.3 * i}s`,
                    '--y': `${polaroid.y}%`,
                    '--w': `${polaroid.width}%`,
                    '--tilt': `${polaroid.tilt}deg`,
                  }}
                >
                  <a class="secret__polaroid" href={polaroid.href}>
                    <img
                      class="secret__shadow"
                      src={`${ART_URL}/shadow.webp`}
                      alt=""
                      decoding="async"
                      data-dither
                    />
                    <img
                      class="secret__photo"
                      src={
                        polaroid.photo
                          ? `${ART_URL}/photos/${polaroid.photo}`
                          : `${ART_URL}/undeveloped.webp`
                      }
                      alt=""
                      decoding="async"
                      data-dither
                    />
                    <img
                      class="secret__frame"
                      src={`${ART_URL}/polaroid.webp`}
                      alt=""
                      decoding="async"
                      data-dither
                    />
                    <span
                      class="secret__caption"
                      style={{ '--size': String(page.caption.size) }}
                    >
                      {polaroid.caption}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {page.blobs.map((blob, index) => (
            <BlobButton blob={blob} index={index} />
          ))}
        </div>
      </div>
    </VoidLayout>
  );
}
