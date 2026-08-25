import { MATCH_DURATION_MS, type CampaignLevel, type PathGameId } from '../games/campaign';
import { CLUELESS_TEAM_LEVELS, isCluelessDailySpoiler } from '../data/clueless/campaign';
import { MORE_OR_LESS_LEVELS } from '../data/more-or-less/levels';
import { LEVELS } from '../data/wordfall';
import { isLevelReleased } from '../games/wordfall/schedule';
import type { Level } from '../games/wordfall/types';

export type PathRow = CampaignLevel & {
  meta: string;
  released: boolean;
  dailySpoiler: boolean;
  durationMs: number;
};

function wordfallDuration(level: Level): number {
  return Math.max(level.timeLimitMs ?? MATCH_DURATION_MS.wordfall, 90_000) + 15_000;
}

export function pathRows(gameId: PathGameId, now: Date = new Date()): PathRow[] {
  if (gameId === 'more-or-less') {
    return MORE_OR_LESS_LEVELS.map((level) => ({
      number: level.number,
      name: level.name,
      description: level.description,
      meta: `STREAK ${level.targetStreak}`,
      released: true,
      dailySpoiler: false,
      durationMs: MATCH_DURATION_MS['more-or-less'],
    }));
  }
  if (gameId === 'clueless') {
    return CLUELESS_TEAM_LEVELS.map((level) => ({
      number: level.number,
      name: level.name,
      description: level.description,
      meta: 'SECRET WORD',
      released: true,
      dailySpoiler: isCluelessDailySpoiler(level.number, now),
      durationMs: MATCH_DURATION_MS.clueless,
    }));
  }
  return LEVELS.map((level) => ({
    number: level.number,
    name: level.name,
    description: level.description,
    availableFrom: level.availableFrom,
    meta: level.timeLimitMs ? 'RACE' : 'PUZZLE',
    released: isLevelReleased(level, now),
    dailySpoiler: false,
    durationMs: wordfallDuration(level),
  }));
}

export function pathRowByNumber(
  gameId: PathGameId,
  levelNumber: number,
  now: Date = new Date(),
): PathRow | undefined {
  return pathRows(gameId, now).find((row) => row.number === levelNumber);
}
