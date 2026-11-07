import { describe, expect, it } from 'vitest';
import {
  bestStreakFor,
  EMPTY_LABEL_PATH,
  isLabelPathProgress,
  isLevelUnlocked,
  levelStars,
  nextLevelNumber,
  recordLevelRun,
  starThresholds,
  type LabelLevel,
} from './labelPath';

const level = (number: number, targetStreak = 5): LabelLevel => ({
  number,
  categoryId: `c${number}`,
  name: `Level ${number}`,
  description: '',
  targetStreak,
});

describe('unlocking', () => {
  it('opens only the first level on a fresh path', () => {
    expect(isLevelUnlocked(EMPTY_LABEL_PATH, 1)).toBe(true);
    expect(isLevelUnlocked(EMPTY_LABEL_PATH, 2)).toBe(false);
    expect(isLevelUnlocked(EMPTY_LABEL_PATH, 0)).toBe(false);
  });

  it('offers the first uncleared level, capped at the last', () => {
    expect(nextLevelNumber(EMPTY_LABEL_PATH, 7)).toBe(1);
    expect(nextLevelNumber({ clearedThrough: 3, best: {} }, 7)).toBe(4);
    expect(nextLevelNumber({ clearedThrough: 7, best: {} }, 7)).toBe(7);
  });
});

describe('stars', () => {
  it('needs the target, half again, then double', () => {
    expect(starThresholds(5)).toEqual([5, 8, 10]);
    expect(levelStars(5, 4)).toBe(0);
    expect(levelStars(5, 5)).toBe(1);
    expect(levelStars(5, 8)).toBe(2);
    expect(levelStars(5, 10)).toBe(3);
    expect(levelStars(5, 40)).toBe(3);
  });
});

describe('recordLevelRun', () => {
  it('clears a level when the run reaches its target', () => {
    const result = recordLevelRun(EMPTY_LABEL_PATH, level(1, 5), 6);
    expect(result.clearedNow).toBe(true);
    expect(result.newBest).toBe(true);
    expect(result.progress.clearedThrough).toBe(1);
    expect(bestStreakFor(result.progress, 1)).toBe(6);
  });

  it('keeps a short run as a best without clearing', () => {
    const result = recordLevelRun(EMPTY_LABEL_PATH, level(1, 5), 3);
    expect(result.clearedNow).toBe(false);
    expect(result.progress.clearedThrough).toBe(0);
    expect(bestStreakFor(result.progress, 1)).toBe(3);
  });

  it('does not clear twice or move backwards on a replay', () => {
    const after = { clearedThrough: 3, best: { '1': 9 } };
    const replay = recordLevelRun(after, level(1, 5), 7);
    expect(replay.clearedNow).toBe(false);
    expect(replay.newBest).toBe(false);
    expect(replay.progress).toBe(after);
  });

  it('ignores a run on a locked level', () => {
    const result = recordLevelRun(EMPTY_LABEL_PATH, level(3, 5), 20);
    expect(result.progress).toBe(EMPTY_LABEL_PATH);
    expect(result.clearedNow).toBe(false);
  });
});

describe('isLabelPathProgress', () => {
  it('accepts a saved path and rejects junk', () => {
    expect(isLabelPathProgress({ clearedThrough: 2, best: { '1': 7 } })).toBe(true);
    expect(isLabelPathProgress(EMPTY_LABEL_PATH)).toBe(true);
    expect(isLabelPathProgress(null)).toBe(false);
    expect(isLabelPathProgress({ clearedThrough: -1, best: {} })).toBe(false);
    expect(isLabelPathProgress({ clearedThrough: 1.5, best: {} })).toBe(false);
    expect(isLabelPathProgress({ clearedThrough: 1, best: { '1': 'x' } })).toBe(false);
    expect(isLabelPathProgress({ clearedThrough: 1, best: [] })).toBe(false);
  });
});
