import { stylesheet } from '../../../build/jsx/assets.ts';
import { VoidLayout } from '../../layouts/void.tsx';
import page from './page.config.ts';

/** Where the upper lid's lashes grow from: points along its curve. */
const LASHES = [0.2, 0.35, 0.5, 0.65, 0.8].map((t) => {
  // The lid is a quadratic curve from (-100, 0) over (0, -75) to (100, 0).
  const x = 100 * (2 * t - 1);
  const y = -150 * t * (1 - t);
  return { x, y, x2: x * 1.25, y2: y - 20 };
});

const EYE_SHAPE = 'M-100 0Q0-75 100 0Q0 75-100 0Z';

/**
 * The secret page: darkness, and an eye in the middle that follows you.
 * Clicking it opens a dialog (see main.ts).
 */
export default function SecretPage() {
  stylesheet(import.meta.url, './secret.css');
  return (
    <VoidLayout>
      <div class="secret">
        <button
          type="button"
          class="eye"
          data-eye
          aria-label={page.eye.label}
          aria-haspopup="dialog"
        >
          <svg
            class="eye__svg"
            viewBox="-130 -100 260 180"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <clipPath id="eye-shape">
                <path d={EYE_SHAPE} />
              </clipPath>
            </defs>
            <g class="eye__lid">
              <path class="eye__white" d={EYE_SHAPE} />
              <g clip-path="url(#eye-shape)">
                <g class="eye__iris" data-eye-iris>
                  <circle r="36" fill="#F0B2F3" />
                  <circle
                    r="28"
                    fill="none"
                    stroke="#55F49D"
                    stroke-width="3"
                    stroke-dasharray="3 7"
                  />
                  <circle r="15" fill="#000" />
                  <circle cx="-8" cy="-9" r="4.5" fill="#fff" />
                </g>
              </g>
              <path class="eye__outline" d={EYE_SHAPE} />
              {LASHES.map(({ x, y, x2, y2 }) => (
                <line class="eye__lash" x1={x} y1={y} x2={x2} y2={y2} />
              ))}
            </g>
          </svg>
        </button>
      </div>
    </VoidLayout>
  );
}
