import { stylesheet } from '../../../build/jsx/assets.ts';
import { BackLink } from '../../components/back-link/back-link.tsx';
import { VoidLayout } from '../../layouts/void.tsx';
import { pages } from '../pages.ts';
import page from './page.config.ts';

/** Paths of the bare pages (see PageConfig.bare). */
const barePaths = new Set(pages.filter((p) => p.bare).map((p) => p.path));

/** The title, a line, and the links in a list, in Cordata. */
export default function MysteriesPage() {
  stylesheet(import.meta.url, './mysteries.css');
  return (
    <VoidLayout>
      <div class="mysteries">
        <BackLink href="/secret/" irisWipe />
        <div class="mysteries__body">
          <h1 class="mysteries__title">{page.title}</h1>
          <p>{page.text}</p>
          <ul class="mysteries__list">
            {page.mysteries.map(({ label, href }) => {
              const away = /^https?:/.test(href);
              return (
                <li>
                  {away ? (
                    <a
                      class="mysteries__link"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {label}
                      <span class="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    // A bare page isn't one the router can swap in, so
                    // the browser loads it.
                    <a
                      class="mysteries__link"
                      href={href}
                      data-no-swup={barePaths.has(href)}
                    >
                      {label}
                    </a>
                  )}
                  <span class="mysteries__where">
                    {away ? new URL(href).hostname : 'here'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </VoidLayout>
  );
}
