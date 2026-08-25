/**
 * Durable solo-path cursor for Clueless.
 *
 * This deliberately does not reuse `campaignStorage`: that key belongs to the
 * independent team-race cursor and must never be advanced by solo play.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRuntimeAnalytics } from '../../analytics/runtime';
import {
  EMPTY_CLUELESS_PATH,
  isCluelessPathProgress,
  type CluelessPathProgress,
} from './path';

const KEY = 'bestgames.clueless.path.v1';

export async function loadCluelessPathProgress(): Promise<CluelessPathProgress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_CLUELESS_PATH;
    const parsed: unknown = JSON.parse(raw);
    return isCluelessPathProgress(parsed) ? parsed : EMPTY_CLUELESS_PATH;
  } catch {
    captureRuntimeAnalytics('progress_persist_failed', {
      game_id: 'clueless',
      operation: 'load',
      error_category: 'parse_or_validation',
    });
    return EMPTY_CLUELESS_PATH;
  }
}

export async function saveCluelessPathProgress(progress: CluelessPathProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    captureRuntimeAnalytics('progress_persist_failed', {
      game_id: 'clueless',
      operation: 'save',
      error_category: 'storage',
    });
  }
}
