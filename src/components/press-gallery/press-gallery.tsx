import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { zipSync } from 'fflate';
import { isResizable, responsiveImage } from '../../../build/images.ts';
import { stylesheet } from '../../../build/jsx/assets.ts';
import { publishCopy, publishMade } from '../../../build/published-files.ts';
import { Icon } from '../icon/icon.tsx';

export interface PhotoDetails {
  /** What's in the photo, for screen readers. */
  alt?: string;
  /** The photographer, shown under the photo. */
  credit?: string;
}

interface PressGalleryProps {
  /** Folder of original photos (a file URL ending in "/"). */
  dir: URL;
  /** Optional details per photo, by file name. */
  details?: Record<string, PhotoDetails>;
  /** Where the photos are published, e.g. "/press". */
  url: string;
  /** File name of the zip of every photo. */
  zipName: string;
  /** Default alt text, numbered per photo. */
  altPrefix: string;
}

/**
 * Photos for press to download. Every image in `dir` is listed (in file
 * name order), shown resized, and offered as its full-size original at a
 * permanent address, along with a zip of them all.
 */
export function PressGallery({
  dir,
  details = {},
  url,
  zipName,
  altPrefix,
}: PressGalleryProps) {
  stylesheet(import.meta.url, './press-gallery.css');
  const files = listPhotos(dir);
  if (files.length === 0) return <></>;

  const paths = files.map((name) => fileURLToPath(new URL(name, dir)));

  return (
    <div class="press-gallery">
      {/* With one photo, its own download does the job. */}
      {files.length > 1 && (
        <DownloadAll url={`${url}/${zipName}`} files={files} paths={paths} />
      )}
      <ul class="press-gallery__grid">
        {files.map((name, i) => {
          const { alt = `${altPrefix} ${i + 1}`, credit } = details[name] ?? {};
          const href = encodeURI(publishCopy(`${url}/${name}`, paths[i]));
          return (
            <li>
              <figure class="press-gallery__photo">
                {responsiveImage(paths[i], {
                  alt,
                  sizes:
                    '(min-width: 1100px) 220px, (min-width: 600px) 30vw, 50vw',
                })}
                <figcaption class="press-gallery__caption">
                  {credit && <span>Photo: {credit}</span>}
                  <a class="press-gallery__download" href={href} download>
                    <Icon icon={faDownload} class="press-gallery__icon" />
                    Download
                    <span class="sr-only"> full size: {alt}</span>
                    <span class="press-gallery__meta">
                      {extname(name).slice(1).toUpperCase()} ·{' '}
                      {formatSize(statSync(paths[i]).size)}
                    </span>
                  </a>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A zip of every photo, made when one of them changes. */
function DownloadAll({
  url,
  files,
  paths,
}: {
  url: string;
  files: string[];
  paths: string[];
}) {
  const zipUrl = encodeURI(
    publishMade(url, paths, () =>
      zipSync(
        // Photos are already compressed, so they're stored as they are.
        Object.fromEntries(
          files.map((name, i) => [name, [readFileSync(paths[i]), { level: 0 }]])
        )
      )
    )
  );
  const totalSize = paths.reduce((sum, path) => sum + statSync(path).size, 0);
  return (
    <a class="press-gallery__all" href={zipUrl} download>
      <Icon icon={faDownload} class="press-gallery__icon" />
      Download all {files.length} photos
      <span class="press-gallery__meta">ZIP · {formatSize(totalSize)}</span>
    </a>
  );
}

/**
 * The photos in `dir`, by file name ("photo-2" before "photo-10").
 * Files starting with "_" are skipped.
 */
export function listPhotos(dir: URL): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => isResizable(name) && !name.startsWith('_'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** 8171736 → "8.2 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1000 * 1000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1000 / 1000).toFixed(1)} MB`;
}
