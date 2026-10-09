import type { Cleanup } from '../core/disposer.ts';
import type { DialogManager } from '../dialog/manager.ts';
import type { SoundEngine } from './sound-engine.ts';

/** Things that tick on hover and clunk on press. */
const INTERACTIVE = 'button, a[href], [data-sound]';
/** A Tab press moves focus within this long (ms); see `onFocus`. */
const TAB_FOCUS_MS = 150;
/** Letters and digits blip; spaces and punctuation don't. */
const SPOKEN = /[\p{L}\p{N}]/u;

/**
 * Connects the page to the sound engine, so components never deal with
 * sound themselves:
 *
 * - a hover tick for buttons and links (pointer hover or keyboard focus);
 * - a clunk when one is pressed;
 * - a swoosh as dialogs open and close, and voice blips as they type;
 * - a looping sound for elements with `data-sound="<loop>"` (the screen's
 *   hum), held while hovered or focused, or while a dialog pointing at
 *   the element is open.
 *
 * `data-sound="none"` silences an element's hover sound.
 *
 * Bound once for the whole visit, across pages. Returns a function that
 * stops any loop still held, for when the page with its element goes.
 */
export function bindSounds(
  sound: SoundEngine,
  dialogs: DialogManager
): Cleanup {
  // Browsers only allow audio to start from these events.
  for (const type of ['pointerdown', 'pointerup', 'keydown'] as const) {
    window.addEventListener(type, () => sound.unlock(), { capture: true });
  }
  prepareWhenStill(sound);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sound.suspend();
  });

  const hover = bindHover(sound);
  bindPress(sound);

  // A loop keeps going while its element's dialog is open.
  let looping: HTMLElement | null = null;
  dialogs.events.on('open', ({ view, content, anchor }) => {
    sound.play('open');
    if (anchor.element.dataset.sound === 'hum') {
      looping = anchor.element;
      hover.enter(looping, 'dialog');
    }
    view.typewriter.events.on('reveal', ({ glyph, instant }) => {
      if (!instant && SPOKEN.test(glyph.text)) {
        sound.play('blip', { voice: content.voice });
      }
    });
  });
  dialogs.events.on('close', () => {
    sound.play('close');
    if (looping) hover.leave(looping, 'dialog');
    looping = null;
  });

  return () => {
    hover.release();
    looping = null;
  };
}

/**
 * How long the browser must expect to be idle (ms) to make the audio graph
 * then: only when nothing is animating, so the wait can't stall a frame.
 */
const STILL_MS = 40;

/**
 * Makes the audio graph before the visitor's first click or key press,
 * once the page is still (see `SoundEngine.prepare`). Without
 * requestIdleCallback (older Safari), the first press makes it as before.
 */
function prepareWhenStill(sound: SoundEngine): void {
  if (typeof requestIdleCallback === 'undefined') return;
  const wait = () =>
    requestIdleCallback((deadline) => {
      if (deadline.timeRemaining() >= STILL_MS) sound.prepare();
      else wait();
    });
  wait();
}

function interactive(target: EventTarget | null): HTMLElement | null {
  const el = target instanceof Element ? target.closest(INTERACTIVE) : null;
  return el instanceof HTMLElement && !el.matches(':disabled') ? el : null;
}

type Holder = 'pointer' | 'focus' | 'dialog';

function bindHover(sound: SoundEngine): {
  enter: (el: HTMLElement, by: Holder) => void;
  leave: (el: HTMLElement, by: Holder) => void;
  /** Stops every loop, and forgets what's hovered. */
  release: () => void;
} {
  let hovered: HTMLElement | null = null;
  let lastTab = -Infinity;
  /** Loops held per element, and what's holding them. */
  const held = new Map<HTMLElement, { stop: Cleanup; by: Set<string> }>();

  const enter = (el: HTMLElement, by: Holder) => {
    const name = el.dataset.sound;
    if (name === 'none') return;
    if (name === 'hum') {
      const loop = held.get(el);
      if (loop) loop.by.add(by);
      else held.set(el, { stop: sound.loop(name), by: new Set([by]) });
    } else {
      sound.play('hover', { target: el });
    }
  };
  const leave = (el: HTMLElement, by: Holder) => {
    const loop = held.get(el);
    if (!loop) return;
    loop.by.delete(by);
    if (loop.by.size) return;
    loop.stop();
    held.delete(el);
  };
  // Muting stops loops inside the engine; forget them here too.
  sound.events.on('change', (on) => {
    if (!on) held.clear();
  });

  document.addEventListener('pointerover', (e) => {
    // Touch has no hover: a tap would tick right before its own clunk.
    if (e.pointerType === 'touch') return;
    const el = interactive(e.target);
    if (el === hovered) return;
    if (hovered) leave(hovered, 'pointer');
    hovered = el;
    if (el) enter(el, 'pointer');
  });
  document.addEventListener('pointerout', (e) => {
    if (!hovered || interactive(e.relatedTarget) === hovered) return;
    leave(hovered, 'pointer');
    hovered = null;
  });

  // Only focus moved by Tab ticks. Clicks focus things too (that's the
  // clunk's job), and so do dialogs opening and closing.
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Tab') lastTab = performance.now();
    },
    { capture: true }
  );
  document.addEventListener('focusin', (e) => {
    const el = interactive(e.target);
    if (el && performance.now() - lastTab < TAB_FOCUS_MS) enter(el, 'focus');
  });
  document.addEventListener('focusout', (e) => {
    const el = interactive(e.target);
    if (el) leave(el, 'focus');
  });

  const release = () => {
    for (const { stop } of held.values()) stop();
    held.clear();
    hovered = null;
  };

  return { enter, leave, release };
}

function bindPress(sound: SoundEngine): void {
  document.addEventListener('pointerdown', (e) => {
    if (e.button === 0 && interactive(e.target)) sound.play('press');
  });
  // Keyboard activation (Enter / Space) fires a click with no pointer.
  document.addEventListener('click', (e) => {
    if (e.detail === 0 && interactive(e.target)) sound.play('press');
  });
}
