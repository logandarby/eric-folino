import { pageScript } from '../../app/router.ts';
import { bindBlobs } from '../../components/blob/blobs.ts';
import { bindSpeechBubble } from '../../components/speech-bubble/speech-bubble.ts';
import { bindListen } from '../../components/listen/listen.ts';
import { Disposer } from '../../core/disposer.ts';
import songUrl from '../../assets/audio/standby.mp3';
import page from './page.config.ts';

pageScript(import.meta.url, ({ dialogs, sound }) => {
  const disposer = new Disposer();
  disposer.add(bindBlobs(dialogs, page.blobs));

  disposer.add(bindSpeechBubble('listen-cta'));

  const listen = document.querySelector<HTMLElement>('[data-listen]');
  if (listen) {
    disposer.add(bindListen(listen, sound, page.listen, songUrl));
  }
  return () => disposer.dispose();
});
