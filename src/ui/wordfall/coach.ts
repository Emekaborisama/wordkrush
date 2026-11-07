/**
 * When the Wordfall drag coach is on screen.
 *
 * The first visit always shows it. After that, two single-tile releases show
 * it once more. Dismiss flags are inputs so this stays pure.
 */
export type TraceHintInput = {
  /** The player has already been shown the first-visit coach. */
  seenIntro: boolean;
  /** The first-visit coach has been dismissed this visit. */
  introDismissed: boolean;
  /** Traces released that were only one tile. */
  singleTileReleases: number;
  /** The adaptive coach has been dismissed. */
  adaptiveDismissed: boolean;
};

export function shouldShowTraceHint(input: TraceHintInput): boolean {
  if (!input.seenIntro && !input.introDismissed) return true;
  if (input.singleTileReleases >= 2 && !input.adaptiveDismissed) return true;
  return false;
}
