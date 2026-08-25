/**
 * Clueless team path.
 *
 * Team races reserve the legacy puzzle range. Solo Daily Vault levels use a
 * separate range, so racing a team level can never reveal a future solo answer.
 */
import type { CampaignLevel } from '../../games/campaign';
import { puzzleByNumber } from './index';

export type CluelessTeamLevel = CampaignLevel & {
  puzzleNumber: number;
};

/** Team-only content IDs. Keep this disjoint from `CLUELESS_SOLO_LEVELS`. */
export const CLUELESS_TEAM_PUZZLE_NUMBERS = Array.from({ length: 30 }, (_, index) => index + 1);

export const CLUELESS_TEAM_LEVELS: readonly CluelessTeamLevel[] =
  CLUELESS_TEAM_PUZZLE_NUMBERS.map((puzzleNumber, index) => ({
    number: index + 1,
    puzzleNumber,
    name: `Path ${index + 1}`,
    description: 'Find the secret word before the clock runs out.',
  }));

export function cluelessTeamLevelByNumber(n: number): CluelessTeamLevel | undefined {
  return CLUELESS_TEAM_LEVELS[n - 1];
}

export function puzzleForCluelessTeamLevel(level: CluelessTeamLevel) {
  const puzzle = puzzleByNumber(level.puzzleNumber);
  if (!puzzle) throw new Error(`Missing Clueless team puzzle ${level.puzzleNumber}`);
  return puzzle;
}
