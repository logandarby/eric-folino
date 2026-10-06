import { stylesheet } from '../../../build/jsx/assets.ts';
import type { Style } from '../../../build/jsx/jsx-runtime.ts';
import { siteConfig } from '../../site/site.config.ts';
import { letterColor } from './letter-color.ts';

/**
 * The site title in its tilted box, one span per letter so RainbowText
 * (rainbow.ts) can cycle their colours. Screen readers get the plain text.
 */
export function Title({
  class: cls,
  style,
}: {
  class?: string;
  style?: Style;
}) {
  stylesheet(import.meta.url, './title.css');
  const text = siteConfig.title;
  let index = 0;
  const letters = [...text].map((ch) =>
    ch === ' ' ? (
      ' '
    ) : (
      <span
        data-letter
        style={`color:${letterColor(siteConfig.palette, index++, 0)}`}
      >
        {ch}
      </span>
    )
  );
  return (
    <h1
      class={['title', cls].filter(Boolean).join(' ')}
      style={style}
      data-dialog-avoid
      data-text-demo-anchor
    >
      <span class="title__box">
        <span class="sr-only">{text}</span>
        <span class="title__text" aria-hidden="true" data-rainbow>
          {letters}
        </span>
      </span>
    </h1>
  );
}
