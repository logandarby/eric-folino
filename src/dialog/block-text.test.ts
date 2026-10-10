import { describe, expect, it } from 'vitest';
import { blockText } from './block-text.ts';

describe('blockText', () => {
  it('puts quotes in quotation marks', () => {
    expect(blockText({ kind: 'quote', text: 'Hi {wave}there{/wave}.' })).toBe(
      '“Hi {wave}there{/wave}.”'
    );
  });

  it('starts narration with an asterisk', () => {
    expect(blockText({ kind: 'narration', text: 'You chuckle.' })).toBe(
      '*You chuckle.'
    );
  });

  it('leaves plain text, and empty blocks, alone', () => {
    expect(blockText({ kind: 'text', text: 'Plain.' })).toBe('Plain.');
    expect(blockText({ kind: 'quote', text: '' })).toBe('');
  });
});
