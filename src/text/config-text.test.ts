import { describe, expect, it } from 'vitest';
import home from '../pages/home/page.config.ts';
import { pages } from '../pages/pages.ts';
import { siteConfig } from '../site/site.config.ts';
import type { DialogContent } from '../site/types.ts';
import { compile } from './markup/timeline.ts';

describe('dialog text in the configs', () => {
  const dialogs: DialogContent[] = [
    ...home.blobs.map((b) => b.dialog),
    home.screen.dialog,
    home.help.dialog,
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
});
