import type { Item } from './types';

/**
 * Values within 15% of each other are too close to be a fair question.
 * This doubles as data-correctness insurance: measurement noise smaller than
 * the guard can never flip the answer of a pair we actually ask.
 * See docs/BRAINSTORM.md §4.
 */
export const FAIRNESS_MIN_RATIO = 1.15;

export function ratio(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
    throw new Error(`ratio() requires positive finite values, got ${a} and ${b}`);
  }
  return Math.max(a, b) / Math.min(a, b);
}

export function isFairPair(a: Item, b: Item): boolean {
  if (a.categoryId !== b.categoryId) return false; // cross-category is structurally banned
  if (a.id === b.id) return false;
  return ratio(a.value, b.value) >= FAIRNESS_MIN_RATIO;
}

export type RatioBand = { min: number; max: number };

/** Difficulty curve: pairs get closer together as the streak grows. */
export function targetBandForStreak(streak: number): RatioBand {
  if (streak < 5) return { min: 3.0, max: Infinity };
  if (streak < 10) return { min: 2.0, max: 3.0 };
  if (streak < 20) return { min: 1.5, max: 2.0 };
  return { min: FAIRNESS_MIN_RATIO, max: 1.5 };
}
