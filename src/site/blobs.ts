import type { DialogContent, LayoutName, Placement } from './types.ts';
import { hushVoice, sillyVoice, softVoice } from './voices.ts';

/*
 * The blobs: characters that turn up across the site, each the same blob
 * wherever it is. Their names, shapes and voices are kept here; each page
 * places them and writes what they say there (BlobConfig).
 */

export interface BlobCharacter {
  /** Their name, the title of their dialogs. */
  name: string;
  /** What screen readers call the button. */
  label: string;
  /** Their shape: src/assets/blobs/<svg>.svg. Their colour comes from it. */
  svg: string;
  /** How they sound as they talk; without one, the default voice. */
  voice?: DialogContent['voice'];
}

export const blobs = {
  pink: {
    name: 'THE NONSENSICAL BLOB',
    label: 'Pink blob',
    svg: 'pink',
    voice: softVoice,
  },
  yellow: {
    name: 'THE ATAVISTIC CLOD',
    label: 'Yellow blob',
    svg: 'yellow',
    voice: hushVoice,
  },
  blue: {
    name: 'THE PROGENITORIAL SMUDGE',
    label: 'Blue blob',
    svg: 'blue',
  },
  green: {
    name: 'THE SILLY SPLOTCH',
    label: 'Green blob',
    svg: 'green',
    voice: sillyVoice,
  },
} satisfies Record<string, BlobCharacter>;

export type BlobName = keyof typeof blobs;

/** A blob on a page. */
export interface BlobConfig {
  /** Who it is. */
  blob: BlobName;
  /** Width as a percentage of what it's placed on (the stage, say). */
  width: Record<LayoutName, number>;
  position: Record<LayoutName, Placement>;
  /**
   * What they say when clicked. It's titled with their name and in their
   * voice, unless it gives its own.
   */
  dialog: Omit<DialogContent, 'title'> & { title?: string };
}

/** A blob's dialog, with their name and voice filled in. */
export function blobDialog(config: BlobConfig): DialogContent {
  const character: BlobCharacter = blobs[config.blob];
  return {
    title: character.name,
    ...(character.voice && { voice: character.voice }),
    ...config.dialog,
  };
}
