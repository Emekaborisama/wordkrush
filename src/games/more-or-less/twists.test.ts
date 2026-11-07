import { describe, expect, it } from 'vitest';
import { isMysteryRound, nearMissPercent } from './twists';

describe('isMysteryRound', () => {
  it('falls on every fifth pair in a row', () => {
    expect([0, 1, 2, 3, 4, 5, 9, 14].map(isMysteryRound)).toEqual([false, false, false, false, true, false, true, true]);
  });
});

describe('nearMissPercent', () => {
  it('reports a narrow miss in whole percent of the larger value', () => {
    expect(nearMissPercent(16426, 17351)).toBe(5);
    expect(nearMissPercent(100, 99.6)).toBe(1);
  });

  it('stays quiet for a clear miss or values it cannot compare', () => {
    expect(nearMissPercent(3083, 19463)).toBeNull();
    expect(nearMissPercent(0, 0)).toBeNull();
    expect(nearMissPercent(Number.NaN, 5)).toBeNull();
  });
});
