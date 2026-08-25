import { describe, expect, it } from 'vitest';
import { PUZZLES, todaysPuzzleNumber } from './index';
import {
  CLUELESS_TEAM_LEVELS,
  cluelessTeamLevelByNumber,
  isCluelessDailySpoiler,
} from './campaign';

describe('Clueless team path', () => {
  it('mirrors the bundled puzzle numbers without renaming them', () => {
    expect(CLUELESS_TEAM_LEVELS).toHaveLength(PUZZLES.length);
    expect(CLUELESS_TEAM_LEVELS.map((level) => level.puzzleNumber)).toEqual(
      PUZZLES.map((puzzle) => puzzle.number),
    );
    expect(cluelessTeamLevelByNumber(1)?.puzzleNumber).toBe(1);
  });

  it('treats only today UTC’s daily as a spoiler', () => {
    const today = new Date(Date.UTC(2026, 7, 17));
    expect(todaysPuzzleNumber(today)).toBe(1);
    expect(isCluelessDailySpoiler(1, today)).toBe(true);
    expect(isCluelessDailySpoiler(2, today)).toBe(false);
  });

  it('does not change the daily schedule', () => {
    expect(todaysPuzzleNumber(new Date(Date.UTC(2026, 7, 17)))).toBe(1);
    expect(todaysPuzzleNumber(new Date(Date.UTC(2026, 7, 18)))).toBe(2);
  });
});
