/**
 * Live-race ranking. Pure so a finish can be asserted without Supabase.
 *
 * More or Less: highest streak. Completing the target is a flag, not a sort key
 * — a 20 beats a 12 even if both cleared the row.
 * Clueless: solvers first, then fewest guesses. Non-solvers rank after.
 * Wordfall: a win beats a loss, then higher points.
 */
import type { PathGameId } from '../games/campaign';

export type MatchScore = {
  playerId: string;
  score: number;
  complete: boolean;
};

export type RankedScore = MatchScore & { rank: number };

export function compareMatchScores(gameId: PathGameId, a: MatchScore, b: MatchScore): number {
  if (gameId === 'clueless') {
    if (a.complete !== b.complete) return a.complete ? -1 : 1;
    if (a.complete && b.complete) return a.score - b.score;
    return a.playerId.localeCompare(b.playerId);
  }
  if (gameId === 'wordfall') {
    if (a.complete !== b.complete) return a.complete ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    return a.playerId.localeCompare(b.playerId);
  }
  if (b.score !== a.score) return b.score - a.score;
  if (a.complete !== b.complete) return a.complete ? -1 : 1;
  return a.playerId.localeCompare(b.playerId);
}

export function rankMatchScores(gameId: PathGameId, players: readonly MatchScore[]): RankedScore[] {
  const sorted = [...players].sort((a, b) => compareMatchScores(gameId, a, b));
  return sorted.map((player, index) => ({ ...player, rank: index + 1 }));
}
