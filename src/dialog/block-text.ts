import type { DialogBlock } from '../site/types.ts';

/**
 * What a dialog block says, as shown: quotes in quotation marks, and
 * narration after an asterisk, so the configs never write them. Empty
 * blocks stay empty.
 */
export function blockText({ kind, text }: DialogBlock): string {
  if (!text) return text;
  if (kind === 'quote') return `“${text}”`;
  if (kind === 'narration') return `*${text}`;
  return text;
}
