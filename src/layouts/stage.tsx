import { stylesheet } from '../../build/jsx/assets.ts';
import type { Child } from '../../build/jsx/jsx-runtime.ts';
import { Background } from '../components/background/background.tsx';
import { Nav } from '../components/nav/nav.tsx';
import { Socials } from '../components/socials/socials.tsx';
import { SoundControl } from '../components/sound-control/sound-control.tsx';
import { Title } from '../components/title/title.tsx';
import { siteConfig } from '../site/site.config.ts';
import type { PageConfig } from '../site/types.ts';
import { perLayout, placementVars } from './placement.ts';

interface StageProps {
  page: PageConfig;
  /** Show the social links above the title. */
  socials?: boolean;
  /** Placed on the stage, like the blobs. */
  children?: Child;
  /** In the scene but off the stage, like the screen hotspot and the "?". */
  scene?: Child;
  /** Whether there's a "?" for the sound control to sit beside. */
  help?: boolean;
}

/**
 * The bus stop scene: the photo, and a "stage" box over it holding the
 * title, the nav and anything the page places there. Used by the home
 * page and by placeholder pages.
 */
export function StageLayout({
  page,
  socials = false,
  children,
  scene,
  help = false,
}: StageProps) {
  stylesheet(import.meta.url, './stage.css');
  const { stage } = siteConfig;
  const stageVars = perLayout((l) => ({
    'stage-w': stage[l].width,
    'stage-ar': stage[l].aspectRatio,
  }));
  return (
    <>
      <Background />
      <div class="scene" data-scene data-page-root>
        <div class="stage" style={stageVars}>
          <Title class="placed" style={placementVars((l) => stage[l].title)} />
          {socials && (
            <Socials
              class="stage__socials placed"
              style={placementVars((l) => stage[l].socials)}
            />
          )}
          <Nav
            page={page}
            class="placed"
            style={placementVars((l) => stage[l].nav)}
          />
          {children}
        </div>
        {scene}
      </div>
      <SoundControl afterHelp={help} />
    </>
  );
}
