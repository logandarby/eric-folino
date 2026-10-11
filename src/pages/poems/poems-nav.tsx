/**
 * The way around the web of poems, at the top of each of its pages: back
 * to the secret page (whose fridge leads here),
 * the welcome page, the web and the poems you starred. The page you're on
 * isn't a link.
 */
export function PoemsNav({
  current,
  class: cls,
}: {
  current?: 'welcome' | 'web' | 'favourites';
  class?: string;
}) {
  const item = (page: typeof current, href: string, label: string) =>
    current === page ? (
      <span aria-current="page">{label}</span>
    ) : (
      <a href={href}>{label}</a>
    );
  return (
    <nav class={['poems-back', cls].filter(Boolean).join(' ')}>
      <a href="/secret/" data-iris-wipe>
        Back to secrets
      </a>
      {item('welcome', '/poems/', 'Welcome')}
      {item('web', '/poems/web/', 'The Web')}
      {item('favourites', '/poems/favourites/', 'Favourites')}
    </nav>
  );
}
