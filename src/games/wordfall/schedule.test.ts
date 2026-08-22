import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../data/wordfall';
import {
  formatDropDay,
  isLevelPlayable,
  isLevelReleased,
  isNewestRelease,
  lastReleasedNumber,
  nextDropDate,
  parseAvailableFrom,
  startOfLocalWeek,
  unlockAfterWin,
} from './schedule';

const at = (iso: string) => new Date(`${iso}T15:00:00`);

describe('parseAvailableFrom', () => {
  it('accepts a real local calendar day and rejects impossible dates', () => {
    expect(parseAvailableFrom('2026-08-24')?.getDate()).toBe(24);
    expect(parseAvailableFrom('2026-02-30')).toBeNull();
    expect(parseAvailableFrom('24-08-2026')).toBeNull();
  });
});

describe('weekly release gate', () => {
  const weekly = { number: 12, availableFrom: '2026-08-24' };

  it('treats launch levels with no date as already released', () => {
    expect(isLevelReleased({}, at('2026-08-22'))).toBe(true);
  });

  it('opens a drop on its local calendar day, not before', () => {
    expect(isLevelReleased(weekly, at('2026-08-23'))).toBe(false);
    expect(isLevelReleased(weekly, at('2026-08-24'))).toBe(true);
    expect(isLevelReleased(weekly, at('2026-08-31'))).toBe(true);
  });

  it('still requires the previous level to be unlocked', () => {
    expect(isLevelPlayable(weekly, 11, at('2026-08-24'))).toBe(false);
    expect(isLevelPlayable(weekly, 12, at('2026-08-23'))).toBe(false);
    expect(isLevelPlayable(weekly, 12, at('2026-08-24'))).toBe(true);
  });

  it('unlocks the next slot after a win even when that level has not shipped', () => {
    expect(unlockAfterWin(11, 11)).toBe(12);
    expect(unlockAfterWin(12, 8)).toBe(12);
  });

  it('marks only this week’s drop as new', () => {
    expect(isNewestRelease(weekly, at('2026-08-26'))).toBe(true);
    expect(isNewestRelease(weekly, at('2026-08-31'))).toBe(false);
    expect(isNewestRelease({}, at('2026-08-26'))).toBe(false);
  });

  it('reports the next unpublished Monday', () => {
    const levels = [{ availableFrom: '2026-08-24' }, { availableFrom: '2026-08-31' }];
    expect(nextDropDate(levels, at('2026-08-22'))?.getDate()).toBe(24);
    expect(nextDropDate(levels, at('2026-08-24'))?.getDate()).toBe(31);
    expect(nextDropDate(levels, at('2026-09-01'))).toBeNull();
  });

  it('starts the local week on Monday', () => {
    expect(startOfLocalWeek(at('2026-08-23')).getDay()).toBe(1);
    expect(startOfLocalWeek(at('2026-08-24')).getDate()).toBe(24);
  });

  it('formats a drop day for the picker', () => {
    expect(formatDropDay(at('2026-08-24'))).toMatch(/24/);
  });
});

describe('shipped Wordfall catalog', () => {
  it('keeps the launch curriculum undated so it is playable on day one', () => {
    expect(LEVELS.every((level) => level.availableFrom === undefined)).toBe(true);
    expect(lastReleasedNumber(LEVELS, at('2026-08-22'))).toBe(LEVELS[LEVELS.length - 1].number);
  });

  it('uses valid Mondays when a weekly date is present', () => {
    for (const level of LEVELS) {
      if (!level.availableFrom) continue;
      const opens = parseAvailableFrom(level.availableFrom);
      expect(opens, `level ${level.number}`).not.toBeNull();
      expect(opens!.getDay(), `level ${level.number} should drop Monday`).toBe(1);
    }
  });
});
