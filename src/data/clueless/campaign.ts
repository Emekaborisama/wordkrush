/**
 * Clueless team path.
 *
 * Daily play stays on `todaysPuzzleNumber()` (UTC). Team races use the same
 * bundled puzzles as a numbered path, but never today's daily — racing that
 * number would spoil the secret for anyone who had not opened the day yet.
 */
import type { CampaignLevel } from '../../games/campaign';
import { PUZZLES, todaysPuzzleNumber } from './index';

export type CluelessTeamLevel = CampaignLevel & {
  puzzleNumber: number;
};

export const CLUELESS_TEAM_LEVELS: readonly CluelessTeamLevel[] = PUZZLES.map((puzzle) => ({
  number: puzzle.number,
  puzzleNumber: puzzle.number,
  name: `Path ${puzzle.number}`,
  description: 'Find the secret word before the clock runs out.',
}));

export function cluelessTeamLevelByNumber(n: number): CluelessTeamLevel | undefined {
  return CLUELESS_TEAM_LEVELS[n - 1];
}

export function isCluelessDailySpoiler(
  levelNumber: number,
  today: Date = new Date(),
): boolean {
  return levelNumber === todaysPuzzleNumber(today);
}
