import { readFileSync } from 'node:fs';
import { stylesheet } from '../../../build/jsx/assets.ts';
import type { Child } from '../../../build/jsx/jsx-runtime.ts';
import { siteConfig } from '../../site/site.config.ts';
import { blobShape, roundedPathData } from '../../svg/blob-shape.ts';
import { TAIL_CORNER_RADIUS, TAILS, type TailDirection } from './tails.ts';

const BLOB_DIR = new URL('../../assets/blobs/', import.meta.url);

/**
 * A comic speech bubble: one of the home page's blobs (src/assets/blobs/)
 * with a tail, in the dialogs' black and white and Courier Prime. It's
 * drawn rounded here; `bindSpeechBubble` (speech-bubble.ts) makes it boil
 * like the blobs.
 *
 * Its tail's tip goes at --bubble-x, --bubble-y in its positioned parent,
 * and it's --bubble-width wide, its text --bubble-font-size. `data-hidden` fades it out. It doesn't
 * take clicks, so it can sit over things.
 */
export function SpeechBubble({
  name,
  blob,
  tail = 'down',
  class: className,
  children,
}: {
  /** What `bindSpeechBubble` finds it by. */
  name: string;
  /** Which blob it's shaped like: src/assets/blobs/<blob>.svg. */
  blob: string;
  /** Which way its tail points. */
  tail?: TailDirection;
  class?: string;
  children?: Child;
}) {
  stylesheet(import.meta.url, './speech-bubble.css');
  const svg = readFileSync(new URL(`${blob}.svg`, BLOB_DIR), 'utf8');
  const [, , width = 0, height = 0] = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '')
    .split(' ')
    .map(Number);
  const d = /<path[^>]*\sd="([^"]+)"/.exec(svg)?.[1];
  if (!d || !width || !height) {
    throw new Error(`${blob}.svg needs a viewBox and a <path d>`);
  }
  const { blobCornerRadius, blobMinPointSpacing } = siteConfig.animation;
  const body = roundedPathData(
    blobShape(d, blobMinPointSpacing).polygon,
    blobCornerRadius
  );
  const points = TAILS[tail].map(([x, y]) => ({ x: x * width, y: y * height }));
  const tip = points[points.length - 1];

  // The box holds the blob and its tail. Where things are in it, as
  // shares of it: the blob, which the text fills, and the tail's tip.
  const all = [{ x: 0, y: 0 }, { x: width, y: height }, ...points];
  const left = Math.min(...all.map((p) => p.x));
  const top = Math.min(...all.map((p) => p.y));
  const boxWidth = Math.max(...all.map((p) => p.x)) - left;
  const boxHeight = Math.max(...all.map((p) => p.y)) - top;
  const style = {
    '--aspect': `${boxWidth} / ${boxHeight}`,
    '--body-x': String(-left / boxWidth),
    '--body-y': String(-top / boxHeight),
    '--body-w': String(width / boxWidth),
    '--body-h': String(height / boxHeight),
    '--tip-x': String((tip.x - left) / boxWidth),
    '--tip-y': String((tip.y - top) / boxHeight),
  };

  // Outlines first, then fills over them, so the tail and body read as
  // one shape with one outline.
  const shapes = (layer: string) => (
    <g class={`speech-bubble__${layer}`}>
      <path
        d={roundedPathData(points, TAIL_CORNER_RADIUS)}
        data-tail={points.map(({ x, y }) => `${x},${y}`).join(' ')}
      />
      <path d={body} data-shape={d} />
    </g>
  );
  return (
    <p
      class={className ? `speech-bubble ${className}` : 'speech-bubble'}
      style={style}
      data-speech-bubble={name}
    >
      <svg
        viewBox={`${left} ${top} ${boxWidth} ${boxHeight}`}
        aria-hidden="true"
        focusable="false"
      >
        {shapes('outline')}
        {shapes('fill')}
      </svg>
      <span class="speech-bubble__text">{children}</span>
    </p>
  );
}
