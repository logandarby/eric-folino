import { $, Component } from '../../core/component.ts';
import type { SoundEngine } from '../../sound/sound-engine.ts';

/** Toggles sound from anywhere on the page. */
const SHORTCUT_KEY = 'm';

/**
 * The speaker button, plus the M shortcut.
 *
 * - The button's icons are both in the markup; CSS shows the one matching
 *   `aria-pressed`.
 * - The shortcut is announced through a status region, since focus (and
 *   so the button's pressed state) is usually somewhere else.
 */
export class SoundControl extends Component {
  private readonly button: HTMLButtonElement;
  private readonly status: HTMLElement;

  constructor(el: HTMLElement, sound: SoundEngine) {
    super(el);
    this.button = $<HTMLButtonElement>('[data-sound-toggle]', el);
    this.status = $('[data-sound-status]', el);

    this.showEnabled(sound.enabled);
    this.disposer.add(sound.events.on('change', (on) => this.showEnabled(on)));

    const toggle = () => {
      sound.setEnabled(!sound.enabled);
      if (!sound.supported) {
        el.hidden = true;
        return;
      }
      // Turning sound on is the first chance to hear the button itself.
      if (sound.enabled) sound.play('press');
    };
    this.disposer.listen(this.button, 'click', toggle);

    this.disposer.listen(document, 'keydown', (e) => {
      if (
        e.key.toLowerCase() !== SHORTCUT_KEY ||
        e.repeat ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        isEditable(e.target)
      ) {
        return;
      }
      toggle();
      this.status.textContent = sound.enabled ? 'Sound on' : 'Sound off';
    });
  }

  private showEnabled(on: boolean): void {
    this.button.setAttribute('aria-pressed', String(on));
  }
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) {
    return true;
  }
  return (
    target instanceof HTMLInputElement &&
    !['range', 'checkbox', 'radio', 'button'].includes(target.type)
  );
}
