import { Emitter } from './emitter.ts';

/** What a preference can hold: anything that survives JSON as itself. */
type PreferenceValue = boolean | number | string;

export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface UserPreferencesOptions {
  /** Where to save; defaults to localStorage, or memory only if that's unavailable. */
  storage?: PreferenceStorage | null;
  /** Where `storage` events arrive from (other tabs); defaults to window. */
  events?: EventTarget | null;
  /** Prepended to each key in storage. */
  prefix?: string;
}

/**
 * The visitor's settings, typed by their defaults and saved in
 * localStorage, so they last across pages and visits:
 *
 *   const prefs = new UserPreferences({ sound: true, volume: 1 });
 *   prefs.set('volume', 0.5);
 *   prefs.events.on('change', (key) => …);
 *
 * - Values are stored as JSON under `pref:<key>`. A stored value of the
 *   wrong type (an old format, tampering) is ignored in favour of the default.
 * - Storage can be missing or throw (private windows, blocked site data);
 *   then settings just last for this page view.
 * - Changes made in other tabs arrive through the `storage` event and are
 *   announced with `change` like local ones.
 */
export class UserPreferences<T extends Record<string, PreferenceValue>> {
  readonly events = new Emitter<{ change: keyof T & string }>();
  private readonly values: T;
  private readonly storage: PreferenceStorage | null;
  private readonly prefix: string;

  constructor(
    private readonly defaults: T,
    options: UserPreferencesOptions = {}
  ) {
    this.storage =
      options.storage === undefined ? safeLocalStorage() : options.storage;
    this.prefix = options.prefix ?? 'pref:';
    this.values = { ...defaults };
    for (const key of this.keys()) {
      const stored = this.read(key);
      if (stored !== undefined) this.values[key] = stored;
    }

    const events =
      options.events === undefined
        ? typeof window === 'undefined'
          ? null
          : window
        : options.events;
    events?.addEventListener('storage', (e) =>
      this.onStorage(e as StorageEvent)
    );
  }

  get<K extends keyof T & string>(key: K): T[K] {
    return this.values[key];
  }

  set<K extends keyof T & string>(key: K, value: T[K]): void {
    if (Object.is(this.values[key], value)) return;
    this.values[key] = value;
    try {
      this.storage?.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      // Not saved; it still lasts for this page view.
    }
    this.events.emit('change', key);
  }

  private keys(): (keyof T & string)[] {
    return Object.keys(this.defaults);
  }

  /** The stored value for `key`, if there is a valid one. */
  private read<K extends keyof T & string>(key: K): T[K] | undefined {
    try {
      const raw = this.storage?.getItem(this.prefix + key);
      if (raw === null || raw === undefined) return undefined;
      const value: unknown = JSON.parse(raw);
      const expected = typeof this.defaults[key];
      const valid =
        typeof value === expected &&
        (typeof value !== 'number' || Number.isFinite(value));
      return valid ? (value as T[K]) : undefined;
    } catch {
      return undefined;
    }
  }

  /** Another tab changed a setting. */
  private onStorage(e: StorageEvent): void {
    if (e.storageArea !== this.storage) return;
    const key = this.keys().find((k) => this.prefix + k === e.key);
    if (!key) return;
    const value = this.read(key) ?? this.defaults[key];
    if (Object.is(value, this.values[key])) return;
    this.values[key] = value;
    this.events.emit('change', key);
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
