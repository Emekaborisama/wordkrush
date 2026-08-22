/**
 * Shared ingest/rotate guards. Keep these identical so a weekly refresh and a
 * manual factory ingest flag the same kind of glitch.
 */

// If a value moved more than 10x since the last snapshot, a human looks at it
// before it can ship. Real popularity rarely moves that fast; API glitches do.
export const MAX_SWING_VS_PREVIOUS = 10;

/** Matches `src/data/categories.test.ts` — below this the run cannot sustain. */
export const MIN_PLAYABLE_ITEMS = 20;
