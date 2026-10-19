/**
 * Level-by-level labels for More or Less.
 *
 * A level is one label (a category, e.g. "Music stars") and a target streak.
 * Reaching the target clears the level and opens the next; the run keeps
 * going, so the streak still counts for the player's best and the global
 * board, and a longer streak earns more stars. Pure: no React, no storage.
 */
import type { RatioBand } from './pairing';

/** `world` is the main path; `lagos` is I Sabi Lagos. */
export type LabelPathId = 'world' | 'lagos';

export type LabelLevel = {
  number: number;
  /** The bundled category this level plays. Every item shares its metric. */
  categoryId: string;
  /** The label, shown on the level's tab: "Music stars". */
  name: string;
  /** One line under it. */
  description: string;
  /** Streak that clears the level. */
  targetStreak: number;
  /** Optional tighter pairing from the first card. */
  band?: RatioBand;
  /** I Sabi Lagos: the danfo stop the level is named after. */
  stop?: string;
};

export type LabelPathProgress = {
  /** Highest level number cleared; 0 before the first clear. */
  clearedThrough: number;
  /** Best streak per level number. */
  best: Record<string, number>;
};

export const EMPTY_LABEL_PATH: LabelPathProgress = { clearedThrough: 0, best: {} };

export function isLabelPathProgress(value: unknown): value is LabelPathProgress {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.clearedThrough !== 'number' || !Number.isInteger(v.clearedThrough) || v.clearedThrough < 0) {
    return false;
  }
  if (typeof v.best !== 'object' || v.best === null || Array.isArray(v.best)) return false;
  return Object.values(v.best as Record<string, unknown>).every(
    (n) => typeof n === 'number' && Number.isInteger(n) && n >= 0,
  );
}

/** Levels open one at a time: everything cleared, plus the next. */
export function isLevelUnlocked(progress: LabelPathProgress, levelNumber: number): boolean {
  return levelNumber >= 1 && levelNumber <= progress.clearedThrough + 1;
}

/** The level a player should be offered: the first one not yet cleared. */
export function nextLevelNumber(progress: LabelPathProgress, levelCount: number): number {
  return Math.max(1, Math.min(progress.clearedThrough + 1, levelCount));
}

/** Streaks for one, two and three stars: the target, half again, double. */
export function starThresholds(targetStreak: number): readonly [number, number, number] {
  return [targetStreak, Math.ceil(targetStreak * 1.5), targetStreak * 2];
}

export function levelStars(targetStreak: number, streak: number): 0 | 1 | 2 | 3 {
  const [one, two, three] = starThresholds(targetStreak);
  if (streak >= three) return 3;
  if (streak >= two) return 2;
  if (streak >= one) return 1;
  return 0;
}

export function bestStreakFor(progress: LabelPathProgress, levelNumber: number): number {
  return progress.best[String(levelNumber)] ?? 0;
}

/**
 * Folds one finished run into the path. A run on a locked level changes
 * nothing; a run that reaches the target clears that level (once — replays
 * only raise the best streak).
 */
export function recordLevelRun(
  progress: LabelPathProgress,
  level: LabelLevel,
  streak: number,
): { progress: LabelPathProgress; clearedNow: boolean; newBest: boolean } {
  if (!isLevelUnlocked(progress, level.number) || streak < 0) {
    return { progress, clearedNow: false, newBest: false };
  }
  const key = String(level.number);
  const previous = progress.best[key] ?? 0;
  const newBest = streak > previous;
  const clearedNow = streak >= level.targetStreak && level.number > progress.clearedThrough;
  if (!clearedNow && !newBest) return { progress, clearedNow, newBest };
  return {
    progress: {
      clearedThrough: clearedNow ? level.number : progress.clearedThrough,
      best: newBest ? { ...progress.best, [key]: streak } : progress.best,
    },
    clearedNow,
    newBest,
  };
}
