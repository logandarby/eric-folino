import { stylesheet } from '../../../build/jsx/assets.ts';
import { graph, poemPath } from './graph.ts';

/** Every poem, by title. */
export default function PoemsPage() {
  stylesheet(import.meta.url, './poems.css');
  return (
    <main>
      <h1>Poems</h1>
      <ul>
        {graph.poems.map((poem) => (
          <li>
            <a href={poemPath(poem.slug)}>{poem.lines[0]}</a>
          </li>
        ))}
      </ul>
      <p>
        <a href="/poems/graph/">How they link</a>
      </p>
    </main>
  );
}
