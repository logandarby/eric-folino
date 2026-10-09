import { $$ } from '../../core/component.ts';
import type { Cleanup } from '../../core/disposer.ts';
import { Disposer } from '../../core/disposer.ts';
import { animate, duration } from '../../core/motion.ts';
import type { SoundEngine } from '../../sound/sound-engine.ts';
import {
  playCollage,
  type CollagePlayer,
  type PanelCollage,
} from '../collage-video/collage-video.ts';
import screenMask from '../../assets/bg/screen-mask.json';
import screenMaskUrl from '../../assets/bg/screen-mask.webp';
import screenReflections from '../../assets/bg/screen-reflections.json';
import screenReflectionsUrl from '../../assets/bg/screen-reflections.webp';

/**
 * How bright the "lights off" overlay leaves the panel (LIGHTS_OFF.brightness
 * in scripts/build-images.mjs), so the video dims with it.
 */
const LIGHTS_OFF_BRIGHTNESS = 0.09;

/** How long the sign takes to grow and shrink back when pressed (ms). */
const PRESS_MS = 240;

export interface ListenConfig {
  /** Accessible name for the button over the screen. */
  label: string;
  /** The call to listen, below the screen. */
  cta: string;
  song: {
    /** For the phone's lock screen and the like. */
    title: string;
    artist: string;
    /** 0–1, on top of the sound button's volume. */
    volume: number;
  };
  /** What the screen plays along. */
  video: PanelCollage;
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * Makes listen.tsx play `songUrl`, with the collage video on the screen
 * while it plays. The song and the video pause together; when the song
 * ends, the screen goes back to how it was.
 *
 * The song follows the sound button: its volume, and muting pauses it.
 * Pressing play with sound off turns sound on, since that's asking for it.
 * Returns a function that stops it all, for when the page goes.
 */
export function bindListen(
  root: HTMLElement,
  sound: SoundEngine,
  config: ListenConfig,
  songUrl: string
): Cleanup {
  // Under the stage (ListenVideo), not in root.
  const screen = document.querySelector<HTMLElement>('[data-listen-video]');
  const sign = root.querySelector<HTMLElement>('[data-listen-sign]');
  const toggles = $$<HTMLButtonElement>('[data-listen-toggle]', root);
  if (!screen || !sign) return () => undefined;

  const disposer = new Disposer();
  const audio = new Audio();
  audio.preload = 'none';
  audio.src = songUrl;
  const setVolume = () => {
    audio.volume = sound.volume * config.song.volume;
  };
  setVolume();
  let video: CollagePlayer | null = null;

  const show = (state: 'idle' | 'playing' | 'paused') => {
    root.dataset.state = state;
    screen.dataset.state = state;
    for (const toggle of toggles) {
      toggle.setAttribute('aria-pressed', String(state === 'playing'));
    }
    // Paused, the picture holds but the panel stays lit; once the song's
    // over, it goes back to the ad.
    video?.set(
      state === 'playing' ? 'playing' : state === 'paused' ? 'held' : 'off'
    );
    playbackSession(state === 'playing');
  };

  const toggle = () => {
    // A transform, so it adds to the hover's `scale` rather than fighting it.
    void animate(
      sign,
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.25)' },
        { transform: 'scale(1)' },
      ],
      { duration: duration(PRESS_MS) }
    );
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (!sound.enabled) sound.setEnabled(true);
    video ??= playCollage(screen, config.video, {
      light: lightLevel,
      mask: { url: screenMaskUrl, margin: screenMask.margin },
      reflections: { url: screenReflectionsUrl, box: screenReflections },
    });
    show('playing');
    audio.play().catch(() => show(audio.currentTime ? 'paused' : 'idle'));
  };

  // The audio's own events, so the phone's media controls keep it right.
  disposer.listen(audio, 'play', () => show('playing'));
  disposer.listen(audio, 'pause', () => show('paused'));
  disposer.listen(audio, 'ended', () => show('idle'));
  for (const el of toggles) disposer.listen(el, 'click', toggle);
  disposer.add(
    sound.events.on('change', (on) => {
      if (!on) audio.pause();
    })
  );
  disposer.add(sound.events.on('volume', setVolume));

  if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: config.song.title,
      artist: config.song.artist,
    });
    disposer.add(() => {
      navigator.mediaSession.metadata = null;
    });
  }

  disposer.add(() => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    video?.dispose();
    playbackSession(false);
  });
  return () => disposer.dispose();
}

/**
 * How lit the bus stop's panel is, 0–1: LightFlicker (light-flicker.ts)
 * fades the "lights off" overlay in to flicker it. Read every frame of
 * the video, but only looked up while a flicker is running.
 */
function lightLevel(): number {
  const lightsOff = document.querySelector<HTMLElement>('[data-lights-off]');
  if (!lightsOff?.getAnimations().length) return 1;
  const off = Number(getComputedStyle(lightsOff).opacity);
  return 1 - off * (1 - LIGHTS_OFF_BRIGHTNESS);
}

/**
 * On iPhones, the site's sounds respect the silent switch (see
 * audio-graph.ts). Music asked for shouldn't: while it plays, it plays
 * like any music app.
 */
function playbackSession(on: boolean): void {
  const { audioSession } = navigator as AudioSessionNavigator;
  if (audioSession) audioSession.type = on ? 'playback' : 'ambient';
}
