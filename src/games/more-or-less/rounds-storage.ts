/**
 * Local persistence for More or Less label-round progress.
 *
 * Outside the reducer: this is a platform effect, like scores. A missing or
 * corrupt row starts the player on the first queued round rather than crashing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRuntimeAnalytics } from '../../analytics/runtime';
import {
  emptyProgress,
  parseProgress,
  type LabelRoundProgress,
} from './rounds';

export const STORAGE_KEY = 'wordkrush.more-or-less.rounds.v1';

export async function loadRoundProgress(firstRoundId: string): Promise<LabelRoundProgress> {
  try {
    return parseProgress(await AsyncStorage.getItem(STORAGE_KEY), firstRoundId);
  } catch {
    captureRuntimeAnalytics('score_persist_failed', {
      game_id: 'more-or-less',
      operation: 'load',
      error_category: 'storage',
    });
    return emptyProgress(firstRoundId);
  }
}

export async function saveRoundProgress(progress: LabelRoundProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    captureRuntimeAnalytics('score_persist_failed', {
      game_id: 'more-or-less',
      operation: 'save',
      error_category: 'storage',
    });
  }
}
