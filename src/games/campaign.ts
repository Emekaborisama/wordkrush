/**
 * Shared campaign math for every title's numbered path.
 *
 * Wordfall already had this unlock rule. Teams and live races reuse it so a
 * More or Less catalog row and a Clueless path slot advance the same way a
 * Wordfall level does: beat N, and N+1 opens.
 *
 * Pure — no React, storage, or network.
 */

export const PATH_GAME_IDS = ['more-or-less', 'clueless', 'wordfall'] as const;
export type PathGameId = (typeof PATH_GAME_IDS)[number];

export const MIN_UNLOCKED = 1;
export const LIVE_MIN_PLAYERS = 2;
export const LIVE_MAX_PLAYERS = 10;
export const LIVE_ROSTER_LABEL = `${LIVE_MIN_PLAYERS}–${LIVE_MAX_PLAYERS}`;

export type PlayerCountBucket = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';

export const MATCH_DURATION_MS = {
  'more-or-less': 90_000,
  clueless: 180_000,
  wordfall: 180_000,
} as const;

export type CampaignLevel = {
  number: number;
  name: string;
  description: string;
  availableFrom?: string;
};

export type PickerStatus = 'locked' | 'open' | 'current' | 'team_ahead';

/** After a win, unlock the next number even if that level has not shipped yet. */
export function unlockAfterWin(unlocked: number, levelNumber: number): number {
  return Math.max(unlocked, levelNumber + 1);
}

export function isUnlocked(levelNumber: number, unlocked: number): boolean {
  return Number.isInteger(levelNumber) && levelNumber >= 1 && levelNumber <= unlocked;
}

/**
 * How a path row should look in a team picker.
 *
 * Team cursor is the gate. A row above the team's unlock stays locked even if
 * a player is personally ahead (they cannot skip the team). A row the team
 * has opened but the player has not is playable in a team session and marked
 * team-ahead so they know a win here is the team's, not theirs, until they
 * complete it.
 */
export function pickerStatus(
  levelNumber: number,
  personalUnlocked: number,
  teamUnlocked: number,
): PickerStatus {
  if (levelNumber > teamUnlocked) return 'locked';
  if (levelNumber > personalUnlocked) return 'team_ahead';
  if (levelNumber === teamUnlocked) return 'current';
  return 'open';
}

export function applyMatchUnlocks(input: {
  personalUnlocked: number;
  teamUnlocked: number;
  levelNumber: number;
  playerCompleted: boolean;
  anyoneCompleted: boolean;
}): { personalUnlocked: number; teamUnlocked: number } {
  return {
    personalUnlocked: input.playerCompleted
      ? unlockAfterWin(input.personalUnlocked, input.levelNumber)
      : input.personalUnlocked,
    teamUnlocked: input.anyoneCompleted
      ? unlockAfterWin(input.teamUnlocked, input.levelNumber)
      : input.teamUnlocked,
  };
}

export function playerCountBucket(count: number): PlayerCountBucket {
  if (!Number.isFinite(count)) return String(LIVE_MIN_PLAYERS) as PlayerCountBucket;
  const clamped = Math.min(LIVE_MAX_PLAYERS, Math.max(LIVE_MIN_PLAYERS, Math.trunc(count)));
  return String(clamped) as PlayerCountBucket;
}

export function isPathGameId(value: string): value is PathGameId {
  return (PATH_GAME_IDS as readonly string[]).includes(value);
}
