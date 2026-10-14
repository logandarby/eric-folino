import { pageScript } from '../../app/router.ts';
import { Disposer } from '../../core/disposer.ts';

/** About how many CSS pixels one of Eric's pixels should be. */
const TARGET_PX = 2;

/**
 * Keeps the cipher text crisp. Eric is pixel art, so each of its pixels
 * has to land on a whole number of the screen's own pixels: at 2 CSS
 * pixels that's true on ordinary screens but not on one scaled to 125%
 * (or zoomed), where it smears across 2.5. So its pixel is sized to the
 * nearest whole number of screen pixels (--px, ineffability.css), and the
 * block is nudged by the fraction of a screen pixel it would otherwise
 * start at. Again whenever the window, or the screen's scale, changes.
 */
pageScript(import.meta.url, () => {
  const disposer = new Disposer();
  const block = document.querySelector<HTMLElement>('[data-cipher]');
  if (!block) return () => disposer.dispose();

  let scale: MediaQueryList | null = null;
  const fit = () => {
    const ratio = devicePixelRatio;
    const px = Math.max(1, Math.round(TARGET_PX * ratio)) / ratio;
    block.style.setProperty('--px', `${px}px`);
    block.style.translate = '';
    const { left, top } = block.getBoundingClientRect();
    const nudge = (at: number) => (Math.round(at * ratio) - at * ratio) / ratio;
    block.style.translate = `${nudge(left + scrollX)}px ${nudge(top + scrollY)}px`;
    // A change of scale (zoom, or a move to another screen) shows up as
    // this no longer matching.
    scale?.removeEventListener('change', fit);
    scale = matchMedia(`(resolution: ${ratio}dppx)`);
    scale.addEventListener('change', fit);
  };
  fit();
  disposer.listen(window, 'resize', fit);
  disposer.add(() => scale?.removeEventListener('change', fit));
  return () => disposer.dispose();
});
