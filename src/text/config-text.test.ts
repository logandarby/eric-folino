import { describe, expect, it } from 'vitest';
import { siteConfig, type DialogContent } from '../site.config.ts';
import { compile } from './markup/timeline.ts';

describe('dialog text in site.config.ts', () => {
  const dialogs: DialogContent[] = [
    ...siteConfig.blobs.map((b) => b.dialog),
    siteConfig.screen.dialog,
    siteConfig.textDemo.dialog,
    ...siteConfig.pages.flatMap((p) => (p.placeholder ? [p.placeholder] : [])),
  ];
  const texts = dialogs.flatMap((d) => [d.title, ...d.body.map((b) => b.text)]);
  const pacing = {
    charMs: siteConfig.animation.typewriterCharMs,
    ...siteConfig.animation.textEffects.pacing,
  };

  it.each(texts)('has valid effect tags: %s', (text) => {
    expect(compile(text, pacing).diagnostics).toEqual([]);
  });
});
