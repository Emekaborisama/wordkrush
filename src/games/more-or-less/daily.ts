/**
 * Daily 10: the same ten Higher or Lower pairs for everyone today, one try a
 * day, the Wordle loop. Pure: the day comes in as a local `YYYY-MM-DD` key
 * (`dayKey` in src/streak/types.ts, the same day the flame counts).
 */

export const DAILY_PAIRS = 10;

/** Daily #1. */
export const DAILY_EPOCH = '2026-10-25';

export type DailyResult = { day: string; streak: number };

/** One seed per day, the same on every device: FNV-1a over the day key. */
export function dailySeed(day: string): number {
  let hash = 0x811c9dc5;
  for (const char of `wordkrush-daily:${day}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function utcDays(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** The daily's number, counted from #1 on DAILY_EPOCH. */
export function dailyNumber(day: string): number {
  return Math.max(1, utcDays(day) - utcDays(DAILY_EPOCH) + 1);
}

export function isDailyResult(value: unknown): value is DailyResult {
  if (typeof value !== 'object' || value === null) return false;
  const day: unknown = Reflect.get(value, 'day');
  const streak: unknown = Reflect.get(value, 'streak');
  return (
    typeof day === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    typeof streak === 'number' &&
    Number.isInteger(streak) &&
    streak >= 0 &&
    streak <= DAILY_PAIRS
  );
}

/** Untrusted storage in, a result or nothing out. */
export function parseDailyResult(raw: string | null): DailyResult | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isDailyResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Today's result, if today has been played. */
export function todaysResult(result: DailyResult | null, day: string): DailyResult | null {
  return result && result.day === day ? result : null;
}
