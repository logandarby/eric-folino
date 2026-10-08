import { stylesheet } from '../../build/jsx/assets.ts';
import type { Child } from '../../build/jsx/jsx-runtime.ts';
import { Background } from '../components/background/background.tsx';
import { HelpButton } from '../components/help-button/help-button.tsx';
import { Nav } from '../components/nav/nav.tsx';
import { Socials } from '../components/socials/socials.tsx';
import { SoundControl } from '../components/sound-control/sound-control.tsx';
import { Title } from '../components/title/title.tsx';
import { siteConfig } from '../site/site.config.ts';
import type { MobileSocials, PageConfig } from '../site/types.ts';
import { perLayout, placementVars } from './placement.ts';

interface StageProps {
  page: PageConfig;
  /**
   * Show the social links above the title, and say where they go on
   * mobile. Left out, there are none.
   */
  socials?: MobileSocials;
  /** Placed on the stage, like the blobs. */
  children?: Child;
  /** In the scene but off the stage, like the screen hotspot. */
  scene?: Child;
}

/**
 * The bus stop scene: the photo, and a "stage" box over it holding the
 * title, the nav and anything the page places there. Used by the home
 * page and by placeholder pages.
 */
export function StageLayout({
  page,
  socials,
  children,
  scene,
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
              class={[
                'stage__socials placed',
                socials === 'corner' && 'stage__socials--wide-only',
              ]
                .filter(Boolean)
                .join(' ')}
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
        <HelpButton />
        {socials === 'corner' && <Socials class="socials-corner" />}
      </div>
      <SoundControl />
    </>
  );
}
