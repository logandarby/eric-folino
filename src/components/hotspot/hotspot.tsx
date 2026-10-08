import { stylesheet } from '../../../build/jsx/assets.ts';

/**
 * An invisible button over something in a picture, like the bus stop
 * screen or the enter page's TV. Hovering or focusing it shows the dashed
 * outline every button gets, plus a glow; its dialog dims the page around
 * it with a soft vignette (bind it with `bindHotspot`, hotspot.ts).
 *
 * Place it with --spot-x, --spot-y, --spot-w and --spot-h: percentages of
 * its positioned parent, usually a box framed exactly like the picture.
 * --hotspot-tint and --hotspot-glow colour the glow.
 */
export function Hotspot({
  name,
  label,
  sound,
}: {
  /** What `bindHotspot` finds it by. */
  name: string;
  /** Accessible name. */
  label: string;
  /** A looping sound held while it's hovered or its dialog is open (see bindings.ts). */
  sound?: 'hum';
}) {
  stylesheet(import.meta.url, './hotspot.css');
  return (
    <button
      type="button"
      class="hotspot"
      data-hotspot={name}
      data-sound={sound}
      aria-label={label}
      aria-haspopup="dialog"
    ></button>
  );
}
