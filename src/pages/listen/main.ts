import { pageScript } from '../../app/router.ts';
import { bindSpeechBubble } from '../../components/speech-bubble/speech-bubble.ts';
import buttonClickUrl from '../../assets/audio/cassette/button-click.mp3';
import ejectUrl from '../../assets/audio/cassette/eject.mp3';
import handle1Url from '../../assets/audio/cassette/handle-1.mp3';
import handle2Url from '../../assets/audio/cassette/handle-2.mp3';
import handle3Url from '../../assets/audio/cassette/handle-3.mp3';
import handle4Url from '../../assets/audio/cassette/handle-4.mp3';
import handle5Url from '../../assets/audio/cassette/handle-5.mp3';
import handle6Url from '../../assets/audio/cassette/handle-6.mp3';
import playUrl from '../../assets/audio/cassette/play.mp3';
import { ditherGlsl } from '../../gl/dither.ts';
import { ShaderCanvas } from '../../gl/shader-canvas.ts';
import noteBeamedEighths from './art/note-beamed-eighths.svg?raw';
import noteBeamedSixteenths from './art/note-beamed-sixteenths.svg?raw';
import noteEighth from './art/note-eighth.svg?raw';
import noteHalf from './art/note-half.svg?raw';
import noteQuarter from './art/note-quarter.svg?raw';
import noteSixteenth from './art/note-sixteenth.svg?raw';
import page from './page.config.ts';
import sceneShader from './scene.frag?raw';

/** The parts of Spotify's iFrame API this page uses. */
interface Controller {
  play(): void;
  pause(): void;
  destroy(): void;
  addListener(
    event: 'playback_update',
    listener: (e: { data: { isPaused: boolean } }) => void
  ): void;
  addListener(event: 'ready', listener: () => void): void;
}
interface IFrameAPI {
  createController(
    el: HTMLElement,
    options: { uri: string; width: string; height: number },
    ready: (controller: Controller) => void
  ): void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
  }
}

/** Spotify's compact embed's height. CSS scales it to fit the screen. */
const EMBED_HEIGHT = 80;
/**
 * How much of the embed is cut off each side (its pixels), so its rounded
 * corners are hidden and it fills the screen.
 */
const EMBED_CROP = 5;
/** How long a tape takes to go in, and to come back out. */
const INSERT_MS = 700;
const EJECT_MS = 450;
/**
 * The see-through window in deck-full.webp a tape shows through, as
 * shares of the deck art: x, y, width, height.
 */
const WINDOW = [0.281, 0.236, 0.383, 0.194];
/**
 * The black panel in the deck art the embed fills, as shares of it, and
 * how far (CSS pixels) the embed covers past its edge (--edge in
 * listen.css). The shader leaves it see-through, showing the embed.
 */
const SCREEN = [0.16, 0.551, 0.578, 0.166];
const SCREEN_EDGE = 2;
/** Where a tape ends up behind it, as shares of the deck art. */
const BAY = { x: 0.473, y: 0.332, width: 0.344 };
/** How much of the way in a tape goes behind the glass. */
const GLASS_FROM = 0.8;
/** Hovering over a tape on the shelf: it grows and turns (degrees). */
/** It snaps there, with no easing. */
const HOVER = { scale: 1.08, turn: -4 };
/**
 * While a tape plays, it and the deck dance: each sways (degrees) and
 * squashes (a share of its height) over its own period (s), the deck by
 * `deck` as much, rocking on its base. The tape lags the deck by `lag` of
 * a period, so it bounces inside it. It fades in and out over `ms`.
 */
const DANCE = {
  sway: 2,
  swayPeriod: 1.8,
  squash: 0.04,
  squashPeriod: 0.9,
  deck: 0.6,
  lag: 0.15,
  ms: 400,
};
/**
 * While a tape plays, notes float up off the top of the deck, one every
 * `every` seconds (on the beat), from either half in turn. Each lives
 * `life` seconds: it rises `rise`, drifts outwards `drift` and wobbles
 * `wobble` side to side every `wobblePeriod` seconds, all as shares of
 * the deck's width, and rocks `rock` degrees. It's `size` (a range) of
 * the deck's width. It dissolves in over `fadeIn` seconds, and out over
 * its last `fadeOut`.
 */
const NOTES = {
  every: 0.45,
  life: 2.6,
  rise: 0.9,
  drift: 0.12,
  wobble: 0.03,
  wobblePeriod: 1.2,
  rock: 12,
  size: [0.11, 0.15],
  fadeIn: 0.15,
  fadeOut: 2.2,
};
/**
 * The notes' shapes, from Leland (MuseScore's music font, SIL Open Font
 * License) by way of art/note-*.svg.
 */
const NOTE_SHAPES = [
  ...[noteQuarter, noteEighth, noteBeamedEighths],
  ...[noteSixteenth, noteBeamedSixteenths, noteHalf],
];
/**
 * How much bolder the notes are drawn than the font, in its units (a
 * stem is 25), so their stems survive the dither's chunky pixels.
 */
const NOTE_WEIGHT = 60;
/** The shader's most notes (MAX_NOTES in scene.frag). */
const MAX_NOTES = 12;
/** A pose until a tape's placed. */
const STILL: Pose = {
  ...{ x: 0, y: 0, width: 0, height: 0, turn: 0 },
  ...{ squashX: 1, squashY: 1, lift: 0 },
};
/** The shader's most tapes (MAX_TAPES in scene.frag). */
const MAX_TAPES = 8;
/** Texture widths, near the most they're drawn at, so they shrink cleanly. */
const DECK_TEXTURE_WIDTH = 400;
const TAPE_TEXTURE_WIDTH = 240;
const NOTE_TEXTURE_SIZE = 64;

/** Picking up a tape: one of these, never the same twice running. */
const HANDLE_URLS = [
  ...[handle1Url, handle2Url, handle3Url],
  ...[handle4Url, handle5Url, handle6Url],
];

/** Spotify's script, loaded once, when the first tape goes in. */
let api: Promise<IFrameAPI> | undefined;
function spotify(): Promise<IFrameAPI> {
  api ??= new Promise((resolve) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    document.head.append(script);
  });
  return api;
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/** A tape on the shelf, and how far it is into the deck. */
interface TapeState {
  button: HTMLButtonElement;
  art: HTMLImageElement;
  /** The masking tape on it, and how much it's turned (degrees). */
  strip: HTMLImageElement | null;
  tilt: number;
  /** 0 on the shelf, 1 in the deck. */
  at: number;
  /** Where it's headed. */
  to: 0 | 1;
  /** Under the pointer or focused, and grown for it (0 or 1). */
  hovered: boolean;
  hover: number;
  /** Where it's drawn (see `place`). */
  pose: Pose;
}

/**
 * A note floating up: where along the deck's top it started (a share of
 * its width), which way it drifts (-1 or 1), its shape, size (a share of
 * the deck's width) and age (s), and where its wobble starts (radians).
 */
interface Note {
  x: number;
  side: number;
  shape: number;
  size: number;
  age: number;
  phase: number;
}

/**
 * Where a tape is drawn: its centre and size (CSS pixels, from the
 * viewport's top left), its turn (radians, clockwise), its squash (width
 * and height scale) and how far it's lifted (0–1, for its shadow).
 */
interface Pose {
  x: number;
  y: number;
  width: number;
  height: number;
  turn: number;
  squashX: number;
  squashY: number;
  lift: number;
}

pageScript(import.meta.url, ({ sound }) => {
  const scene = document.querySelector<HTMLElement>('[data-scene]');
  const deck = document.querySelector<HTMLElement>('[data-deck]');
  const screen = document.querySelector<HTMLElement>('[data-screen]');
  const status = document.querySelector<HTMLElement>('[data-status]');
  const deckArt = (name: string) =>
    document.querySelector<HTMLImageElement>(`[data-deck-art="${name}"]`);
  const deckEmpty = deckArt('empty');
  const deckFull = deckArt('full');
  const keys = [...document.querySelectorAll<HTMLButtonElement>('[data-key]')];
  const shelf = document.querySelector<HTMLElement>('[data-shelf]');
  const hints = [
    ...document.querySelectorAll<HTMLElement>(
      '[data-speech-bubble="listen-hint"]'
    ),
  ];
  if (!scene || !deck || !screen || !deckEmpty || !deckFull) return;

  const tapes: TapeState[] = [
    ...document.querySelectorAll<HTMLButtonElement>('[data-tape]'),
  ].flatMap((button) => {
    const art = button.querySelector<HTMLImageElement>('[data-art]');
    const strip = button.querySelector<HTMLImageElement>('[data-strip]');
    const { tilt } = page.tapes[Number(button.dataset.tape)];
    if (!art) return [];
    const tape: TapeState = {
      ...{ button, art, strip, tilt, at: 0, to: 0 },
      ...{ hovered: false, hover: 0, pose: STILL },
    };
    return [tape];
  });

  let controller: Controller | undefined;
  /** The tape in the deck, or on its way in. */
  let inserted: TapeState | undefined;
  let shader: ShaderCanvas | null = null;
  let disposed = false;
  /** Whether Spotify's playing, how far into the dance it is (0–1), and its clock (s). */
  let playing = false;
  let groove = 0;
  let beat = 0;
  /** The notes in the air, how long until the next (s), and its side. */
  let notes: Note[] = [];
  let nextNote = 0;
  let noteSide = 1;
  /** Each note's centre and size (CSS pixels) and shape, then its turn and how much shows. */
  let notePoses: number[][] = [];
  /** The deck's box, as laid out, and its dance's turn and squash. */
  let deckLayout = {
    ...{ left: 0, top: 0, width: 0, height: 0 },
    ...{ turn: 0, squashX: 1, squashY: 1 },
  };
  const key = (name: string) => keys.find((k) => k.dataset.key === name);
  const say = (text: string) => {
    if (status) status.textContent = text;
  };
  const volumes = page.sounds;
  sound.preload([...HANDLE_URLS, playUrl, buttonClickUrl, ejectUrl]);
  let lastHandle = -1;
  const pickUp = () => {
    const choices = HANDLE_URLS.length - (lastHandle < 0 ? 0 : 1);
    let i = Math.floor(Math.random() * choices);
    if (lastHandle >= 0 && i >= lastHandle) i++;
    lastHandle = i;
    sound.playSample(HANDLE_URLS[i], volumes.handle);
  };
  /** Set while focus goes back to an ejected tape, which isn't picking it up. */
  let refocusing = false;
  const titleOf = (tape: TapeState) =>
    page.tapes[Number(tape.button.dataset.tape)].title;

  // Moving the tapes: each frame works out every tape's pose, between its
  // place on the shelf and the deck, and puts its button there. The
  // shader draws the art in the same poses, so the two never drift apart.
  let frame = 0;
  let last = 0;
  /** The dance's turn and squash, `lag` of a period behind, `amount` as big. */
  const moves = (lag: number, amount: number) => {
    const tau = 2 * Math.PI;
    const size = groove * amount;
    const squash =
      DANCE.squash * size * Math.sin(tau * (beat / DANCE.squashPeriod - lag));
    return {
      turn:
        ((DANCE.sway * Math.PI) / 180) *
        size *
        Math.sin(tau * (beat / DANCE.swayPeriod - lag)),
      squashX: 1 - squash / 2,
      squashY: 1 + squash,
    };
  };
  const place = () => {
    // The deck's box as laid out, which its dance doesn't move.
    const sceneBox = scene.getBoundingClientRect();
    const deckBox = {
      left: sceneBox.left + deck.offsetLeft,
      top: sceneBox.top + deck.offsetTop,
      width: deck.offsetWidth,
      height: deck.offsetHeight,
    };
    deckLayout = { ...deckBox, ...moves(0, DANCE.deck) };
    const { turn, squashX, squashY } = deckLayout;
    deck.style.transform =
      groove > 0 ? `rotate(${turn}rad) scale(${squashX}, ${squashY})` : '';
    /** Where a point in the deck goes as it dances, about its base. */
    const pivot = {
      x: deckBox.left + deckBox.width / 2,
      y: deckBox.top + deckBox.height,
    };
    const withDeck = (x: number, y: number) => {
      const dx = (x - pivot.x) * squashX;
      const dy = (y - pivot.y) * squashY;
      return {
        x: pivot.x + dx * Math.cos(turn) - dy * Math.sin(turn),
        y: pivot.y + dx * Math.sin(turn) + dy * Math.cos(turn),
      };
    };
    for (const tape of tapes) {
      const slot = tape.button.parentElement?.getBoundingClientRect();
      if (!slot) continue;
      const t = ease(tape.at);
      const home = {
        x: slot.left + slot.width / 2,
        y: slot.top + slot.height / 2,
      };
      const bay = {
        x: deckBox.left + BAY.x * deckBox.width,
        y: deckBox.top + BAY.y * deckBox.height,
      };
      // Hovering shows only on the shelf.
      const hover = tape.hover * (1 - t);
      const scale =
        (1 + t * ((BAY.width * deckBox.width) / slot.width - 1)) *
        (1 + (HOVER.scale - 1) * hover);
      const pose: Pose = {
        x: home.x + t * (bay.x - home.x),
        y: home.y + t * (bay.y - home.y),
        width: slot.width * scale,
        height: slot.height * scale,
        turn: (HOVER.turn * hover * Math.PI) / 180,
        squashX: 1,
        squashY: 1,
        lift: hover,
      };
      if (tape === inserted && groove > 0) {
        const own = moves(DANCE.lag, 1);
        pose.turn += own.turn;
        pose.squashX = own.squashX;
        pose.squashY = own.squashY;
        // It squashes onto its bottom edge.
        pose.y += (pose.height * (1 - pose.squashY)) / 2;
        // And it's in the deck, so it moves with it.
        Object.assign(pose, withDeck(pose.x, pose.y));
        pose.turn += turn;
        pose.width *= squashX;
        pose.height *= squashY;
      }
      tape.pose = pose;
      tape.button.style.transform =
        `translate(${pose.x - home.x}px, ${pose.y - home.y}px) ` +
        `rotate(${pose.turn}rad) ` +
        `scale(${(pose.width * pose.squashX) / slot.width}, ` +
        `${(pose.height * pose.squashY) / slot.height})`;
      // Behind the glass, the shader draws it, and the label darkens to
      // match (listen.css). Once it's in, only the label shows.
      tape.button.style.setProperty('--glass', String(glass(tape)));
      tape.button.toggleAttribute('data-in', tape.to === 1 && tape.at === 1);
    }
    deck.toggleAttribute(
      'data-full',
      tapes.some((t) => glass(t) > 0)
    );
    notePoses = notes.map((note) => {
      const t = note.age / NOTES.life;
      const w = deckBox.width;
      const wobble = Math.sin(
        (2 * Math.PI * note.age) / NOTES.wobblePeriod + note.phase
      );
      const out = 1 - (1 - t) ** 2;
      return [
        deckBox.left +
          note.x * w +
          note.side * NOTES.drift * w * out +
          NOTES.wobble * w * wobble,
        // It starts sitting on the deck's top.
        deckBox.top - (note.size * w) / 2 - NOTES.rise * w * t,
        note.size * w,
        note.shape,
        ((NOTES.rock * Math.PI) / 180) * wobble,
        Math.min(
          1,
          note.age / NOTES.fadeIn,
          (NOTES.life - note.age) / NOTES.fadeOut
        ),
      ];
    });
    shader?.render();
  };
  /** Moves `value` towards `target` by `delta`. */
  const towards = (value: number, target: number, delta: number) =>
    value < target
      ? Math.min(target, value + delta)
      : Math.max(target, value - delta);
  const step = (now: number) => {
    const elapsed = now - last;
    last = now;
    const still = reducedMotion.matches;
    let busy = false;
    for (const tape of tapes) {
      const duration = tape.to === 1 ? INSERT_MS : EJECT_MS;
      tape.at = towards(tape.at, tape.to, still ? 1 : elapsed / duration);
      tape.hover = tape.hovered && tape.to === 0 ? 1 : 0;
      busy ||= tape.at !== tape.to;
    }
    // It dances while its tape plays, once it's all the way in.
    const dancing = playing && inserted?.at === 1 && !still ? 1 : 0;
    groove = towards(groove, dancing, still ? 1 : elapsed / DANCE.ms);
    beat = groove > 0 ? beat + elapsed / 1000 : 0;
    busy ||= groove > 0 || dancing > 0;
    // Notes float up while it dances, and the last ones finish after.
    for (const note of notes) note.age += elapsed / 1000;
    notes = notes.filter((note) => note.age < NOTES.life);
    nextNote -= elapsed / 1000;
    if (dancing && nextNote <= 0) {
      nextNote = NOTES.every;
      if (shader && notes.length < MAX_NOTES) notes.push(newNote());
    }
    busy ||= notes.length > 0;
    place();
    frame = busy ? requestAnimationFrame(step) : 0;
  };
  const newNote = (): Note => {
    noteSide = -noteSide;
    const [small, big] = NOTES.size;
    return {
      x: 0.5 + noteSide * (0.1 + 0.35 * Math.random()),
      side: noteSide,
      shape: Math.floor(Math.random() * NOTE_SHAPES.length),
      size: small + (big - small) * Math.random(),
      age: 0,
      phase: 2 * Math.PI * Math.random(),
    };
  };
  const move = () => {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(step);
  };

  const eject = () => {
    if (!inserted) return;
    const tape = inserted;
    controller?.destroy();
    controller = undefined;
    screen.replaceChildren();
    for (const k of keys) k.disabled = true;
    deck.removeAttribute('data-playing');
    playing = false;
    groove = 0;
    inserted = undefined;
    tape.to = 0;
    sound.playSample(ejectUrl, volumes.eject);
    place();
    move();
    say(`Ejected ${titleOf(tape)}.`);
  };

  const insert = (tape: TapeState) => {
    if (inserted === tape) return;
    eject();
    inserted = tape;
    tape.to = 1;
    // It's been shown how.
    for (const hint of hints) hint.toggleAttribute('data-hidden', true);
    sound.playSample(playUrl, volumes.insert);
    move();
    say(`Inserted ${titleOf(tape)}.`);
    const uri = page.tapes[Number(tape.button.dataset.tape)].uri;
    void spotify().then((iframe) => {
      // Ejected or swapped while Spotify's script loaded.
      if (inserted !== tape) return;
      // The embed replaces this element, so give it a fresh one.
      const slot = document.createElement('div');
      screen.replaceChildren(slot);
      iframe.createController(
        slot,
        { uri, width: '100%', height: EMBED_HEIGHT },
        (c) => {
          if (inserted !== tape) return c.destroy();
          controller = c;
          for (const k of keys) k.disabled = false;
          // Putting a tape in is pressing play: no hunting for the key.
          c.addListener('ready', () => {
            if (controller === c) c.play();
          });
          // The deck follows what's playing, whichever buttons did it.
          c.addListener('playback_update', ({ data }) => {
            playing = !data.isPaused;
            deck.toggleAttribute('data-playing', playing);
            move();
            key('play')?.setAttribute('aria-pressed', String(!data.isPaused));
          });
        }
      );
    });
  };

  for (const tape of tapes) {
    const { button } = tape;
    button.addEventListener('click', () => insert(tape));
    const hover = (hovered: boolean) => () => {
      // It's picked up: it makes a sound, unless that's just focus coming
      // back to it after an eject.
      if (hovered && !tape.hovered && tape.to === 0 && !refocusing) pickUp();
      tape.hovered = hovered;
      move();
    };
    // Touch has no hover: a tap would pick it up right before putting it in.
    button.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'touch') hover(true)();
    });
    button.addEventListener('pointerleave', hover(false));
    button.addEventListener('focus', hover(true));
    button.addEventListener('blur', hover(false));
  }
  const click = () => sound.playSample(buttonClickUrl, volumes.key);
  key('play')?.addEventListener('click', () => {
    click();
    controller?.play();
  });
  key('stop')?.addEventListener('click', () => {
    click();
    controller?.pause();
  });
  key('eject')?.addEventListener('click', () => {
    const tape = inserted;
    eject();
    refocusing = true;
    tape?.button.focus();
    refocusing = false;
  });

  const [x, y, w, h] = SCREEN;
  Object.entries({ x, y, w, h }).forEach(([name, value]) =>
    screen.style.setProperty(`--${name}`, String(value))
  );
  screen.style.setProperty('--edge', `${SCREEN_EDGE}px`);

  const stopBoiling = bindSpeechBubble('listen-hint');

  // The embed is drawn at its own height and scaled to fit the screen,
  // and the hint points at the shelf.
  const fit = new ResizeObserver(() => {
    const top = tapes[0]?.button.parentElement;
    if (shelf && top) {
      // Phones: the shelf's top middle. Wide screens: the top tape's
      // right side (its slot's, as it's in the shelf).
      const set = (name: string, px: number) =>
        scene.style.setProperty(`--hint-${name}`, `${px}px`);
      set('down-x', shelf.offsetLeft + shelf.offsetWidth / 2);
      set('down-y', shelf.offsetTop);
      set('left-x', shelf.offsetLeft + top.offsetLeft + top.offsetWidth);
      set('left-y', shelf.offsetTop + top.offsetTop + top.offsetHeight / 2);
    }
    screen.style.setProperty(
      '--embed-scale',
      String(screen.clientHeight / (EMBED_HEIGHT - 2 * EMBED_CROP))
    );
    place();
  });
  fit.observe(screen);
  fit.observe(scene);

  void document.fonts.ready.then(() => {
    if (!disposed) fitTitles();
  });

  void startShader().then((s) => {
    if (disposed) return s?.dispose();
    shader = s;
    place();
  });

  /** The dithered scene over the art, or null without WebGL. */
  async function startShader(): Promise<ShaderCanvas | null> {
    if (!scene || tapes.length > MAX_TAPES) return null;
    try {
      await Promise.all(
        [deckEmpty, deckFull, ...tapes.flatMap((t) => [t.art, t.strip])].map(
          (img) => img?.decode()
        )
      );
    } catch {
      return null;
    }
    if (!deckEmpty || !deckFull) return null;
    const canvas = document.createElement('canvas');
    canvas.className = 'listen__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const tapeArt = atlas(tapes.map(labelled));
    const s = ShaderCanvas.create(canvas, {
      fragment: ditherGlsl(page.dither.palette) + sceneShader,
      animate: false,
      transparent: true,
      textures: {
        u_deck: shrink(deckEmpty, DECK_TEXTURE_WIDTH),
        u_deck_full: shrink(deckFull, DECK_TEXTURE_WIDTH),
        u_tape_art: tapeArt.canvas,
        u_note_art: noteAtlas(),
      },
      maxPixelRatio: 1 / page.dither.pixelSize,
      // Every draw reads where the art is on the page.
      beforeDraw: () => {
        const box = canvas.getBoundingClientRect();
        s?.set('u_size', box.width, box.height);
        const d = deckLayout;
        s?.set(
          'u_deck_rect',
          d.left - box.left,
          d.top - box.top,
          d.width,
          d.height
        );
        s?.set('u_deck_pose', d.turn, d.squashX, d.squashY);
        s?.set('u_full', deck?.hasAttribute('data-full') ? 1 : 0);
        const inside = tapes.findIndex((t) => glass(t) > 0);
        s?.set('u_glass_tape', inside);
        s?.set('u_glass', inside < 0 ? 0 : glass(tapes[inside]));
        const unused = Array<number>(4 * (MAX_TAPES - tapes.length)).fill(0);
        s?.set(
          'u_tape_rects',
          ...tapes.flatMap(({ pose }) => [
            pose.x - box.left,
            pose.y - box.top,
            pose.width,
            pose.height,
          ]),
          ...unused
        );
        const noNotes = Array<number>(4 * (MAX_NOTES - notePoses.length)).fill(
          0
        );
        s?.set(
          'u_notes',
          ...notePoses.flatMap(([x, y, size, shape]) => [
            x - box.left,
            y - box.top,
            size,
            shape,
          ]),
          ...noNotes
        );
        s?.set(
          'u_note_poses',
          ...notePoses.flatMap(([, , , , turn, shows]) => [turn, shows, 0, 0]),
          ...noNotes
        );
        s?.set('u_note_count', notePoses.length);
        s?.set(
          'u_tape_poses',
          ...tapes.flatMap(({ pose }) => [
            pose.turn,
            pose.squashX,
            pose.squashY,
            pose.lift,
          ]),
          ...unused
        );
      },
    });
    if (!s) return null;
    s.set('u_tape_count', tapes.length);
    s.set('u_tape_edge', 0.5 / tapeArt.cellHeight);
    s.set('u_note_kinds', NOTE_SHAPES.length);
    s.set('u_window', ...WINDOW);
    s.set('u_screen', ...SCREEN);
    s.set('u_screen_edge', SCREEN_EDGE);
    scene.prepend(canvas);
    scene.dataset.gl = '';
    return s;
  }

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    fit.disconnect();
    stopBoiling();
    shader?.dispose();
    controller?.destroy();
  };
});

/** The title's size, as a share of its strip's width: at most, at least. */
const TITLE_SIZE = { max: 12, min: 5 };

/**
 * Shrinks each tape's title until it fits on its masking tape. It's sized
 * relative to the strip, so it fits however big the tape is drawn.
 */
function fitTitles(): void {
  for (const title of document.querySelectorAll<HTMLElement>('[data-title]')) {
    const box = title.parentElement;
    if (!box) continue;
    for (let size = TITLE_SIZE.max; size >= TITLE_SIZE.min; size -= 0.5) {
      box.style.fontSize = `${size}cqi`;
      if (
        title.offsetHeight <= box.clientHeight &&
        title.offsetWidth <= box.clientWidth
      ) {
        break;
      }
    }
  }
}

/** How far behind the deck's glass a tape is, 0–1. */
function glass(tape: TapeState): number {
  return tape.to === 1
    ? Math.max(0, (tape.at - GLASS_FROM) / (1 - GLASS_FROM))
    : 0;
}

/** Eases in and out. */
function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** `img` drawn at `width` (keeping its shape), as a texture. */
function shrink(img: HTMLImageElement, width: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((img.naturalHeight * width) / img.naturalWidth);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/**
 * A tape's art with its masking tape stuck on, where its label is
 * (listen.css places the title the same way).
 */
function labelled(tape: TapeState): HTMLCanvasElement {
  const { art, strip } = tape;
  const canvas = document.createElement('canvas');
  canvas.width = art.naturalWidth;
  canvas.height = art.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(art, 0, 0);
  if (strip) {
    const width = canvas.width * page.label.width;
    const height = (width * strip.naturalHeight) / strip.naturalWidth;
    ctx.translate(canvas.width / 2, canvas.height * page.label.y);
    ctx.rotate((tape.tilt * Math.PI) / 180);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(strip, -width / 2, -height / 2, width, height);
  }
  return canvas;
}

/**
 * The tapes' art in one texture, one above the other, each stretched to
 * the same cell. The shader stretches each back into its box.
 */
function atlas(images: HTMLCanvasElement[]): {
  canvas: HTMLCanvasElement;
  cellHeight: number;
} {
  const canvas = document.createElement('canvas');
  const cellHeight = Math.round(TAPE_TEXTURE_WIDTH * 0.66);
  canvas.width = TAPE_TEXTURE_WIDTH;
  canvas.height = cellHeight * Math.max(1, images.length);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingQuality = 'high';
    images.forEach((img, i) => {
      ctx.drawImage(img, 0, i * cellHeight, TAPE_TEXTURE_WIDTH, cellHeight);
    });
  }
  return { canvas, cellHeight };
}

/**
 * The notes' shapes in one texture, one above the other, each centred in
 * a square cell, drawn bolder by `NOTE_WEIGHT`. Only their outline counts.
 */
function noteAtlas(): HTMLCanvasElement {
  const size = NOTE_TEXTURE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * NOTE_SHAPES.length;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  NOTE_SHAPES.forEach((svg, i) => {
    const [, , width, height] = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '')
      .split(' ')
      .map(Number);
    const d = /\sd="([^"]+)"/.exec(svg)?.[1];
    if (!d || !width || !height) return;
    // Fits the cell with room for the bolder edge.
    const scale = size / (Math.max(width, height) + NOTE_WEIGHT);
    ctx.setTransform(
      scale,
      0,
      0,
      scale,
      (size - width * scale) / 2,
      i * size + (size - height * scale) / 2
    );
    const path = new Path2D(d);
    ctx.fill(path);
    ctx.lineWidth = NOTE_WEIGHT;
    ctx.lineJoin = 'round';
    ctx.stroke(path);
  });
  return canvas;
}
