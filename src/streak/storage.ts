/**
 * Local persistence for the daily streak. Same shape as `scores/storage.ts`:
 * offline-first, non-fatal on failure — losing the streak display is bad,
 * refusing to let the player play is worse.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayKey, EMPTY_STREAK, parseStreak, recordPlay, type DailyStreak } from './types';

const KEY = 'bestgames.streak.v1';

export async function loadStreak(): Promise<DailyStreak> {
  try {
    return parseStreak(await AsyncStorage.getItem(KEY));
  } catch {
    return EMPTY_STREAK;
  }
}

async function saveStreak(streak: DailyStreak): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(streak));
  } catch {
    /* non-fatal by design — the run already happened */
  }
}

/**
 * Call once per completed run, in any game. Idempotent within a calendar day
 * (see `recordPlay`), so callers do not need to track whether today has
 * already been counted.
 */
export async function markPlayedToday(today = dayKey(new Date())): Promise<DailyStreak> {
  const current = await loadStreak();
  const next = recordPlay(current, today);
  if (next !== current) await saveStreak(next);
  return next;
}
