import { describe, expect, it } from 'vitest';
import { raw, render } from './jsx-runtime.ts';

const Greeting = ({ name }: { name: string }) => (
  <p class="hi">Hello, {name}</p>
);

describe('JSX runtime', () => {
  it('escapes text and attributes', () => {
    const html = <a title={'"<b>"'}>{'<script>&'}</a>;
    expect(html.value).toBe(
      '<a title="&quot;&lt;b&gt;&quot;">&lt;script&gt;&amp;</a>'
    );
  });

  it('leaves raw markup alone', () => {
    expect(render(<div>{raw('<b>bold</b>')}</div>).value).toBe(
      '<div><b>bold</b></div>'
    );
  });

  it('handles boolean, missing and style attributes', () => {
    const html = (
      <input
        disabled
        hidden={false}
        value={undefined}
        style={{ '--x': '1%', color: 'red' }}
      />
    );
    expect(html.value).toBe('<input disabled style="--x:1%;color:red">');
  });

  it('renders components, fragments, arrays and skips empty children', () => {
    const html = (
      <>
        <Greeting name="you & me" />
        {[1, 2].map((n) => (
          <i>{n}</i>
        ))}
        {false}
        {null}
      </>
    );
    expect(html.value).toBe(
      '<p class="hi">Hello, you &amp; me</p><i>1</i><i>2</i>'
    );
  });
});
