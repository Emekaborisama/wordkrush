/**
 * Local persistence for Daily 10: the last day played and how it went. Same
 * pattern as the round progress beside it: storage errors fall back to "not
 * played", which can at worst offer today's daily twice.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseDailyResult, type DailyResult } from './daily';

export const DAILY_STORAGE_KEY = 'wordkrush.more-or-less.daily.v1';

export async function loadDailyResult(): Promise<DailyResult | null> {
  try {
    return parseDailyResult(await AsyncStorage.getItem(DAILY_STORAGE_KEY));
  } catch {
    return null;
  }
}

export async function saveDailyResult(result: DailyResult): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(result));
  } catch {
    /* non-fatal: the score is still recorded on the board */
  }
}
