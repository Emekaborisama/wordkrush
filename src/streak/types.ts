/**
 * Daily play streak — cross-game, unlike a single run's in-game streak
 * (WordKrush comparison already has one of those; this is "did you play something
 * today", Duolingo-style). Pure data + pure logic — no storage, no React.
 */

export type DailyStreak = {
  /** Consecutive calendar days with at least one completed run, in any game. */
  current: number;
  longest: number;
  /** Local calendar day (`YYYY-MM-DD`) of the last completed run. Empty until the first. */
  lastPlayedDate: string;
};

export const EMPTY_STREAK: DailyStreak = { current: 0, longest: 0, lastPlayedDate: '' };

/** Local calendar day as `YYYY-MM-DD`. Local, not UTC — a streak that resets
    at UTC midnight breaks mid-evening for most of the world. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(fromKey: string, toKey: string): number {
  const from = new Date(`${fromKey}T00:00:00`).getTime();
  const to = new Date(`${toKey}T00:00:00`).getTime();
  return Math.round((to - from) / 86_400_000);
}

/**
 * Records a completed run on `today`. Same-day calls are idempotent — a
 * player finishing three runs in one evening has a streak of "one more day,"
 * not three.
 *
 * A negative day gap (device clock moved backwards) is left untouched rather
 * than trusted, so a clock glitch cannot manufacture or destroy a streak.
 */
export function recordPlay(streak: DailyStreak, today: string): DailyStreak {
  if (!streak.lastPlayedDate) {
    return { current: 1, longest: Math.max(1, streak.longest), lastPlayedDate: today };
  }

  const gap = daysBetween(streak.lastPlayedDate, today);
  if (gap === 0) return streak;
  if (gap < 0) return streak;

  if (gap === 1) {
    const current = streak.current + 1;
    return { current, longest: Math.max(current, streak.longest), lastPlayedDate: today };
  }

  // A gap of 2+ days broke the chain — start over, but the personal best stays.
  return { current: 1, longest: streak.longest, lastPlayedDate: today };
}

/**
 * A live streak that has not been extended yet today — the Duolingo "your
 * flame is about to go out" state. Used to dim the flame rather than show it
 * fully lit before today's run is in.
 */
export function isAtRisk(streak: DailyStreak, today: string): boolean {
  return streak.current > 0 && streak.lastPlayedDate !== today;
}

export function isValidStreak(value: unknown): value is DailyStreak {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.current === 'number' &&
    Number.isInteger(s.current) &&
    s.current >= 0 &&
    typeof s.longest === 'number' &&
    Number.isInteger(s.longest) &&
    s.longest >= 0 &&
    typeof s.lastPlayedDate === 'string' &&
    (s.lastPlayedDate === '' || !Number.isNaN(Date.parse(s.lastPlayedDate)))
  );
}

export function parseStreak(raw: string | null): DailyStreak {
  if (!raw) return EMPTY_STREAK;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidStreak(parsed) ? parsed : EMPTY_STREAK;
  } catch {
    return EMPTY_STREAK;
  }
}

/**
 * The streak as it stands on `today`: the days still alive, not the number
 * last stored. A streak whose last run was two or more days ago is over even
 * though `current` keeps its old count until the next run resets it, and a
 * pop-up or a share must never claim it.
 */
export function liveStreakDays(streak: DailyStreak, today: string): number {
  if (streak.current <= 0 || !streak.lastPlayedDate) return 0;
  const gap = daysBetween(streak.lastPlayedDate, today);
  return gap >= 0 && gap <= 1 ? streak.current : 0;
}

export type StreakDay = {
  /** Local calendar day, `YYYY-MM-DD`. */
  key: string;
  /** Day of the week, 0 = Sunday, as `Date.getDay()`. */
  weekday: number;
  played: boolean;
  isToday: boolean;
};

/**
 * The last `count` local days ending today, oldest first, each marked played
 * or not. Only the unbroken run ending at `lastPlayedDate` is known to have
 * been played — the stored streak keeps nothing older — so earlier days read
 * as not played rather than guessed.
 */
export function recentStreakDays(streak: DailyStreak, today: string, count = 7): StreakDay[] {
  const end = new Date(`${today}T00:00:00`);
  const runEnd = streak.lastPlayedDate;
  const runLength = runEnd ? Math.max(0, streak.current) : 0;
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (count - 1 - i));
    const key = dayKey(date);
    const sinceRun = runEnd ? daysBetween(key, runEnd) : -1;
    return {
      key,
      weekday: date.getDay(),
      played: sinceRun >= 0 && sinceRun < runLength,
      isToday: key === today,
    };
  });
}
