import { describe, expect, it } from 'vitest';
import { dailyPostTitle, dailySeed, dayKey, dayLabel } from './daily';

describe('the daily key', () => {
  it('reads the UTC calendar day, not the runner’s local one', () => {
    // 23:30 UTC on the 23rd is already the 24th in Sydney and still the 23rd in
    // New York. The post, the cron task and every player must agree, so UTC is
    // the only answer that does not depend on where the code happens to run.
    expect(dayKey(new Date('2026-08-23T23:30:00Z'))).toBe('2026-08-23');
    expect(dayKey(new Date('2026-08-23T00:05:00Z'))).toBe('2026-08-23');
  });

  it('pads single-digit months and days', () => {
    expect(dayKey(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
  });
});

describe('the daily seed', () => {
  it('hands every player on one day the same run', () => {
    const morning = dailySeed(new Date('2026-08-23T09:00:00Z'));
    const evening = dailySeed(new Date('2026-08-23T21:45:00Z'));
    expect(evening).toBe(morning);
  });

  it('moves to a different run the next day', () => {
    const today = dailySeed(new Date('2026-08-23T09:00:00Z'));
    const tomorrow = dailySeed(new Date('2026-08-24T09:00:00Z'));
    expect(tomorrow).not.toBe(today);
  });

  it('is a usable 32-bit seed', () => {
    const seed = dailySeed(new Date('2026-08-23T09:00:00Z'));
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

describe('reader-facing labels', () => {
  it('names the weekday and month', () => {
    expect(dayLabel(new Date('2026-08-23T09:00:00Z'))).toBe('Sun 23 Aug');
  });

  it('titles the post with that day', () => {
    expect(dailyPostTitle(new Date('2026-08-23T09:00:00Z'))).toBe('More or Less — Sun 23 Aug');
  });
});
