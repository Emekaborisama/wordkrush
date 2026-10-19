/**
 * Durable level cursor for each More or Less label path. One key per path,
 * so I Sabi Lagos progress never moves the main path and vice versa.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRuntimeAnalytics } from '../../analytics/runtime';
import { EMPTY_LABEL_PATH, isLabelPathProgress, type LabelPathId, type LabelPathProgress } from './labelPath';

function key(path: LabelPathId): string {
  return `wordkrush.more-or-less.path.${path}.v1`;
}

export async function loadLabelPathProgress(path: LabelPathId): Promise<LabelPathProgress> {
  try {
    const raw = await AsyncStorage.getItem(key(path));
    if (!raw) return EMPTY_LABEL_PATH;
    const parsed: unknown = JSON.parse(raw);
    return isLabelPathProgress(parsed) ? parsed : EMPTY_LABEL_PATH;
  } catch {
    captureRuntimeAnalytics('progress_persist_failed', {
      game_id: 'more-or-less',
      operation: 'load',
      error_category: 'parse_or_validation',
    });
    return EMPTY_LABEL_PATH;
  }
}

export async function saveLabelPathProgress(path: LabelPathId, progress: LabelPathProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(key(path), JSON.stringify(progress));
  } catch {
    captureRuntimeAnalytics('progress_persist_failed', {
      game_id: 'more-or-less',
      operation: 'save',
      error_category: 'storage',
    });
  }
}
