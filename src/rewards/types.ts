/**
 * Device-local rewards. Pure data — no storage, no React, no clock.
 *
 * A corrupt blob becomes an empty wallet. Resetting progress is the same
 * trade-off as the daily flame: a bad write must not stop the player playing.
 */

export const BOOST_KINDS = [
  'skip-pair',
  'second-chance',
  'warmer-word',
  'hint-now',
  'shuffle',
  'word-hint',
  'extra-moves',
  'extra-time',
] as const;

/** Wallet and analytics id. Wordfall's reducer uses `extraMoves` / `extraTime`. */
export type BoostKind = (typeof BOOST_KINDS)[number];

export const MILESTONE_IDS = [
  'flame-3',
  'flame-7',
  'flame-14',
  'flame-30',
  'mol-streak-5',
  'mol-streak-10',
  'mol-streak-20',
  'mol-set-1',
  'clueless-sparks',
  'clueless-vault-1',
  'clueless-vault-7',
  'wordfall-campaign',
  'wordfall-weekly-1',
  'level-5',
  'level-10',
] as const;

export type MilestoneId = (typeof MILESTONE_IDS)[number];

export type ChestDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type StarCount = 0 | 1 | 2 | 3;

export type StoredStars = 1 | 2 | 3;

export type XpReason =
  | 'finished-run'
  | 'correct-answers'
  | 'solve'
  | 'level-cleared'
  | 'stars'
  | 'new-best'
  | 'first-of-day'
  | 'milestone';

export type CoinReason =
  | 'first-run-bonus'
  | 'finished-run'
  | 'win'
  | 'stars'
  | 'new-best'
  | 'level-up'
  | 'chest'
  | 'milestone';

export type RewardsState = {
  version: 1;
  /** Lifetime. Never spent. */
  xp: number;
  /** Spendable. Never negative. */
  coins: number;
  firstRunBonusGranted: boolean;
  /** Best stars kept per level. Keys: `wordfall:12`, `clueless:4`, `more-or-less:best`. */
  bestStars: Record<string, StoredStars>;
  /** Claimed milestone ids. One-time. */
  milestones: string[];
  /** `day` is the last claimed chest in the 1–7 cycle, or 0 before the first claim. */
  chest: { lastClaimedDay: string; day: number };
  /** Local `YYYY-MM-DD` of the last finished run. Empty until the first. */
  lastRunDay: string;
  /** Newest last, capped at 100. A repeated id is not rewarded again. */
  appliedRunIds: string[];
};

export const EMPTY_REWARDS: RewardsState = {
  version: 1,
  xp: 0,
  coins: 0,
  firstRunBonusGranted: false,
  bestStars: {},
  milestones: [],
  chest: { lastClaimedDay: '', day: 0 },
  lastRunDay: '',
  appliedRunIds: [],
};

export type RunSummary =
  | {
      gameId: 'more-or-less';
      runId: string;
      streak: number;
      isNewBest: boolean;
      setCleared: boolean;
      boosted: boolean;
    }
  | {
      gameId: 'clueless';
      runId: string;
      levelNumber: number;
      phase: 'tutorial' | 'daily';
      guesses: number;
      isNewBest: boolean;
      boosted: boolean;
    }
  | {
      gameId: 'wordfall';
      runId: string;
      levelNumber: number;
      weekly: boolean;
      outcome: 'win' | 'loss';
      movesLeft: number;
      moves: number;
      timeLeftMs: number | null;
      timeLimitMs: number | null;
      isNewBest: boolean;
      boosted: boolean;
    };

export type RewardEvent =
  | { kind: 'xp'; amount: number; reason: XpReason }
  | { kind: 'coins'; amount: number; reason: CoinReason }
  | { kind: 'stars'; stars: StarCount; newBest: boolean }
  | { kind: 'levelUp'; from: number; to: number }
  | { kind: 'milestone'; id: MilestoneId }
  | { kind: 'chestReady' };

export type ApplyRunContext = {
  today: string;
  /** Daily flame length after this run was counted. */
  dailyStreakAfter: number;
  clueless?: { tutorialCleared: boolean; vaultsSolved: number };
  wordfall?: { campaignCleared: boolean };
};

export type ApplyRunResult = {
  state: RewardsState;
  events: RewardEvent[];
};

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const APPLIED_RUN_CAP = 100;

export function isDayKey(value: unknown): value is string {
  if (value === '') return true;
  if (typeof value !== 'string') return false;
  const match = DAY_KEY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Whole local days from `fromKey` to `toKey`.
 *
 * Negative means the clock moved backwards. Callers leave stored days alone
 * in that case, matching `recordPlay`.
 */
export function dayGap(fromKey: string, toKey: string): number | null {
  if (!isDayKey(fromKey) || fromKey === '' || !isDayKey(toKey) || toKey === '') return null;
  const from = new Date(`${fromKey}T00:00:00`).getTime();
  const to = new Date(`${toKey}T00:00:00`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.round((to - from) / 86_400_000);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isBestStars(value: unknown): value is Record<string, StoredStars> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([key, stars]) => key.length > 0 && (stars === 1 || stars === 2 || stars === 3),
  );
}

function isChest(value: unknown): value is RewardsState['chest'] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const chest = value as Record<string, unknown>;
  return (
    isDayKey(chest.lastClaimedDay) &&
    typeof chest.day === 'number' &&
    Number.isInteger(chest.day) &&
    chest.day >= 0 &&
    chest.day <= 7
  );
}

export function isValidRewards(value: unknown): value is RewardsState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  return (
    state.version === 1 &&
    isCount(state.xp) &&
    isCount(state.coins) &&
    typeof state.firstRunBonusGranted === 'boolean' &&
    isBestStars(state.bestStars) &&
    Array.isArray(state.milestones) &&
    state.milestones.every((id) => typeof id === 'string' && id.length > 0) &&
    isChest(state.chest) &&
    isDayKey(state.lastRunDay) &&
    Array.isArray(state.appliedRunIds) &&
    state.appliedRunIds.every((id) => typeof id === 'string' && id.length > 0)
  );
}

/** Untrusted JSON. Partial or corrupt input becomes `EMPTY_REWARDS` and never throws. */
export function parseRewards(raw: string | null): RewardsState {
  if (!raw) return EMPTY_REWARDS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidRewards(parsed)) return EMPTY_REWARDS;
    return {
      ...parsed,
      bestStars: { ...parsed.bestStars },
      milestones: parsed.milestones.slice(),
      chest: { ...parsed.chest },
      appliedRunIds: parsed.appliedRunIds.slice(-APPLIED_RUN_CAP),
    };
  } catch {
    return EMPTY_REWARDS;
  }
}
