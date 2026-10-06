/**
 * Colour of the letter at `index` after the title cycle has stepped `offset`
 * times. Subtracting the offset makes colours travel forward through the
 * word. Shared with the build-time template so the first paint matches
 * step 0.
 */
export function letterColor(
  palette: readonly string[],
  index: number,
  offset: number
): string {
  const n = palette.length;
  return palette[(((index - offset) % n) + n) % n];
}
