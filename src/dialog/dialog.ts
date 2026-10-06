import { h } from '../core/component.ts';
import type { DialogContent } from '../site/types.ts';
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
 * The dialog window's DOM: a title bar with an optional close button and a
 * body of typed text blocks. Positioning and animation are handled by
 * DialogManager; this class only builds and exposes the parts.
 */
export class DialogView {
  readonly el: HTMLElement;
  readonly closeButton: HTMLButtonElement | null;
  readonly typewriter: Typewriter;
  private readonly text: TextEngine;

  constructor(content: DialogContent, options: DialogViewOptions) {
    this.text = new TextEngine(options.text);
    const titleText = this.text.render(content.title);
    const bodyTexts = content.body.map((block) => this.text.render(block.text));

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

    this.el = h(
      'section',
      {
        class: 'dialog',
        role: options.modal ? 'dialog' : 'region',
        'aria-labelledby': titleId,
        tabindex: '-1',
        ...(options.modal ? { 'aria-modal': 'true' } : {}),
      },
      [header, body]
    );

    this.typewriter = this.text.typewriter([titleText, ...bodyTexts]);
  }

  /** Stops typing and any scripted text effects. */
  dispose(): void {
    this.typewriter.cancel();
    this.text.dispose();
  }
}
