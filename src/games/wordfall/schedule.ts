/**
 * Wordfall weekly drops. Pure calendar rules — no React, no I/O.
 *
 * New levels ship in the app bundle and go live on a Monday. Play stays
 * offline; a player who has not updated the app simply does not have next
 * week's row yet.
 */
import type { Level } from './types';

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar day at 00:00, discarding clock time. */
export function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Monday of the local week containing `now`. */
export function startOfLocalWeek(now: Date): Date {
  const day = startOfLocalDay(now);
  const weekday = day.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  day.setDate(day.getDate() + mondayOffset);
  return day;
}

export function parseAvailableFrom(value: string): Date | null {
  const match = ISO_DAY.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const parsed = new Date(year, month - 1, date);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== date
  ) {
    return null;
  }
  return parsed;
}

/** True when the level is in the launch set, or its Monday has arrived. */
export function isLevelReleased(level: Pick<Level, 'availableFrom'>, now: Date): boolean {
  if (level.availableFrom === undefined) return true;
  const opens = parseAvailableFrom(level.availableFrom);
  if (!opens) return false;
  return startOfLocalDay(now).getTime() >= opens.getTime();
}

export function isLevelPlayable(
  level: Pick<Level, 'number' | 'availableFrom'>,
  unlocked: number,
  now: Date,
): boolean {
  return isLevelReleased(level, now) && level.number <= unlocked;
}

export function releasedLevels<T extends Pick<Level, 'availableFrom'>>(
  levels: readonly T[],
  now: Date,
): T[] {
  return levels.filter((level) => isLevelReleased(level, now));
}

export function lastReleasedNumber(levels: readonly Pick<Level, 'number' | 'availableFrom'>[], now: Date): number {
  const released = releasedLevels(levels, now);
  return released.length === 0 ? 1 : released[released.length - 1].number;
}

/** After a win, unlock the next number even if that level has not shipped yet. */
export function unlockAfterWin(unlocked: number, levelNumber: number): number {
  return Math.max(unlocked, levelNumber + 1);
}

export function isNewestRelease(
  level: Pick<Level, 'availableFrom'>,
  now: Date,
): boolean {
  if (level.availableFrom === undefined) return false;
  const opens = parseAvailableFrom(level.availableFrom);
  if (!opens || !isLevelReleased(level, now)) return false;
  return opens.getTime() >= startOfLocalWeek(now).getTime();
}

export function nextDropDate(
  levels: readonly Pick<Level, 'availableFrom'>[],
  now: Date,
): Date | null {
  const upcoming = levels
    .map((level) => (level.availableFrom ? parseAvailableFrom(level.availableFrom) : null))
    .filter((date): date is Date => date !== null && date.getTime() > startOfLocalDay(now).getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  return upcoming[0] ?? null;
}

export function formatDropDay(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * What a level asks — puzzle vs race plus objective kinds — not how hard the
 * numbers are. Weekly drops must not reuse a fingerprint already in LEVELS,
 * including last week's row.
 */
export function taskFingerprint(
  level: Pick<Level, 'objectives' | 'timeLimitMs'>,
): string {
  const clock = level.timeLimitMs != null ? 'race' : 'puzzle';
  const parts = level.objectives.map((objective) => {
    switch (objective.kind) {
      case 'words':
        return 'words';
      case 'score':
        return 'score';
      case 'crates':
        return 'crates';
      case 'letter':
        return `letter:${objective.letter.toLowerCase()}`;
      case 'length':
        return `length:${objective.minLength}`;
    }
  });
  parts.sort();
  return `${clock}|${parts.join('+')}`;
}
