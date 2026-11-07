/**
 * Reward tunables. [ASSUMED] — owner default O-1, revisit after a week of play.
 *
 * Every grant and price in the economy is named here so a screen cannot
 * invent a second number.
 */
import type { BoostKind, ChestDay, MilestoneId } from './types';

/** XP to go from level L to L+1 is `XP_LEVEL_BASE + XP_LEVEL_STEP * (L - 1)`. */
export const XP_LEVEL_BASE = 60;
export const XP_LEVEL_STEP = 20;

export const XP_FINISHED_RUN = 10;
export const XP_PER_CORRECT = 2;
/** More or Less correct-answer XP stops growing after this many points. */
export const XP_CORRECT_CAP = 40;
export const XP_CLUELESS_SOLVE = 30;
export const XP_WORDFALL_CLEAR = 25;
export const XP_PER_STAR = 5;
export const XP_NEW_BEST = 15;
export const XP_FIRST_OF_DAY = 10;

export const COINS_FIRST_RUN = 100;
export const COINS_FINISHED_RUN = 5;
export const COINS_WIN = 10;
export const COINS_PER_STAR = 5;
export const COINS_NEW_BEST = 10;
export const COINS_LEVEL_UP = 25;

/** Chest days 1 through 7. The cycle returns to day 1 after day 7. */
export const CHEST_COINS_BY_DAY: Readonly<Record<ChestDay, number>> = {
  1: 20,
  2: 25,
  3: 30,
  4: 40,
  5: 50,
  6: 60,
  7: 120,
};

/** More or Less stars for a finished run: streak ≥ 3 / ≥ 7 / ≥ 12. */
export const MOL_STAR_STREAKS = { one: 3, two: 7, three: 12 } as const;

/** Clueless stars for a solve: any solve / ≤ 30 guesses / ≤ 12 guesses. */
export const CLUELESS_STAR_GUESSES = { two: 30, three: 12 } as const;

/**
 * Wordfall move-level stars: cleared / ≥ 15% of moves left / ≥ 35% left.
 * A words-only tutorial that always finishes with half its moves left earns
 * three stars. That is accepted for the teaching levels.
 */
export const WORDFALL_MOVE_STAR_FRACTIONS = { two: 0.15, three: 0.35 } as const;

/** Wordfall timed-level stars: cleared / ≥ 20% of time left / ≥ 40% left. */
export const WORDFALL_TIME_STAR_FRACTIONS = { two: 0.2, three: 0.4 } as const;

export const MILESTONE_REWARDS: Readonly<Record<MilestoneId, { xp: number; coins: number }>> = {
  'flame-3': { xp: 25, coins: 25 },
  'flame-7': { xp: 50, coins: 50 },
  'flame-14': { xp: 75, coins: 75 },
  'flame-30': { xp: 150, coins: 150 },
  'mol-streak-5': { xp: 20, coins: 20 },
  'mol-streak-10': { xp: 40, coins: 40 },
  'mol-streak-20': { xp: 80, coins: 80 },
  'mol-set-1': { xp: 50, coins: 50 },
  'clueless-sparks': { xp: 50, coins: 50 },
  'clueless-vault-1': { xp: 30, coins: 30 },
  'clueless-vault-7': { xp: 100, coins: 100 },
  'wordfall-campaign': { xp: 100, coins: 100 },
  'wordfall-weekly-1': { xp: 50, coins: 50 },
  'level-5': { xp: 0, coins: 50 },
  'level-10': { xp: 0, coins: 100 },
};

export const FLAME_MILESTONES: ReadonlyArray<{ id: MilestoneId; days: number }> = [
  { id: 'flame-3', days: 3 },
  { id: 'flame-7', days: 7 },
  { id: 'flame-14', days: 14 },
  { id: 'flame-30', days: 30 },
];

export const MOL_STREAK_MILESTONES: ReadonlyArray<{ id: MilestoneId; streak: number }> = [
  { id: 'mol-streak-5', streak: 5 },
  { id: 'mol-streak-10', streak: 10 },
  { id: 'mol-streak-20', streak: 20 },
];

/**
 * Coin prices. "Once per run / level" is enforced by the game reducer, not
 * here — the wallet only refuses a balance that would go negative.
 */
export const BOOST_PRICES: Readonly<Record<BoostKind, number>> = {
  'skip-pair': 15,
  'second-chance': 50,
  'warmer-word': 25,
  'hint-now': 40,
  shuffle: 15,
  'word-hint': 20,
  'extra-moves': 40,
  'extra-time': 40,
};

export const EXTRA_MOVES = 3;
export const EXTRA_TIME_MS = 10_000;

/** Warmer-word never returns a rank tighter than this. Puzzle 31 is why. */
export const WARMER_MIN_RANK = 10;
/** Target rank when the player has no ranked guess yet. */
export const WARMER_NO_GUESS_TARGET = 300;
export const WARMER_PREFIX_LENGTH = 4;

export const APPLIED_RUN_CAP = 100;

/** XP required to leave `level` for the next one. Level 1 costs 60. */
export function xpToNextLevel(level: number): number {
  const safe = Number.isInteger(level) && level >= 1 ? level : 1;
  return XP_LEVEL_BASE + XP_LEVEL_STEP * (safe - 1);
}
