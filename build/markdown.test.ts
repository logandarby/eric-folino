import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readMarkdown, readMarkdownDir } from './markdown.ts';

function folder(files: Record<string, string>): URL {
  const dir = mkdtempSync(join(tmpdir(), 'md-'));
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, name), text);
  }
  return pathToFileURL(`${dir}/`);
}

describe('markdown', () => {
  it('reads front matter and renders the body', () => {
    const dir = folder({
      'a.md':
        '---\ntitle: "Hello: world"\ndate: 2026-01-02\n---\nSome *text*.\n',
    });
    const file = readMarkdown(new URL('a.md', dir), ['title', 'date']);
    expect(file.slug).toBe('a');
    expect(file.data).toEqual({ title: 'Hello: world', date: '2026-01-02' });
    expect(file.html.value.trim()).toBe('<p>Some <em>text</em>.</p>');
  });

  it('fails when a required field is missing', () => {
    const dir = folder({ 'b.md': '---\ntitle: x\n---\nBody' });
    expect(() => readMarkdown(new URL('b.md', dir), ['title', 'date'])).toThrow(
      /"date"/
    );
  });

  it('skips files starting with an underscore', () => {
    const dir = folder({
      'one.md': 'One',
      '_example.md': 'Skip me',
      'notes.txt': 'No',
    });
    expect(readMarkdownDir(dir).map((f) => f.slug)).toEqual(['one']);
  });
});
