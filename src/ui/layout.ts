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

/**
 * How much height a game screen has to share. `regular` is a modern phone or
 * a laptop; `compact` is an iPhone SE-class screen (667 tall) or a big phone
 * with the browser bars showing; `tight` is an SE inside Safari (~550). The
 * HUD, booster dock and More or Less' question area shrink a step per class so
 * the board keeps its room instead of everything overlapping.
 */
export type HeightClass = 'regular' | 'compact' | 'tight';

export const COMPACT_MAX_HEIGHT = 759;
export const TIGHT_MAX_HEIGHT = 619;

export function heightClass(height: number): HeightClass {
  if (height <= TIGHT_MAX_HEIGHT) return 'tight';
  if (height <= COMPACT_MAX_HEIGHT) return 'compact';
  return 'regular';
}
