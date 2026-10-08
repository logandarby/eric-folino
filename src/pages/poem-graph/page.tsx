import { stylesheet } from '../../../build/jsx/assets.ts';
import { VoidLayout } from '../../layouts/void.tsx';
import { PoemsNav } from '../poems/poems-nav.tsx';

/**
 * The poems as a graph, drawn by main.ts: a circle for each poem, pulled
 * together by its links. Poems not yet read are locked. Click a star for
 * its title and a button to read it; drag to move around.
 */
export default function PoemGraphPage() {
  stylesheet(import.meta.url, '../poems/poems.css');
  stylesheet(import.meta.url, './graph.css');
  return (
    <VoidLayout corner="bottom">
      <PoemsNav current="web" class="poem-graph-back" />
      <div
        class="poem-graph"
        data-poem-graph
        role="img"
        aria-label="The poems and the links between them"
      >
        <noscript>The graph needs JavaScript.</noscript>
      </div>
    </VoidLayout>
  );
}
