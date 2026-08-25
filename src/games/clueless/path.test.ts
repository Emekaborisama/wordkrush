import { describe, expect, it } from 'vitest';
import {
  EMPTY_CLUELESS_PATH,
  availabilityForCluelessPathLevel,
  completeCluelessPathLevel,
  currentCluelessPathLevel,
  isCluelessPathProgress,
  localDayKey,
  nextCluelessPathUnlockAt,
  nextLocalDayKey,
} from './path';

describe('Clueless solo path', () => {
  it('opens tutorial levels immediately after their predecessor is completed', () => {
    const now = new Date(2026, 7, 25, 15, 30);
    const afterOne = completeCluelessPathLevel(EMPTY_CLUELESS_PATH, 1, now);

    expect(afterOne).toEqual({ completedThrough: 1, nextUnlockOn: null });
    expect(currentCluelessPathLevel(afterOne)).toBe(2);
    expect(availabilityForCluelessPathLevel(afterOne, 2, now)).toBe('playable');
  });

  it('schedules the first vault for the next local midnight after level three', () => {
    const now = new Date(2026, 7, 25, 23, 59, 59);
    const beforeVault = { completedThrough: 2, nextUnlockOn: null };
    const afterThree = completeCluelessPathLevel(beforeVault, 3, now);

    expect(afterThree).toEqual({ completedThrough: 3, nextUnlockOn: '2026-08-26' });
    expect(availabilityForCluelessPathLevel(afterThree, 4, now)).toBe('waiting');
    expect(
      availabilityForCluelessPathLevel(afterThree, 4, new Date(2026, 7, 26, 0, 0, 0)),
    ).toBe('playable');
    expect(nextCluelessPathUnlockAt(afterThree)).toEqual(new Date(2026, 7, 26));
  });

  it('does not advance an unsolved or stale level', () => {
    const now = new Date(2026, 7, 25, 12);
    expect(availabilityForCluelessPathLevel(EMPTY_CLUELESS_PATH, 2, now)).toBe('waiting');
    expect(completeCluelessPathLevel(EMPTY_CLUELESS_PATH, 2, now)).toBe(EMPTY_CLUELESS_PATH);
  });

  it('uses calendar arithmetic across month boundaries', () => {
    const lateJanuary = new Date(2026, 0, 31, 23, 59);
    expect(localDayKey(lateJanuary)).toBe('2026-01-31');
    expect(nextLocalDayKey(lateJanuary)).toBe('2026-02-01');
  });

  it('validates persisted local-day progress without accepting malformed dates', () => {
    expect(isCluelessPathProgress({ completedThrough: 3, nextUnlockOn: '2026-08-26' })).toBe(true);
    expect(isCluelessPathProgress({ completedThrough: 3, nextUnlockOn: '2026-02-30' })).toBe(false);
    expect(isCluelessPathProgress({ completedThrough: 1.5, nextUnlockOn: null })).toBe(false);
  });
});
