import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { resolveImages, responsiveImage } from './images.ts';

describe('responsive images', () => {
  it('makes AVIF, WebP and JPEG sizes no wider than the original', async () => {
    const root = mkdtempSync(join(tmpdir(), 'img-'));
    const file = join(root, 'photo.png');
    await sharp({
      create: { width: 1000, height: 500, channels: 3, background: '#f0b2f3' },
    })
      .png()
      .toFile(file);
    const cacheDir = join(root, 'cache');

    const page = `<p>${responsiveImage(file, { alt: 'A "pink" field' }).value}</p>`;
    const html = await resolveImages(page, { root, cacheDir });

    expect(html).toMatch(
      /^<p><picture><source type="image\/avif" srcset="\/cache\/photo-\w{8}-480\.avif 480w, \/cache\/photo-\w{8}-800\.avif 800w, \/cache\/photo-\w{8}-1000\.avif 1000w"/
    );
    expect(html).toContain(
      'alt="A &quot;pink&quot; field" width="1000" height="500" loading="lazy"'
    );
    // The fallback is the largest size up to 1200px: here the original's 1000.
    const fallback = /<img src="\/cache\/([^"]+)"/.exec(html)?.[1] ?? '';
    expect(fallback).toMatch(/-1000\.jpeg$/);
    expect(existsSync(join(cacheDir, fallback))).toBe(true);
  });

  it('leaves pages without images untouched', async () => {
    expect(await resolveImages('<p>hi</p>', { root: '/' })).toBe('<p>hi</p>');
  });
});
