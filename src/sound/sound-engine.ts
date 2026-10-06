import type { Cleanup } from '../core/disposer.ts';
import { Emitter } from '../core/emitter.ts';
import type { UserPreferences } from '../core/preferences.ts';
import type { SoundConfig } from '../site.config.ts';
import { AudioGraph } from './audio-graph.ts';
import {
  PATCHES,
  type LoopName,
  type OneShotName,
  type PatchRegistry,
  type PlayOptions,
} from './patches/index.ts';
import type { PatchContext } from './patches/patch.ts';
import { Throttle, VoicePool, type Voice } from './rate-limit.ts';

/** The visitor's sound settings, saved between visits. */
export type SoundPreferences = {
  /** Sound on or off. */
  sound: boolean;
  /** 0–1, on top of the configured volumes. */
  volume: number;
};

export interface SoundEngineOptions {
  config: SoundConfig;
  preferences: UserPreferences<SoundPreferences>;
  patches?: PatchRegistry;
  /** Builds the audio graph; returns null when Web Audio is missing. */
  createGraph?: (config: SoundConfig, volume: number) => AudioGraph | null;
  /** Clock for rate limits, in ms. */
  now?: () => number;
  random?: () => number;
}

/** Lets one-shots ring out before audio is suspended after muting. */
const MUTE_GRACE_MS = 300;

/**
 * The site's sound system (see src/sound/README.md). Everything else only
 * calls `play()`, `loop()` and `setEnabled()`; the engine decides whether a
 * sound actually plays (sound on, audio unlocked, not rate limited) and
 * keeps the mix in check.
 *
 * Audio stays silent until `unlock()` is called from a click or key press,
 * because browsers block sound before the visitor interacts with the page.
 *
 * Settings live in `UserPreferences`, and the engine follows them however
 * they change, including from another tab.
 */
export class SoundEngine {
  readonly events = new Emitter<{ change: boolean; volume: number }>();
  private readonly patches: PatchRegistry;
  private readonly createGraph: (
    config: SoundConfig,
    volume: number
  ) => AudioGraph | null;
  private readonly throttle: Throttle;
  private readonly voices: VoicePool;
  private readonly loops = new Set<Voice>();
  private readonly random: () => number;
  private graph: AudioGraph | null = null;
  private unsupported = false;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly options: SoundEngineOptions) {
    this.patches = options.patches ?? PATCHES;
    this.createGraph = options.createGraph ?? AudioGraph.create;
    this.throttle = new Throttle(options.now);
    this.voices = new VoicePool(options.config.maxVoices);
    this.random = options.random ?? Math.random;
    options.preferences.events.on('change', (key) => {
      if (key === 'sound') this.applyEnabled();
      else this.applyVolume();
    });
  }

  get enabled(): boolean {
    return this.options.preferences.get('sound');
  }

  get volume(): number {
    return this.options.preferences.get('volume');
  }

  /** False once we know the browser can't play sound. */
  get supported(): boolean {
    return !this.unsupported;
  }

  /** Turns sound on or off, and remembers the choice. */
  setEnabled(on: boolean): void {
    this.options.preferences.set('sound', on);
    // We're in a click or key press, so audio may start now.
    if (on) this.unlock();
  }

  /** Sets the volume (0–1), and remembers it. */
  setVolume(volume: number): void {
    this.options.preferences.set('volume', Math.min(1, Math.max(0, volume)));
  }

  private applyEnabled(): void {
    const on = this.enabled;
    if (on) {
      // Turned on elsewhere (another tab): resume if audio already started,
      // otherwise wait for the next click or key press.
      if (this.graph) this.resume(this.graph);
    } else {
      this.loops.forEach((loop) => loop.stop());
      this.loops.clear();
      this.scheduleSuspend(MUTE_GRACE_MS);
    }
    this.events.emit('change', on);
  }

  private applyVolume(): void {
    this.graph?.setVolume(this.volume);
    this.events.emit('volume', this.volume);
  }

  /**
   * Starts audio. Must run inside a click or key press handler the first
   * time; after that the browser lets it resume freely.
   */
  unlock(): void {
    if (!this.enabled || this.unsupported) return;
    if (!this.graph) {
      this.graph = this.createGraph(this.options.config, this.volume);
      if (!this.graph) {
        this.unsupported = true;
        return;
      }
    }
    this.resume(this.graph);
  }

  /** Pauses audio, e.g. while the tab is hidden. Loops keep their place. */
  suspend(): void {
    clearTimeout(this.idleTimer);
    if (this.graph?.ctx.state === 'running') void this.graph.ctx.suspend();
  }

  play(name: OneShotName, options: PlayOptions = {}): void {
    const graph = this.live();
    if (!graph) return;

    const { config } = this.options;
    if (!this.throttle.ready(name, config[name].minGapMs)) return;
    if (
      name === 'hover' &&
      options.target &&
      !this.throttle.ready(options.target, config.hover.sameTargetGapMs)
    ) {
      return;
    }
    this.throttle.mark(name);
    if (options.target) this.throttle.mark(options.target);

    const patch = this.patches.oneShots[name];
    this.voices.add(
      patch.play(this.context(graph, patch.channel), options),
      graph.ctx.currentTime
    );
    this.scheduleSuspend(this.options.config.idleSuspendMs);
  }

  /** Starts a looping sound; call the returned function to fade it out. */
  loop(name: LoopName): Cleanup {
    const graph = this.live();
    if (!graph) return () => {};
    clearTimeout(this.idleTimer);

    const patch = this.patches.loops[name];
    const voice = patch.start(this.context(graph, patch.channel));
    this.loops.add(voice);
    return () => {
      if (!this.loops.delete(voice)) return;
      voice.stop();
      this.scheduleSuspend(this.options.config.idleSuspendMs);
    };
  }

  /** The graph, if sound may play right now. */
  private live(): AudioGraph | null {
    if (!this.enabled || !this.graph) return null;
    this.resume(this.graph);
    return this.graph;
  }

  private resume(graph: AudioGraph): void {
    if (graph.ctx.state === 'suspended') void graph.ctx.resume();
  }

  private context(
    graph: AudioGraph,
    channel: keyof SoundConfig['channels']
  ): PatchContext {
    return {
      graph,
      out: graph.channel(channel),
      config: this.options.config,
      random: this.random,
    };
  }

  /** Suspends audio after `ms` of quiet, so an idle page uses no CPU on it. */
  private scheduleSuspend(ms: number): void {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (!this.loops.size) this.suspend();
    }, ms);
  }
}
