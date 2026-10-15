import { stylesheet } from '../../../build/jsx/assets.ts';
import { raw, type Html } from '../../../build/jsx/jsx-runtime.ts';
import { readMarkdown } from '../../../build/markdown.ts';
import { BackLink } from '../../components/back-link/back-link.tsx';
import { CopyButton } from '../../components/copy-button/copy-button.tsx';
import { VoidLayout } from '../../layouts/void.tsx';
import page, { type Reply } from './page.config.ts';

/**
 * Back at the top, then the essay (essay.md, title and all) on a light
 * sheet down the middle of the screen. Its links between sections are
 * the essay's own anchors, and a line marked `<!-- copy -->` in it gets
 * a button that copies it (withCopyButtons). Under it, the comments, which are a joke: the
 * box to write one is disabled and taped over, and the comments are the
 * page config's.
 */
export default function SelfReferencePage() {
  stylesheet(import.meta.url, './self-reference.css');
  const essay = withCopyButtons(
    readMarkdown(new URL('essay.md', import.meta.url)).html
  );
  const { comments } = page;
  const count = comments.list.reduce(
    (n, comment) => n + 1 + (comment.replies?.length ?? 0),
    0
  );
  return (
    <VoidLayout>
      <div class="self-reference">
        <BackLink class="self-reference__back" href="/mysteries/" />
        <article class="self-reference__sheet self-reference__essay">
          {essay}
        </article>
        <section
          class="self-reference__sheet comments"
          aria-labelledby="comments-title"
        >
          <h2 id="comments-title">Comments ({String(count)})</h2>
          <div class="comments__box">
            <form class="comments__form" aria-describedby="comments-closed">
              <label class="sr-only" for="comments-text">
                Your comment
              </label>
              <textarea
                id="comments-text"
                rows={4}
                placeholder={comments.placeholder}
                disabled
              ></textarea>
              <button type="submit" data-sound="none" disabled>
                Post
              </button>
            </form>
            <p class="sr-only" id="comments-closed">
              Commenting is closed.
            </p>
            {/* Across the box, one strip each way. */}
            <div class="comments__tape" aria-hidden="true">
              {comments.tape.map((words) => (
                <div class="comments__strip">
                  <span>{Array(6).fill(words).join(' ▲ ')}</span>
                </div>
              ))}
            </div>
          </div>
          <ol class="comments__list">
            {comments.list.map((comment) => (
              <li>
                <CommentView {...comment} />
                {comment.replies?.length ? (
                  <ol class="comments__replies">
                    {comment.replies.map((reply) => (
                      <li>
                        <CommentView {...reply} />
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </VoidLayout>
  );
}

/** One comment or reply: who, when, and what they said. */
function CommentView({ author, date, text }: Reply) {
  return (
    <article class="comments__comment">
      <p class="comments__byline">
        <span class="comments__author">{author}</span>
        <span class="comments__date">{date}</span>
      </p>
      <p class="comments__text">{text}</p>
    </article>
  );
}

/**
 * Gives each paragraph of the essay ending in `<!-- copy -->` a button
 * that copies its text (the comment says where, as Markdown can't hold
 * the button itself).
 */
function withCopyButtons(essay: Html): Html {
  let n = 0;
  return raw(
    essay.value.replace(
      /<p>([^<]*?)\s*<!-- copy --><\/p>/g,
      (_, text: string) => {
        const id = `copy-me-${String(++n)}`;
        const button = CopyButton({ target: id, label: 'this question' });
        return `<p><span id="${id}">${text}</span> ${button.value}</p>`;
      }
    )
  );
}
