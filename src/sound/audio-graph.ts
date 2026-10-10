import type { SoundConfig } from '../site/types.ts';

export type Channel = 'ui' | 'voice' | 'ambient';

/**
 * White noise is hissy (equal energy at every pitch); pink falls off
 * gently, and brown much more, for softer, breathier, rumblier noise.
 */
export type NoiseColour = 'white' | 'pink' | 'brown';

/** Safari 16.4+: how the page's audio behaves alongside other apps. */
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * Owns the page's one AudioContext and its mixer:
 *
 *   sound → channel volume (ui / voice / ambient) → master → limiter → out
 *
 * The limiter (a gentle compressor) keeps stacked sounds from ever getting
 * harsh. Also holds a shared second of each noise colour for the patches,
 * and the recorded sounds pages play, decoded.
 */
export class AudioGraph {
  private readonly channels: Record<Channel, GainNode>;
  private readonly master: GainNode;
  private readonly noiseBuffers = new Map<NoiseColour, AudioBuffer>();
  private readonly samples = new Map<string, Promise<AudioBuffer>>();

  /**
   * Null if the browser has no Web Audio.
   * @param volume the visitor's volume setting, 0–1.
   */
  static create(config: SoundConfig, volume: number): AudioGraph | null {
    if (typeof AudioContext === 'undefined') return null;
    // On iPhones, mix with the visitor's music or podcast instead of
    // pausing it, and stay quiet when the ringer is on silent.
    const { audioSession } = navigator as AudioSessionNavigator;
    if (audioSession) audioSession.type = 'ambient';
    try {
      return new AudioGraph(new AudioContext(), config, volume);
    } catch {
      return null;
    }
  }

  private constructor(
    readonly ctx: AudioContext,
    private readonly config: SoundConfig,
    volume: number
  ) {
    const limiter = new DynamicsCompressorNode(ctx, {
      threshold: -18,
      knee: 12,
      ratio: 6,
      attack: 0.003,
      release: 0.15,
    });
    limiter.connect(ctx.destination);
    const master = new GainNode(ctx, { gain: config.volume * volume });
    master.connect(limiter);
    this.master = master;

    const channel = (volume: number) => {
      const gain = new GainNode(ctx, { gain: volume });
      gain.connect(master);
      return gain;
    };
    this.channels = {
      ui: channel(config.channels.ui),
      voice: channel(config.channels.voice),
      ambient: channel(config.channels.ambient),
    };
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  /** Sets the visitor's volume (0–1), smoothly so it doesn't click. */
  setVolume(volume: number): void {
    this.master.gain.setTargetAtTime(
      this.config.volume * volume,
      this.ctx.currentTime,
      0.02
    );
  }

  channel(name: Channel): AudioNode {
    return this.channels[name];
  }

  /**
   * A recorded sound, decoded once from `bytes` (its file). Null if it
   * couldn't be fetched or decoded.
   */
  sample(
    url: string,
    bytes: () => Promise<ArrayBuffer>
  ): Promise<AudioBuffer | null> {
    let buffer = this.samples.get(url);
    if (!buffer) {
      buffer = bytes().then((data) => this.ctx.decodeAudioData(data));
      this.samples.set(url, buffer);
    }
    return buffer.catch(() => {
      // Try again next time.
      this.samples.delete(url);
      return null;
    });
  }

  /** One second of noise, made on first use. */
  noise(colour: NoiseColour = 'white'): AudioBuffer {
    let buffer = this.noiseBuffers.get(colour);
    if (!buffer) {
      const { sampleRate } = this.ctx;
      buffer = new AudioBuffer({ length: sampleRate, sampleRate });
      fillNoise(buffer.getChannelData(0), colour);
      this.noiseBuffers.set(colour, buffer);
    }
    return buffer;
  }
}

/** Fills `data` with noise of a colour, peaking at ±1. */
function fillNoise(data: Float32Array, colour: NoiseColour): void {
  // Pink: Paul Kellet's economy filter. Brown: leaky integrated white.
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    let value = white;
    if (colour === 'pink') {
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      value = b0 + b1 + b2 + white * 0.1848;
    } else if (colour === 'brown') {
      b0 = (b0 + 0.02 * white) / 1.02;
      value = b0;
    }
    data[i] = value;
    peak = Math.max(peak, Math.abs(value));
  }
  if (peak > 0) for (let i = 0; i < data.length; i++) data[i] /= peak;
}
