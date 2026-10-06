import type { Island } from '../../../core/islands.ts';

/**
 * An artwork on the secret page. Each lives in its own folder here and is
 * an island: it exports `mount(el)`, returning a cleanup, and its code
 * loads only when it's about to be seen. Shader pieces use ShaderCanvas
 * (src/gl/), which handles reduced motion, pausing and flashing checks.
 */
export type Piece = Island;
