/**
 * One post a day, and every player on it gets the same sequence.
 *
 * That is the whole reason this app is worth building on Reddit: a comment
 * saying "I got 14" only means something if the person reading it faced the
 * same cards. The seed is derived from the UTC calendar day so the post and
 * the run agree no matter which server instance builds them.
 *
 * `seedFromDate` is the Expo app's own helper (`src/games/rng.ts`), whose
 * doc comment anticipated exactly this use. Reusing it keeps one definition of
 * "today's seed" across both surfaces.
 */
import { seedFromDate } from '../../../src/games/rng';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Stable key for a day, e.g. "2026-08-23".
 *
 * UTC, not local: the server, the cron task and every reader are in different
 * zones, and a local-day key would give two players on the same post different
 * answers about which day it is.
 */
export function dayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Reader-facing day, e.g. "Sat 23 Aug". */
export function dayLabel(date: Date): string {
  const day = DAYS[date.getUTCDay()];
  const month = MONTHS[date.getUTCMonth()];
  return `${day} ${date.getUTCDate()} ${month}`;
}

/** The seed every player on a given day's post shares. */
export function dailySeed(date: Date): number {
  return seedFromDate(date);
}

/** Post title, e.g. "More or Less — Sat 23 Aug". */
export function dailyPostTitle(date: Date): string {
  return `More or Less — ${dayLabel(date)}`;
}
