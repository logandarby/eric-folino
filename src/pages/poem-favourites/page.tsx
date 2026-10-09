import { stylesheet } from '../../../build/jsx/assets.ts';
import { Loading } from '../../components/loading/loading.tsx';
import { VoidLayout } from '../../layouts/void.tsx';
import { PoemsNav } from '../poems/poems-nav.tsx';

/**
 * The poems you starred, each with its first line, filled in by main.ts
 * from localStorage. Until there are any, it says how to add them.
 */
export default function PoemFavouritesPage() {
  stylesheet(import.meta.url, '../poems/poems.css');
  return (
    <VoidLayout corner="bottom">
      <PoemsNav current="favourites" />
      <article class="poems">
        <h1>Favourites</h1>
        <Loading class="poems-loading" />
        <p data-favourites-empty hidden>
          Nothing here yet. Star a poem by its title to keep it here.
        </p>
        <noscript>
          <p>Favourites are kept by JavaScript, which is off.</p>
        </noscript>
        <ul class="poems-favourites" data-favourites hidden></ul>
      </article>
    </VoidLayout>
  );
}
