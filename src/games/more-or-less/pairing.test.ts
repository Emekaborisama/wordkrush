import { describe, expect, it } from 'vitest';
import { FAIRNESS_MIN_RATIO, isFairPair, ratio, targetBandForStreak } from './pairing';
import type { Item } from './types';

const item = (id: string, value: number, categoryId = 'google-search'): Item => ({
  id,
  categoryId,
  label: id,
  value,
});

describe('ratio', () => {
  it('is symmetric and always >= 1', () => {
    expect(ratio(100, 300)).toBe(3);
    expect(ratio(300, 100)).toBe(3);
    expect(ratio(7, 7)).toBe(1);
  });

  it('rejects zero, negative, and non-finite values', () => {
    expect(() => ratio(0, 10)).toThrow();
    expect(() => ratio(10, -5)).toThrow();
    expect(() => ratio(NaN, 10)).toThrow();
    expect(() => ratio(Infinity, 10)).toThrow();
  });
});

describe('isFairPair', () => {
  it('accepts a clear gap', () => {
    expect(isFairPair(item('a', 1000), item('b', 2000))).toBe(true);
  });

  it('rejects near-ties inside the fairness guard', () => {
    expect(isFairPair(item('a', 1000), item('b', 1100))).toBe(false);
  });

  it('rejects cross-category pairs regardless of values', () => {
    expect(isFairPair(item('a', 1000), item('b', 9000, 'animals'))).toBe(false);
  });

  it('rejects an item paired with itself', () => {
    expect(isFairPair(item('a', 1000), item('a', 1000))).toBe(false);
  });
});

describe('targetBandForStreak', () => {
  it('starts easy and narrows as the streak grows', () => {
    expect(targetBandForStreak(0).min).toBe(3.0);
    expect(targetBandForStreak(5).min).toBe(2.0);
    expect(targetBandForStreak(10).min).toBe(1.5);
    expect(targetBandForStreak(20).min).toBe(FAIRNESS_MIN_RATIO);
  });

  it('never dips below the fairness guard', () => {
    for (let streak = 0; streak <= 100; streak++) {
      expect(targetBandForStreak(streak).min).toBeGreaterThanOrEqual(FAIRNESS_MIN_RATIO);
    }
  });

  it('is monotonically non-widening', () => {
    let prevMin = Infinity;
    for (const s of [0, 4, 5, 9, 10, 19, 20, 50]) {
      const band = targetBandForStreak(s);
      expect(band.min).toBeLessThanOrEqual(prevMin);
      prevMin = band.min;
    }
  });
});
