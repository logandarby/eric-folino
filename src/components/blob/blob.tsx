import { readFileSync } from 'node:fs';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { perLayout } from '../../layouts/placement.ts';
import { siteConfig } from '../../site/site.config.ts';
import { blobs, type BlobConfig } from '../../site/blobs.ts';
import { blobShape, roundedPathData } from '../../svg/blob-shape.ts';

const BLOB_DIR = new URL('../../assets/blobs/', import.meta.url);

/**
 * A clickable blob on the stage. Its outline comes from
 * its character's src/assets/blobs/<svg>.svg (src/site/blobs.ts), pre-rounded so it looks right before any
 * script runs; blob.ts then makes it boil.
 */
export function BlobButton({
  blob,
  index,
}: {
  blob: BlobConfig;
  index: number;
}) {
  stylesheet(import.meta.url, './blob.css');
  const character = blobs[blob.blob];
  const svg = readFileSync(new URL(`${character.svg}.svg`, BLOB_DIR), 'utf8');
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  const d = /<path[^>]*\sd="([^"]+)"/.exec(svg)?.[1];
  const fill = /<path[^>]*\sfill="([^"]+)"/.exec(svg)?.[1] ?? 'currentColor';
  if (!viewBox || !d) {
    throw new Error(
      `${character.svg}.svg needs a viewBox and a single <path d>`
    );
  }
  const { blobCornerRadius, blobMinPointSpacing } = siteConfig.animation;
  const style = {
    ...perLayout((l) => ({
      x: `${blob.position[l].x}%`,
      y: `${blob.position[l].y}%`,
      w: `${blob.width[l]}%`,
    })),
    '--blob-color': fill,
  };
  const outline = roundedPathData(
    blobShape(d, blobMinPointSpacing).polygon,
    blobCornerRadius
  );
  return (
    <button
      type="button"
      class="blob placed"
      style={style}
      data-blob={index}
      data-dialog-avoid="soft"
      aria-label={character.label}
      aria-haspopup="dialog"
    >
      <svg
        class="blob__svg"
        viewBox={viewBox}
        aria-hidden="true"
        focusable="false"
      >
        <path d={outline} data-shape={d} fill={fill} />
      </svg>
    </button>
  );
}
