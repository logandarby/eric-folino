import { stylesheet } from '../../../build/jsx/assets.ts';
import { Loading } from '../../components/loading/loading.tsx';
import { VoidLayout } from '../../layouts/void.tsx';
import { PoemsNav } from '../poems/poems-nav.tsx';

/**
 * The poems as a graph, drawn by main.ts: a star for each poem, pulled
 * together by its links. Poems not yet read are locked. Point at a star
 * (or tab to it) for its title and its neighbours'; click it to read it,
 * or on touch tap it for a dialog with a button to. Drag to move around.
 */
export default function PoemGraphPage() {
  stylesheet(import.meta.url, '../poems/poems.css');
  stylesheet(import.meta.url, './graph.css');
  return (
    <VoidLayout corner="bottom">
      <PoemsNav current="web" class="poem-graph-back" />
      <div class="poem-graph" data-poem-graph>
        <Loading class="poem-graph-loading" />
        <noscript>The graph needs JavaScript.</noscript>
      </div>
    </VoidLayout>
  );
}
