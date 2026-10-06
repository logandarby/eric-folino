export type Cleanup = () => void;

/** Collects cleanup callbacks and runs them (newest first) on dispose. */
export class Disposer {
  private cleanups: Cleanup[] = [];

  add(cleanup: Cleanup): void {
    this.cleanups.push(cleanup);
  }

  listen<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    handler: (e: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): void;
  listen<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    handler: (e: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): void;
  listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): void;
  listen(
    target: EventTarget,
    type: string,
    handler: (e: Event) => void,
    options?: AddEventListenerOptions
  ): void {
    target.addEventListener(type, handler, options);
    this.add(() => target.removeEventListener(type, handler, options));
  }

  dispose(): void {
    const cleanups = this.cleanups;
    this.cleanups = [];
    for (let i = cleanups.length - 1; i >= 0; i--) cleanups[i]();
  }
}
