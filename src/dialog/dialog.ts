import { h } from '../core/component.ts';
import type { DialogAction, DialogContent } from '../site/types.ts';
import { blockText } from './block-text.ts';
import { TextEngine, type TextEngineOptions } from '../text/text-engine.ts';
import type { Typewriter } from '../text/typewriter.ts';

export interface DialogViewOptions {
  /** Shows a close button. */
  closable: boolean;
  /** Announces as a modal dialog (page content is made inert while open). */
  modal: boolean;
  text: TextEngineOptions;
}

let nextId = 0;

/**
 * The dialog window's DOM: a title bar with an optional close button, a
 * body of typed text blocks and optional action buttons along the bottom.
 * Positioning and animation are handled by DialogManager; this class only
 * builds and exposes the parts.
 */
export class DialogView {
  readonly el: HTMLElement;
  readonly closeButton: HTMLButtonElement | null;
  /** The action buttons that close the dialog (the ones without a link). */
  readonly closingActions: HTMLButtonElement[] = [];
  readonly typewriter: Typewriter;
  private readonly text: TextEngine;

  constructor(content: DialogContent, options: DialogViewOptions) {
    this.text = new TextEngine(options.text);
    const titleText = this.text.render(content.title);
    const bodyTexts = content.body.map((block) =>
      this.text.render(blockText(block))
    );

    const titleId = `dialog-title-${++nextId}`;
    const title = h('h2', { class: 'dialog__title', id: titleId }, [
      titleText.fragment,
    ]);

    this.closeButton = options.closable
      ? h(
          'button',
          { class: 'dialog__close', type: 'button', 'aria-label': 'Close' },
          ['X']
        )
      : null;

    const body = h(
      'div',
      { class: 'dialog__body' },
      content.body.map((block, i) =>
        h('p', { class: `dialog__block dialog__block--${block.kind}` }, [
          bodyTexts[i].fragment,
        ])
      )
    );

    const header = h('header', { class: 'dialog__header' }, [title]);
    if (this.closeButton) header.append(this.closeButton);

    const parts: HTMLElement[] = [header, body];
    if (content.actions?.length) {
      const actions = content.actions.map((action) => this.action(action));
      parts.push(h('footer', { class: 'dialog__actions' }, actions));
    }

    this.el = h(
      'section',
      {
        class: 'dialog',
        role: options.modal ? 'dialog' : 'region',
        'aria-labelledby': titleId,
        tabindex: '-1',
        ...(options.modal ? { 'aria-modal': 'true' } : {}),
      },
      parts
    );

    this.typewriter = this.text.typewriter([titleText, ...bodyTexts]);
    // The actions keep their space while hidden, so the window doesn't
    // grow when they appear.
    this.typewriter.events.on('done', () => {
      this.el.classList.add('is-typed');
      // Focus waiting on the close button moves to the first action.
      const first = this.firstAction;
      const active = document.activeElement;
      if (first && (active === this.el || active === this.closeButton)) {
        first.focus({ preventScroll: true });
      }
    });
  }

  get firstAction(): HTMLElement | null {
    return this.el.querySelector<HTMLElement>('.dialog__action');
  }

  private action({ label, href }: DialogAction): HTMLElement {
    if (href !== undefined) {
      return h('a', { class: 'button dialog__action', href }, [label]);
    }
    const button = h(
      'button',
      { class: 'button dialog__action', type: 'button' },
      [label]
    );
    this.closingActions.push(button);
    return button;
  }

  /** Stops typing and any scripted text effects. */
  dispose(): void {
    this.typewriter.cancel();
    this.text.dispose();
  }
}
