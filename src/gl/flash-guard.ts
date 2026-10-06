/** Brightness swing (0–1) that counts as a flash. */
const SWING = 0.2;
/** WCAG 2.3.1: no more than three flashes in any one second. */
const MAX_FLASHES_PER_SECOND = 3;

/**
 * Dev-only check that a shader doesn't flash: samples the brightness of a
 * patch of the picture each frame and warns when it swings up and down more
 * than three times a second, which can trigger seizures (WCAG 2.3.1). It's
 * a smoke alarm rather than a proof: it only watches the centre.
 */
export class FlashGuard {
  private readonly pixels = new Uint8Array(8 * 8 * 4);
  private last: number | null = null;
  private direction = 0;
  /** Times (s) of each change in direction of a big swing. */
  private flips: number[] = [];
  private warned = false;

  sample(gl: WebGLRenderingContext, time: number): void {
    const x = Math.floor(gl.drawingBufferWidth / 2) - 4;
    const y = Math.floor(gl.drawingBufferHeight / 2) - 4;
    gl.readPixels(x, y, 8, 8, gl.RGBA, gl.UNSIGNED_BYTE, this.pixels);
    let sum = 0;
    for (let i = 0; i < this.pixels.length; i += 4) {
      sum +=
        0.2126 * this.pixels[i] +
        0.7152 * this.pixels[i + 1] +
        0.0722 * this.pixels[i + 2];
    }
    const brightness = sum / 64 / 255;
    if (this.last !== null && Math.abs(brightness - this.last) >= SWING) {
      const direction = Math.sign(brightness - this.last);
      if (direction !== this.direction) this.flips.push(time);
      this.direction = direction;
    }
    this.last = brightness;
    this.flips = this.flips.filter((t) => time - t <= 1);
    // A flash is a pair of opposing changes.
    if (!this.warned && this.flips.length / 2 > MAX_FLASHES_PER_SECOND) {
      this.warned = true;
      console.warn(
        'Shader flashes more than 3 times a second (WCAG 2.3.1). Slow it down or soften it.'
      );
    }
  }
}
