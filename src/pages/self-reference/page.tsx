import { stylesheet } from '../../../build/jsx/assets.ts';
import page from './page.config.ts';

/** The essay, near enough unstyled: a title and its paragraphs, in Libron. */
export default function SelfReferencePage() {
  stylesheet(import.meta.url, '../../styles/fonts.css');
  stylesheet(import.meta.url, './self-reference.css');
  return (
    <>
      <h1>{page.title}</h1>
      {page.paragraphs.map((text) => (
        <p>{text}</p>
      ))}
    </>
  );
}
