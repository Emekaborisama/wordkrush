/** Below this, chrome is full-bleed phone. At/above it, a laptop column. */
export const WIDE_MIN = 720;
/**
 * The kit is a phone game: on a laptop the app stays a phone-width column,
 * centred on the full-bleed sky, rather than stretching cards across a desk.
 */
export const COLUMN_MAX_WIDTH = 500;

export function isWideLayout(width: number): boolean {
  return width >= WIDE_MIN;
}
