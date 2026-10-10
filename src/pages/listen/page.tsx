import { stylesheet } from '../../../build/jsx/assets.ts';
import { SpeechBubble } from '../../components/speech-bubble/speech-bubble.tsx';
import { VoidLayout } from '../../layouts/void.tsx';
import page from './page.config.ts';

/** Where the art is served from (Vite hashes and bundles it). */
const ART_URL = '/src/pages/listen/art';

/**
 * Tapes on a shelf and a deck. Clicking a tape puts it in; the deck's
 * screen is a Spotify embed and its keys drive it. They make their own
 * sounds (main.ts), not the site's ticks and clicks. The art is laid out
 * here as images, which main.ts covers with one dithered shader for the
 * whole scene (they stay as the picture without WebGL). The labels are
 * text over the shader, so they're never dithered; the masking tape
 * they're written on is art, and is. In reading order: the keys, the
 * deck, then the tapes, as phones show them (wide screens put the tapes
 * beside the deck).
 */
export default function ListenPage() {
  stylesheet(import.meta.url, './listen.css');
  return (
    <VoidLayout header={page}>
      <div class="listen" data-scene>
        <h1 class="sr-only">Listen</h1>
        <div class="listen__keys">
          <button type="button" data-key="play" data-sound="none" disabled>
            Play
          </button>
          <button type="button" data-key="stop" data-sound="none" disabled>
            Stop
          </button>
          <button type="button" data-key="eject" data-sound="none" disabled>
            Eject
          </button>
        </div>
        <div class="listen__deck" data-deck>
          <img
            class="listen__art"
            src={`${ART_URL}/deck-empty.webp`}
            alt=""
            data-deck-art="empty"
          />
          <img
            class="listen__art"
            src={`${ART_URL}/deck-full.webp`}
            alt=""
            data-deck-art="full"
          />
          <div class="listen__screen" data-screen></div>
        </div>
        {/* The hint, until a tape first goes in: phones point down at
            the shelf, wide screens at its top tape (listen.css). */}
        <SpeechBubble
          name="listen-hint"
          blob={page.hint.blob}
          class="listen__hint listen__hint--down"
        >
          {page.hint.text}
        </SpeechBubble>
        <SpeechBubble
          name="listen-hint"
          blob={page.hint.blob}
          tail="left"
          class="listen__hint listen__hint--left"
        >
          {page.hint.text}
        </SpeechBubble>
        <ul class="listen__shelf" aria-label="Tapes" data-shelf>
          {page.tapes.map((tape, i) => (
            <li class="listen__slot">
              <button
                type="button"
                class="listen__tape"
                data-tape={String(i)}
                data-sound="none"
                aria-label={`Put ${tape.title} in the deck`}
              >
                <img
                  class="listen__art"
                  src={`${ART_URL}/cassette-${tape.art}.webp`}
                  alt=""
                  data-art
                />
                <span
                  class="listen__label"
                  style={{
                    '--label-y': String(page.label.y),
                    '--label-width': String(page.label.width),
                    '--tilt': `${tape.tilt}deg`,
                  }}
                >
                  <img
                    class="listen__art"
                    src={`${ART_URL}/masking-tape-${tape.strip}.webp`}
                    alt=""
                    data-strip
                  />
                  <span class="listen__title">
                    <span data-title aria-hidden="true">
                      {tape.label ?? tape.title}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p class="sr-only" aria-live="polite" data-status></p>
      </div>
    </VoidLayout>
  );
}
