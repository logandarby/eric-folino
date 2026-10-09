import type { Cleanup } from '../../core/disposer.ts';

/** How long "Copied" shows before the button is ready again. */
const DONE_MS = 2000;

/** What the button says, and what's announced, after a try. */
const OUTCOMES = {
  done: { label: 'Copied!', status: 'Copied' },
  failed: { label: "Couldn't copy", status: "Couldn't copy" },
};

/** Island: makes copy-button.tsx copy its target, and say so. */
export function mount(el: HTMLElement): Cleanup | undefined {
  const button = el.querySelector('button');
  const label = el.querySelector('.copy-button__label');
  const status = el.querySelector('[role="status"]');
  const target = document.getElementById(el.dataset.target ?? '');
  if (!button || !label || !status || !target || !navigator.clipboard) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const show = (outcome: keyof typeof OUTCOMES | null) => {
    clearTimeout(timer);
    button.dataset.state = outcome ?? '';
    label.textContent = outcome ? OUTCOMES[outcome].label : 'Copy';
    status.textContent = outcome ? OUTCOMES[outcome].status : '';
    if (outcome) timer = setTimeout(() => show(null), DONE_MS);
  };

  const copy = async () => {
    try {
      await write(target);
      show('done');
    } catch {
      show('failed');
    }
  };
  const onClick = () => void copy();

  button.hidden = false;
  button.addEventListener('click', onClick);
  return () => {
    clearTimeout(timer);
    button.removeEventListener('click', onClick);
  };
}

/** Puts `el`'s text on the clipboard, formatted where the browser allows. */
async function write(el: HTMLElement): Promise<void> {
  // innerText keeps the breaks between paragraphs.
  const text = el.innerText.trim();
  if (typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([el.innerHTML], { type: 'text/html' }),
        }),
      ]);
      return;
    } catch {
      // Some browsers take only plain text.
    }
  }
  await navigator.clipboard.writeText(text);
}
