import { describe, expect, it } from 'vitest';
import { dailyNumber, dailySeed, DAILY_PAIRS, parseDailyResult, todaysResult } from './daily';

describe('dailySeed', () => {
  it('is the same for a day and different between days', () => {
    expect(dailySeed('2026-10-26')).toBe(dailySeed('2026-10-26'));
    expect(dailySeed('2026-10-26')).not.toBe(dailySeed('2026-10-27'));
    expect(Number.isInteger(dailySeed('2026-10-26'))).toBe(true);
    expect(dailySeed('2026-10-26')).toBeGreaterThanOrEqual(0);
  });
});

describe('dailyNumber', () => {
  it('counts from #1 on launch day, across a month end', () => {
    expect(dailyNumber('2026-10-25')).toBe(1);
    expect(dailyNumber('2026-10-31')).toBe(7);
    expect(dailyNumber('2026-11-01')).toBe(8);
    expect(dailyNumber('2026-10-01')).toBe(1);
  });
});

describe('parseDailyResult', () => {
  it('keeps a well-formed result and drops anything else', () => {
    expect(parseDailyResult('{"day":"2026-10-26","streak":7}')).toEqual({ day: '2026-10-26', streak: 7 });
    expect(parseDailyResult(`{"day":"2026-10-26","streak":${DAILY_PAIRS + 1}}`)).toBeNull();
    expect(parseDailyResult('{"day":"yesterday","streak":3}')).toBeNull();
    expect(parseDailyResult('nope')).toBeNull();
    expect(parseDailyResult(null)).toBeNull();
  });
});

describe('todaysResult', () => {
  it('only counts a result from today', () => {
    const result = { day: '2026-10-26', streak: 4 };
    expect(todaysResult(result, '2026-10-26')).toBe(result);
    expect(todaysResult(result, '2026-10-27')).toBeNull();
  });
});
