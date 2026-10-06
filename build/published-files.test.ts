import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { publishCopy, publishMade, publishedPath } from './published-files.ts';

describe('published files', () => {
  const setup = () => {
    const root = mkdtempSync(join(tmpdir(), 'pub-'));
    const source = join(root, 'photo.jpg');
    writeFileSync(source, 'one');
    return { source, dir: join(root, 'out') };
  };

  it('copies a file to its address', () => {
    const { source, dir } = setup();
    expect(publishCopy('/press/photo.jpg', source, dir)).toBe(
      '/press/photo.jpg'
    );
    expect(readFileSync(join(dir, 'press/photo.jpg'), 'utf8')).toBe('one');
  });

  it('only remakes a file when its inputs change', () => {
    const { source, dir } = setup();
    const make = vi.fn(() => new TextEncoder().encode('zip'));
    publishMade('/press/all.zip', [source], make, dir);
    publishMade('/press/all.zip', [source], make, dir);
    expect(make).toHaveBeenCalledTimes(1);
    writeFileSync(source, 'changed');
    publishMade('/press/all.zip', [source], make, dir);
    expect(make).toHaveBeenCalledTimes(2);
  });

  it('refuses addresses outside its folder', () => {
    expect(() => publishedPath('/../escape.txt', '/tmp/out')).toThrow();
  });
});
