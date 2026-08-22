import { describe, expect, it } from 'vitest';
import { EMPTY_STREAK, isAtRisk, isValidStreak, parseStreak, recordPlay } from './types';

describe('recordPlay', () => {
  it('starts a streak at 1 on the first play', () => {
    const next = recordPlay(EMPTY_STREAK, '2026-08-22');
    expect(next).toEqual({ current: 1, longest: 1, lastPlayedDate: '2026-08-22' });
  });

  it('is a no-op for a second play on the same day', () => {
    const streak = { current: 3, longest: 5, lastPlayedDate: '2026-08-22' };
    expect(recordPlay(streak, '2026-08-22')).toBe(streak);
  });

  it('extends the streak on the very next calendar day', () => {
    const streak = { current: 3, longest: 5, lastPlayedDate: '2026-08-22' };
    expect(recordPlay(streak, '2026-08-23')).toEqual({ current: 4, longest: 5, lastPlayedDate: '2026-08-23' });
  });

  it('raises the personal best once current overtakes it', () => {
    const streak = { current: 5, longest: 5, lastPlayedDate: '2026-08-22' };
    expect(recordPlay(streak, '2026-08-23')).toEqual({ current: 6, longest: 6, lastPlayedDate: '2026-08-23' });
  });

  it('resets current to 1 after a missed day, keeping the personal best', () => {
    const streak = { current: 5, longest: 9, lastPlayedDate: '2026-08-20' };
    expect(recordPlay(streak, '2026-08-22')).toEqual({ current: 1, longest: 9, lastPlayedDate: '2026-08-22' });
  });

  it('ignores a day that is before the last played day (clock moved backwards)', () => {
    const streak = { current: 5, longest: 9, lastPlayedDate: '2026-08-22' };
    expect(recordPlay(streak, '2026-08-21')).toBe(streak);
  });
});

describe('isAtRisk', () => {
  it('is false for a fresh streak with nothing played yet', () => {
    expect(isAtRisk(EMPTY_STREAK, '2026-08-22')).toBe(false);
  });

  it('is false once today has already been played', () => {
    const streak = { current: 3, longest: 3, lastPlayedDate: '2026-08-22' };
    expect(isAtRisk(streak, '2026-08-22')).toBe(false);
  });

  it('is true when a live streak has not been extended today yet', () => {
    const streak = { current: 3, longest: 3, lastPlayedDate: '2026-08-21' };
    expect(isAtRisk(streak, '2026-08-22')).toBe(true);
  });
});

describe('isValidStreak / parseStreak', () => {
  it('rejects a negative or non-integer current', () => {
    expect(isValidStreak({ current: -1, longest: 0, lastPlayedDate: '' })).toBe(false);
    expect(isValidStreak({ current: 1.5, longest: 0, lastPlayedDate: '' })).toBe(false);
  });

  it('rejects an unparseable lastPlayedDate', () => {
    expect(isValidStreak({ current: 1, longest: 1, lastPlayedDate: 'not-a-date' })).toBe(false);
  });

  it('accepts the empty-string sentinel for lastPlayedDate', () => {
    expect(isValidStreak(EMPTY_STREAK)).toBe(true);
  });

  it('falls back to EMPTY_STREAK for null, malformed JSON, or garbage', () => {
    expect(parseStreak(null)).toEqual(EMPTY_STREAK);
    expect(parseStreak('{not json')).toEqual(EMPTY_STREAK);
    expect(parseStreak('{"current":"nope"}')).toEqual(EMPTY_STREAK);
  });

  it('round-trips a valid streak', () => {
    const streak = { current: 4, longest: 10, lastPlayedDate: '2026-08-22' };
    expect(parseStreak(JSON.stringify(streak))).toEqual(streak);
  });
});
