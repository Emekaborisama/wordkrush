/**
 * Small twists that keep a long Higher or Lower run from feeling the same.
 * Pure: the UI asks, the engine and the scoring are unchanged, so a twist
 * never makes one run easier to score on than another.
 */

/** Every fifth pair in a row is a mystery: the challenger's photo stays hidden until the reveal. */
export function isMysteryRound(streak: number): boolean {
  return streak >= 0 && (streak + 1) % 5 === 0;
}

/** A miss this close (as a share of the larger value) is called "so close". */
export const NEAR_MISS_SHARE = 0.15;

/**
 * How far apart two values were, in whole percent of the larger, when the
 * miss was narrow; `null` when it was not, or the values are not comparable.
 */
export function nearMissPercent(a: number, b: number): number | null {
  const high = Math.max(a, b);
  if (!Number.isFinite(a) || !Number.isFinite(b) || high <= 0) return null;
  const gap = Math.abs(a - b) / high;
  return gap <= NEAR_MISS_SHARE ? Math.max(1, Math.round(gap * 100)) : null;
}
