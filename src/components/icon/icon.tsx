import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

/**
 * A Font Awesome icon as inline SVG, so no icon font or script loads.
 * Font Awesome Free icons are CC BY 4.0.
 */
export function Icon({
  icon,
  class: cls,
}: {
  icon: IconDefinition;
  class?: string;
}) {
  const [width, height, , , path] = icon.icon;
  const d = Array.isArray(path) ? path.join(' ') : path;
  return (
    <svg
      class={cls}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d={d} />
    </svg>
  );
}
