/** Below this, chrome is full-bleed phone. At/above it, a laptop column. */
export const WIDE_MIN = 720;
/** Readable laptop column. Not a fake phone bezel. */
export const LAPTOP_MAX_WIDTH = 1080;

export function isWideLayout(width: number): boolean {
  return width >= WIDE_MIN;
}
