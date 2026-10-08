/**
 * The way around the web of poems, at the top of the welcome page, each
 * poem and the web: home, the welcome page and the web. The page you're
 * on isn't a link.
 */
export function PoemsNav({
  current,
  class: cls,
}: {
  current?: 'welcome' | 'web';
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
      <a href="/">Home</a>
      {item('welcome', '/poems/', 'Welcome')}
      {item('web', '/poems/web/', 'Web')}
    </nav>
  );
}
