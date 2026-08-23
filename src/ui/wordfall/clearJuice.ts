/**
 * Layout helpers for Wordfall's match beat: puff the cleared tiles, then let
 * gravity run. Timing is UI-only — the reducer already applied the clear.
 *
 * Words are ours (Crush / Nova), not Candy Crush's juice vocabulary.
 */

export const CLEAR_HOLD_MS = 140;
export const PUFF_MS = 220;

export type ClearGhost = {
  key: string;
  index: number;
  letter: string;
  crate: boolean;
};

export function playJuiceKey(play: {
  word: string;
  cleared: readonly number[];
  chain: number;
  created: { index: number } | null;
}): string {
  return `${play.word}:${play.cleared.join(',')}:${play.chain}:${play.created?.index ?? ''}`;
}

export function ghostsFromCleared(
  previousTiles: readonly { id: number; letter: string; crate: boolean }[],
  cleared: readonly number[],
): ClearGhost[] {
  const seen = new Set<number>();
  const ghosts: ClearGhost[] = [];
  for (const index of cleared) {
    if (seen.has(index)) continue;
    seen.add(index);
    const tile = previousTiles[index];
    if (!tile) continue;
    ghosts.push({
      key: String(tile.id),
      index,
      letter: tile.letter,
      crate: tile.crate,
    });
  }
  return ghosts;
}

/** Overlay stamp for a chain reaction. Chain 1 is the puff alone. */
export function chainStamp(chain: number): 'CRUSH' | 'NOVA' | null {
  if (chain >= 3) return 'NOVA';
  if (chain >= 2) return 'CRUSH';
  return null;
}
