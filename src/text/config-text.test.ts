import { describe, expect, it } from 'vitest';
import enter from '../pages/enter/page.config.ts';
import home from '../pages/home/page.config.ts';
import iris from '../pages/iris/page.config.ts';
import { pages } from '../pages/pages.ts';
import secret from '../pages/secret/page.config.ts';
import windowPage from '../pages/window/page.config.ts';
import { blobDialogs, type BlobScene } from '../site/blob-dialogs.ts';
import { blobDialog, type BlobName } from '../site/blobs.ts';
import { siteConfig } from '../site/site.config.ts';
import type { DialogContent } from '../site/types.ts';
import { compile } from './markup/timeline.ts';

describe('dialog text in the configs', () => {
  const dialogs: DialogContent[] = [
    ...Object.values(blobDialogs).flatMap((scene: BlobScene) =>
      Object.entries(scene).map(([name, line]) =>
        blobDialog(name as BlobName, line)
      )
    ),
    ...iris.eyes.map((eye) => eye.dialog),
    enter.tv.dialog,
    siteConfig.help.dialog,
    siteConfig.textDemo.dialog,
    ...pages.flatMap((p) => (p.placeholder ? [p.placeholder] : [])),
  ];
  const texts = dialogs.flatMap((d) => [d.title, ...d.body.map((b) => b.text)]);
  const pacing = {
    charMs: siteConfig.animation.typewriterCharMs,
    ...siteConfig.animation.textEffects.pacing,
  };

  it.each(texts)('has valid effect tags: %s', (text) => {
    expect(compile(text, pacing).diagnostics).toEqual([]);
  });

  // The dialog adds them (src/dialog/block-text.ts).
  const marked = dialogs.flatMap((d) => d.body);
  it.each(marked)("doesn't write its own quote marks or asterisk: %o", (b) => {
    if (b.kind === 'quote') expect(b.text).not.toMatch(/^["“]|["”]$/);
    if (b.kind === 'narration') expect(b.text).not.toMatch(/^(\{[^}]*\})*\*/);
  });
});

describe('blob dialogs', () => {
  const placed = [
    ['home', home.blobs],
    ['secret', secret.blobs],
    ['window', windowPage.blobs],
  ] as const;

  it.each(placed)('every blob on %s has something to say', (scene, blobs) => {
    const lines: BlobScene = blobDialogs[scene];
    for (const { blob } of blobs) expect(lines[blob], blob).toBeDefined();
  });
});
