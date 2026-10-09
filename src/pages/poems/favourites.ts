/*
 * The poems this visitor has starred, kept in localStorage for the
 * favourites page, in the order they were starred. Storage can be missing
 * or throw (private windows, blocked site data); then nothing is
 * remembered.
 */

const KEY = 'poems:favourites';

export function favourites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value)
      ? value.filter((s): s is string => typeof s === 'string')
      : [];
  } catch {
    return [];
  }
}

export function setFavourite(slug: string, on: boolean): void {
  const rest = favourites().filter((s) => s !== slug);
  try {
    localStorage.setItem(KEY, JSON.stringify(on ? [...rest, slug] : rest));
  } catch {
    // Not remembered.
  }
}
