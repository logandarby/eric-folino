import { readFileSync } from 'node:fs';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { BackLink } from '../../components/back-link/back-link.tsx';
import { VoidLayout } from '../../layouts/void.tsx';
import page, { type EyeConfig } from './page.config.ts';

const EYES_DIR = new URL('./eyes/', import.meta.url);
/** Where the eye images are served from (Vite hashes and bundles them). */
const EYES_URL = '/src/pages/iris/eyes';

/**
 * Four eyes in two staggered columns, over a wall of text. Each eye is
 * drawn by a shader that moves its iris towards the pointer, and opens a
 * dialog when clicked (see main.ts).
 */
export default function IrisPage() {
  stylesheet(import.meta.url, './iris.css');
  const sizes = JSON.parse(
    readFileSync(new URL('eyes.json', EYES_DIR), 'utf8')
  ) as { width: number; height: number }[];
  const eyes = page.eyes.map((eye, i) => ({ eye, i, size: sizes[i] }));
  // main.ts swaps in one picked at random.
  const [text] = page.backdrop.texts;

  return (
    <VoidLayout>
      <div class="iris">
        <h1 class="sr-only" data-iris-text>
          {text}
        </h1>
        <div class="iris__backdrop" aria-hidden="true" data-iris-backdrop>
          {Array.from({ length: page.backdrop.lines }, () => (
            <p data-iris-text>{text}</p>
          ))}
        </div>
        <BackLink class="iris__back" />
        <div class="iris__eyes">
          {(['left', 'right'] as const).map((column) => (
            <div class="iris__column">
              {eyes
                .filter(({ eye }) => eye.column === column)
                .map(({ eye, i, size }) => (
                  <Eye eye={eye} index={i} size={size} />
                ))}
            </div>
          ))}
        </div>
      </div>
    </VoidLayout>
  );
}

/**
 * One eye: its picture holds three layers stacked top to bottom (base,
 * iris, skin). Here they're shown stacked in place, iris centred, until
 * main.ts swaps in the shader (or for good, without WebGL).
 */
function Eye({
  eye,
  index,
  size,
}: {
  eye: EyeConfig;
  index: number;
  size: { width: number; height: number };
}) {
  const src = `${EYES_URL}/eye-${index + 1}.webp`;
  return (
    <button
      type="button"
      class="eye"
      data-eye={index}
      aria-label={eye.label}
      aria-haspopup="dialog"
      style={{
        '--width': eye.width,
        '--x': eye.x,
        '--y': eye.y,
        'aspect-ratio': `${size.width} / ${size.height}`,
      }}
    >
      {/* Base, iris, skin: the same image, each showing its own third. */}
      {[0, 1, 2].map((layer) => (
        <img
          class="eye__layer"
          src={src}
          alt=""
          width={size.width}
          height={size.height * 3}
          style={{ '--layer': layer }}
          decoding="async"
        />
      ))}
    </button>
  );
}
