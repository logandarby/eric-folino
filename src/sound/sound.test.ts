import { describe, expect, it, vi } from 'vitest';
import { UserPreferences } from '../core/preferences.ts';
import { soundConfig } from '../site/sound.config.ts';
import type { AudioGraph } from './audio-graph.ts';
import type { PatchRegistry } from './patches/index.ts';
import type { OneShotPatch } from './patches/patch.ts';
import { Throttle, VoicePool, type Voice } from './rate-limit.ts';
import { SoundEngine, type SoundPreferences } from './sound-engine.ts';

const config = soundConfig;

function fakeVoice(endsAt: number) {
  return { endsAt, stop: vi.fn<() => void>() } satisfies Voice;
}

/** An engine with a fake clock, fake audio and patches that record plays. */
function setup({ on = true, supported = true } = {}) {
  let time = 1000;
  const played: string[] = [];
  const ctx = {
    state: 'running' as AudioContextState,
    currentTime: 0,
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
  };
  const graph = {
    ctx,
    channel: () => ({}),
    setVolume: vi.fn<(v: number) => void>(),
  };
  const oneShot = (name: string): OneShotPatch => ({
    channel: 'ui',
    play: () => {
      played.push(name);
      return fakeVoice(ctx.currentTime + 0.1);
    },
  });
  const loopVoice = fakeVoice(Infinity);
  const patches: PatchRegistry = {
    oneShots: {
      hover: oneShot('hover'),
      press: oneShot('press'),
      open: oneShot('open'),
      close: oneShot('close'),
      blip: oneShot('blip'),
    },
    loops: { hum: { channel: 'ambient', start: () => loopVoice } },
  };
  const createGraph = vi.fn(() =>
    supported ? (graph as unknown as AudioGraph) : null
  );
  const preferences = new UserPreferences<SoundPreferences>(
    { sound: on, volume: 1 },
    { storage: null, events: null }
  );
  const engine = new SoundEngine({
    config,
    preferences,
    patches,
    createGraph,
    now: () => time,
  });
  return {
    engine,
    played,
    ctx,
    graph,
    preferences,
    loopVoice,
    createGraph,
    advance: (ms: number) => (time += ms),
  };
}

describe('Throttle', () => {
  it('drops repeats within the gap, per key', () => {
    let time = 0;
    const throttle = new Throttle(() => time);
    const el = {};
    expect(throttle.ready('a', 50)).toBe(true);
    throttle.mark('a');
    throttle.mark(el);
    time = 49;
    expect(throttle.ready('a', 50)).toBe(false);
    expect(throttle.ready('b', 50)).toBe(true);
    expect(throttle.ready(el, 50)).toBe(false);
    time = 50;
    expect(throttle.ready('a', 50)).toBe(true);
  });
});

describe('VoicePool', () => {
  it('cuts off the oldest voice past the cap, ignoring finished ones', () => {
    const pool = new VoicePool(2);
    const [a, b, c, d] = [1, 5, 5, 5].map(fakeVoice);
    pool.add(a, 0);
    pool.add(b, 0);
    pool.add(c, 0);
    expect(a.stop).toHaveBeenCalled();
    expect(pool.size).toBe(2);
    // At t=2 `a` has ended anyway, so only real voices count.
    pool.add(d, 2);
    expect(b.stop).toHaveBeenCalled();
    expect(c.stop).not.toHaveBeenCalled();
  });
});

describe('UserPreferences', () => {
  const memoryStorage = () => {
    const store = new Map<string, string>();
    return {
      store,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
  };

  it('uses the defaults until set, then remembers', () => {
    const storage = memoryStorage();
    const first = new UserPreferences<SoundPreferences>(
      { sound: true, volume: 1 },
      { storage, events: null }
    );
    expect(first.get('sound')).toBe(true);
    first.set('sound', false);
    first.set('volume', 0.25);
    const next = new UserPreferences<SoundPreferences>(
      { sound: true, volume: 1 },
      { storage, events: null }
    );
    expect(next.get('sound')).toBe(false);
    expect(next.get('volume')).toBe(0.25);
  });

  it('ignores stored values of the wrong type', () => {
    const storage = memoryStorage();
    storage.store.set('pref:sound', '"on"');
    storage.store.set('pref:volume', 'not json');
    const prefs = new UserPreferences<SoundPreferences>(
      { sound: true, volume: 1 },
      { storage, events: null }
    );
    expect(prefs.get('sound')).toBe(true);
    expect(prefs.get('volume')).toBe(1);
  });

  it('survives storage that throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const prefs = new UserPreferences<SoundPreferences>(
      { sound: true, volume: 1 },
      { storage, events: null }
    );
    prefs.set('sound', false);
    expect(prefs.get('sound')).toBe(false);
  });

  it('follows changes made in other tabs', () => {
    const storage = memoryStorage();
    const events = new EventTarget();
    const prefs = new UserPreferences<{ sound: boolean }>(
      { sound: true },
      { storage, events }
    );
    const changes: string[] = [];
    prefs.events.on('change', (key) => changes.push(key));
    storage.store.set('pref:sound', 'false');
    events.dispatchEvent(
      Object.assign(new Event('storage'), {
        key: 'pref:sound',
        storageArea: storage,
      })
    );
    expect(prefs.get('sound')).toBe(false);
    expect(changes).toEqual(['sound']);
  });
});

describe('SoundEngine', () => {
  it('is silent until unlocked by a gesture', () => {
    const { engine, played, createGraph } = setup();
    engine.play('hover');
    expect(played).toEqual([]);
    expect(createGraph).not.toHaveBeenCalled();
    engine.unlock();
    engine.play('hover');
    expect(played).toEqual(['hover']);
  });

  it('can make audio ahead of time, staying silent until unlocked', () => {
    const { engine, played, createGraph, ctx } = setup();
    engine.prepare();
    expect(createGraph).toHaveBeenCalledTimes(1);
    ctx.state = 'suspended';
    engine.play('hover');
    expect(played).toEqual([]);
    expect(ctx.resume).not.toHaveBeenCalled();
    engine.unlock();
    engine.play('hover');
    expect(createGraph).toHaveBeenCalledTimes(1);
    expect(ctx.resume).toHaveBeenCalled();
    expect(played).toEqual(['hover']);
  });

  it('never creates audio while sound is off', () => {
    const { engine, played, createGraph } = setup({ on: false });
    engine.unlock();
    engine.play('press');
    expect(createGraph).not.toHaveBeenCalled();
    expect(played).toEqual([]);
  });

  it('rate limits each sound, and hovers per element', () => {
    const { engine, played, advance } = setup();
    engine.unlock();
    const button = {};
    engine.play('blip');
    engine.play('blip');
    engine.play('press');
    advance(config.blip.minGapMs);
    engine.play('blip');
    engine.play('hover', { target: button });
    advance(config.hover.minGapMs);
    engine.play('hover', { target: button });
    engine.play('hover', { target: {} });
    expect(played).toEqual(['blip', 'press', 'blip', 'hover', 'hover']);
  });

  it('stops loops and goes quiet when muted', () => {
    const { engine, played, loopVoice } = setup();
    engine.unlock();
    const changes: boolean[] = [];
    engine.events.on('change', (on) => changes.push(on));
    engine.loop('hum');
    engine.setEnabled(false);
    expect(loopVoice.stop).toHaveBeenCalled();
    engine.play('open');
    expect(played).toEqual([]);
    expect(changes).toEqual([false]);
  });

  it('turning sound on unlocks audio right away', () => {
    const { engine, played } = setup({ on: false });
    engine.setEnabled(true);
    engine.play('press');
    expect(played).toEqual(['press']);
  });

  it('resumes suspended audio when something plays', () => {
    const { engine, ctx } = setup();
    engine.unlock();
    ctx.state = 'suspended';
    engine.play('close');
    expect(ctx.resume).toHaveBeenCalled();
  });

  it('follows sound being turned off in another tab', () => {
    const { engine, played, preferences } = setup();
    engine.unlock();
    preferences.set('sound', false);
    engine.play('press');
    expect(played).toEqual([]);
  });

  it('applies volume changes to the mix', () => {
    const { engine, graph } = setup();
    engine.unlock();
    engine.setVolume(1.5);
    expect(engine.volume).toBe(1);
    engine.setVolume(0.3);
    expect(graph.setVolume).toHaveBeenLastCalledWith(0.3);
  });

  it('reports browsers without Web Audio as unsupported', () => {
    const { engine } = setup({ supported: false });
    engine.unlock();
    expect(engine.supported).toBe(false);
  });
});
