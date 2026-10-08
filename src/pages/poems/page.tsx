import { stylesheet } from '../../../build/jsx/assets.ts';
import { VoidLayout } from '../../layouts/void.tsx';
import { PoemsNav } from './poems-nav.tsx';
import { graph, poemPath } from './graph.ts';

/**
 * The web of poems' welcome: what it is, and a way in. "Begin" goes to a
 * random poem, one not read yet if there are any (main.ts); without
 * scripts, to the first.
 */
export default function PoemsPage() {
  stylesheet(import.meta.url, './poems.css');
  return (
    <VoidLayout corner="bottom">
      <PoemsNav current="welcome" />
      <article class="poems">
        <h1>Web of Poems</h1>
        <p>
          Each poem links to others by what it means. Follow a word to the poem
          it leads to.
        </p>
        <p>Every poem you read unlocks on the web. Try to unlock them all.</p>
        <p class="poems-begin">
          <a
            class="button poems-button"
            href={poemPath(graph.poems[0].slug)}
            data-random-poem
          >
            begin
          </a>
          <a class="button poems-button" href="/">
            home
          </a>
        </p>
        <p>
          <a href="/poems/web/">The web</a>
        </p>
      </article>
    </VoidLayout>
  );
}
