import { definePage } from '../../site/define-page.ts';
import type { DialogContent, HotspotConfig } from '../../site/types.ts';
import { hushVoice } from '../../site/voices.ts';

/*
 * Secret: the experimental page. For now, just a watching eye. Artworks
 * for later live in ./pieces/.
 */

const notYet: DialogContent = {
  title: 'SECRET',
  voice: hushVoice,
  body: [
    { kind: 'quote', text: '“Not yet...”' },
    {
      kind: 'narration',
      text: '*You get the feeling you are being watched.',
    },
  ],
};

export default definePage<{ eye: HotspotConfig }>({
  id: 'secret',
  path: '/secret/',
  title: 'Secret',
  description: 'Nothing to see here.',
  placeholder: notYet,

  /** The eye in the middle of the page. */
  eye: { label: 'A watching eye', dialog: notYet },
});
