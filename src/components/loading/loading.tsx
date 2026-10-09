import { stylesheet } from '../../../build/jsx/assets.ts';

/**
 * loading_005.gif from new_design_docs/loading_016_avr (public domain, by
 * AV Reference): a 5 × 5 grid of squares, one in each row lit, the lit
 * ones hopping about over four frames. Each frame's rows, left to right:
 * `#` lit, `+` half lit, `.` dim. (The gif is black on grey; here it's
 * the text colour on the page's, so lit is the brightest.)
 */
const FRAMES = [
  ['#...+', '.+.#.', '.#..+', '+.+.#', '#..+.'],
  ['..#.+', '+.+.#', '...#.', '#.+..', '+.#.+'],
  ['.+..#', '+.#..', '+.+.#', '..#++', '.#...'],
  ['.#...', '#.+.+', '#..+.', '.+.#.', '+..+#'],
];
/** Each square's side, in the gif's pixels, and the space between them. */
const SQUARE = 2;
const STEP = 3;
/** The gif's width and height. */
const SIZE = FRAMES[0].length * STEP + 1;

/** How bright each kind of square is. */
const SHADES = { '#': 1, '+': 0.4, '.': 0.2 } as const;

/**
 * A pixel loading indicator with "loading" under it, for while a page's
 * script gets what it shows ready. Put it where that will go, and call
 * `loaded()` (loading.ts) once it's there. It only shows after a moment,
 * so a quick load doesn't flash it, and not without scripts, which would
 * never call `loaded()`.
 *
 * The frames are stacked in one SVG and slid past a window one at a time.
 */
export function Loading({
  label = 'loading',
  class: cls,
}: {
  label?: string;
  class?: string;
}) {
  stylesheet(import.meta.url, './loading.css');
  return (
    <div
      class={['loading', cls].filter(Boolean).join(' ')}
      role="status"
      data-loading
    >
      <span class="loading__window" aria-hidden="true">
        <svg
          class="loading__strip"
          viewBox={`0 0 ${SIZE} ${SIZE * FRAMES.length}`}
          focusable="false"
        >
          {Object.entries(SHADES).map(([shade, opacity]) => (
            <path
              d={squares(shade)}
              fill="currentColor"
              fill-opacity={String(opacity)}
            />
          ))}
        </svg>
      </span>
      <span class="loading__label">{label}</span>
    </div>
  );
}

/** One path of every square marked `shade`, in every frame. */
function squares(shade: string): string {
  return FRAMES.flatMap((rows, frame) =>
    rows.flatMap((row, y) =>
      [...row].flatMap((mark, x) =>
        mark === shade
          ? [
              `M${1 + x * STEP} ${frame * SIZE + 1 + y * STEP}h${SQUARE}v${SQUARE}h-${SQUARE}z`,
            ]
          : []
      )
    )
  ).join('');
}
