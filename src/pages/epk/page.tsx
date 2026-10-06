import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { stylesheet } from '../../../build/jsx/assets.ts';
import type { Child } from '../../../build/jsx/jsx-runtime.ts';
import { readMarkdown, readMarkdownDir } from '../../../build/markdown.ts';
import {
  listPhotos,
  PressGallery,
} from '../../components/press-gallery/press-gallery.tsx';
import { Icon } from '../../components/icon/icon.tsx';
import { Socials } from '../../components/socials/socials.tsx';
import { VideoEmbed } from '../../components/video-embed/video-embed.tsx';
import { DocumentLayout } from '../../layouts/document.tsx';
import page from './page.config.ts';

const CONTENT = new URL('./content/', import.meta.url);
const PRESS_PHOTOS = new URL('press/', CONTENT);

/** The EPK. Sections without content yet are left out. */
export default function AboutPage() {
  stylesheet(import.meta.url, './about.css');
  const bio = readMarkdown(new URL('bio.md', CONTENT));
  const interviews = readMarkdownDir(new URL('interviews/', CONTENT), [
    'title',
    'outlet',
    'date',
  ]).sort((a, b) => b.data.date.localeCompare(a.data.date));

  // In page order. Sections with nothing to show yet are left out, and the
  // table of contents at the top is made from the same list.
  const sections: { id: string; heading: string; content: Child }[] = [
    { id: 'bio', heading: 'Bio', content: <div class="prose">{bio.html}</div> },
    page.video && {
      id: 'video',
      heading: 'Latest video',
      content: <VideoEmbed {...page.video} />,
    },
    {
      id: 'listen',
      heading: 'Listen & follow',
      content: <Socials labelled class="about__socials" />,
    },
    listPhotos(PRESS_PHOTOS).length > 0 && {
      id: 'photos',
      heading: 'Press photos',
      content: (
        <>
          <p class="about__note">
            Full-size photos for press and promotion. Please credit the
            photographer where one is listed.
          </p>
          <PressGallery
            dir={PRESS_PHOTOS}
            details={page.photoDetails}
            url="/press"
            zipName="eric-folino-press-photos.zip"
            altPrefix="Eric Folino press photo"
          />
        </>
      ),
    },
    interviews.length > 0 && {
      id: 'interviews',
      heading: 'Interviews',
      content: interviews.map(({ slug, data, html }) => (
        <article class="interview" aria-labelledby={`interview-${slug}`}>
          <header class="interview__header">
            <h3 id={`interview-${slug}`} class="interview__title">
              {data.url ? <a href={data.url}>{data.title}</a> : data.title}
            </h3>
            <p class="interview__meta">
              {data.outlet} ·{' '}
              <time datetime={data.date}>{formatDate(data.date)}</time>
            </p>
          </header>
          <div class="prose">{html}</div>
        </article>
      )),
    },
  ].filter((section) => section !== false && section !== null);

  return (
    <DocumentLayout page={page}>
      {/* Up top, where press and bookers will see it first. */}
      {page.contacts.length > 0 && (
        <aside class="about__contacts" aria-label="Contact">
          {page.contacts.map(({ label, email }) => (
            <a class="about__contact" href={`mailto:${email}`}>
              <Icon icon={faEnvelope} class="about__contact-icon" />
              <span class="about__contact-label">{label}</span>
              <span class="about__contact-email">{email}</span>
            </a>
          ))}
        </aside>
      )}

      <nav class="about__toc" aria-label="On this page">
        <ul>
          {sections.map(({ id, heading }) => (
            <li>
              <a href={`#${id}`}>{heading}</a>
            </li>
          ))}
        </ul>
      </nav>

      {sections.map(({ id, heading, content }) => (
        <Section id={id} heading={heading}>
          {content}
        </Section>
      ))}
    </DocumentLayout>
  );
}

function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children?: Child;
}) {
  return (
    <section class="section" aria-labelledby={id}>
      <h2 id={id} class="section__heading">
        {heading}
      </h2>
      {children}
    </section>
  );
}

/** "2026-03-14" → "14 March 2026". */
function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
