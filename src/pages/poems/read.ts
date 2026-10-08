/*
 * Which poems this visitor has read, kept in localStorage so the web can
 * show the rest as locked. Storage can be missing or throw (private
 * windows, blocked site data); then nothing is remembered.
 */

const KEY = 'poems:read';

export function readPoems(): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(
      Array.isArray(value)
        ? value.filter((s): s is string => typeof s === 'string')
        : []
    );
  } catch {
    return new Set();
  }
}

export function markRead(slug: string): void {
  const read = readPoems();
  if (read.has(slug)) return;
  read.add(slug);
  try {
    localStorage.setItem(KEY, JSON.stringify([...read]));
  } catch {
    // Not remembered.
  }
}
