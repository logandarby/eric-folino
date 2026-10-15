import type { BlobName, BlobLine } from './blobs.ts';

/*
 * Everything the blobs say, on every page, in the order a visitor comes
 * across them: the home page, then the secret page, then the window
 * (by way of the enter page). Each page places its blobs in its own
 * page.config.ts and says which of these scenes they're in when it binds
 * them (bindBlobs in its main.ts).
 *
 * A dialog is titled with the blob's name and in their voice
 * (src/site/blobs.ts), unless it gives its own. A blob placed on a page
 * needs a line in that page's scene here (src/text/config-text.test.ts
 * checks). New blob dialog goes in this file.
 */

export const blobDialogs = {
  /** The bus stop (/). */
  home: {
    pink: {
      body: [
        {
          kind: 'quote',
          text: "I have an experiment I'm trying to run but the government isn't funding it.{pause}{float} It's not even that dangerous this time!{/float}",
        },
        {
          kind: 'narration',
          text: 'You feel like it might be dangerous this time.',
        },
      ],
    },
    yellow: {
      body: [
        {
          kind: 'quote',
          text: 'Beneath the covers, I am unable to label myself not a human.',
        },
        {
          kind: 'narration',
          text: 'You recall a memory not quite yours.',
        },
      ],
    },
    blue: {
      body: [
        {
          kind: 'quote',
          text: "Have you seen a silly splotch {shake}anywhere?{/shake} I can't find them.",
        },
        {
          kind: 'narration',
          text: 'You look down sheepishly at the sidewalk.',
        },
      ],
    },
    green: {
      body: [
        {
          kind: 'quote',
          text: 'Hiiii! I am a little teeny tiny splotch. {wave}I love you!{/wave}',
        },
        {
          kind: 'narration',
          text: 'You chuckle.',
        },
      ],
    },
  },

  /** The fridge on the moon (/secret/). */
  secret: {
    pink: {
      body: [
        {
          kind: 'quote',
          text: "Don't tell Health Canada I'm here.",
        },
      ],
    },
    yellow: {
      body: [
        {
          kind: 'quote',
          text: "I wonder what poetry the Taoists would've written here.",
        },
        {
          kind: 'narration',
          text: 'You are somewhat interested.',
        },
      ],
    },
    blue: {
      body: [
        {
          kind: 'quote',
          text: "I can't believe I'm up here. Can someone get me down?",
        },
        {
          kind: 'narration',
          text: "You definitely can't.",
        },
      ],
    },
    green: {
      body: [
        {
          kind: 'quote',
          text: 'Is there any food here? {wave}Ohohoo!{/wave}',
        },
      ],
    },
  },

  /** The desk by the window (/window/). */
  window: {
    pink: {
      body: [
        {
          kind: 'quote',
          text: 'I cut the moon in the amount and atmosphere to mix the PSI container belt, but right now the experiment outflow supports a non-negligable hypothesis. What do you think?',
        },
        {
          kind: 'narration',
          text: "You don't have anything to add.",
        },
      ],
    },
    yellow: {
      body: [
        {
          kind: 'quote',
          text: "Looking out here, I can't seem to remember my name. Can you?",
        },
        {
          kind: 'narration',
          text: 'You think... {pause}Yeah you do, {pause}duh.',
        },
      ],
    },
    blue: {
      body: [
        {
          kind: 'quote',
          text: "I {shake}still{/shake} can't find them! Can you check under the desk?",
        },
        {
          kind: 'narration',
          text: "You really don't want to, but alas.",
        },
      ],
    },
    green: {
      body: [
        {
          kind: 'quote',
          text: '{wave}Ohohohoo!{/wave} It smells under here.',
        },
        {
          kind: 'narration',
          text: 'You sniff.{pause} Yep.',
        },
      ],
    },
  },
} satisfies Record<string, BlobScene>;

/** What each blob in one place says. */
export type BlobScene = Partial<Record<BlobName, BlobLine>>;

export type BlobSceneName = keyof typeof blobDialogs;
