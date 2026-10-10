import page from './page.config.ts';

/** The essay, unstyled: a title and its paragraphs. */
export default function SelfReferencePage() {
  return (
    <>
      <h1>{page.title}</h1>
      {page.paragraphs.map((text) => (
        <p>{text}</p>
      ))}
    </>
  );
}
