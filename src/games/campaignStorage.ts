/**
 * Personal campaign cursors for the team path.
 *
 * Wordfall already stores `unlocked` on its campaign save. More or Less and
 * Clueless keep a separate key so a live race cannot clobber an in-progress
 * daily or endless run.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRuntimeAnalytics } from '../analytics/runtime';
import { MIN_UNLOCKED, type PathGameId } from './campaign';
import { loadProgress, saveProgress } from './progress';
import { isWordfallSave, type WordfallSave } from './wordfall/persistence';

function key(gameId: Exclude<PathGameId, 'wordfall'>): string {
  return `bestgames.campaign.${gameId}.v1`;
}

function parseUnlocked(raw: string | null): number {
  if (!raw) return MIN_UNLOCKED;
  try {
    const parsed = JSON.parse(raw) as { unlocked?: unknown };
    if (typeof parsed.unlocked === 'number' && Number.isInteger(parsed.unlocked) && parsed.unlocked >= 1) {
      return parsed.unlocked;
    }
  } catch {
    /* ignore */
  }
  return MIN_UNLOCKED;
}

export async function loadPersonalUnlocked(gameId: PathGameId): Promise<number> {
  if (gameId === 'wordfall') {
    const save = await loadProgress<WordfallSave>('wordfall', 'campaign', isWordfallSave);
    return save?.unlocked ?? MIN_UNLOCKED;
  }
  try {
    return parseUnlocked(await AsyncStorage.getItem(key(gameId)));
  } catch {
    captureRuntimeAnalytics('progress_persist_failed', {
      game_id: gameId,
      operation: 'load',
      error_category: 'storage',
    });
    return MIN_UNLOCKED;
  }
}

export async function savePersonalUnlocked(gameId: PathGameId, unlocked: number): Promise<void> {
  const next = Math.max(MIN_UNLOCKED, unlocked);
  if (gameId === 'wordfall') {
    const save = await loadProgress<WordfallSave>('wordfall', 'campaign', isWordfallSave);
    await saveProgress<WordfallSave>('wordfall', 'campaign', {
      unlocked: next,
      state: save?.state ?? null,
    });
    return;
  }
  try {
    await AsyncStorage.setItem(key(gameId), JSON.stringify({ unlocked: next }));
  } catch {
    captureRuntimeAnalytics('progress_persist_failed', {
      game_id: gameId,
      operation: 'save',
      error_category: 'storage',
    });
  }
}
