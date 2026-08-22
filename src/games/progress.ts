/**
 * In-progress game state, persisted so leaving a screen does not throw away a
 * run. Separate from `src/scores/` — that records FINISHED runs; this holds the
 * one you are still playing.
 *
 * One key per game, holding a single active session. Storing a history of
 * sessions would grow without bound and there is never more than one live game
 * per title, so a mismatch (new day, new puzzle) simply reads as "no progress".
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRuntimeAnalytics } from '../analytics/runtime';

function key(gameId: string): string {
  return `bestgames.progress.${gameId}.v1`;
}

type Envelope<T> = {
  /** Identifies WHICH session this is — a puzzle number, a seed, etc. */
  session: string | number;
  savedAt: string;
  state: T;
};

export async function saveProgress<T>(
  gameId: string,
  session: string | number,
  state: T,
): Promise<void> {
  try {
    const envelope: Envelope<T> = { session, savedAt: new Date().toISOString(), state };
    await AsyncStorage.setItem(key(gameId), JSON.stringify(envelope));
  } catch {
    captureRuntimeAnalytics('progress_persist_failed', {
      game_id: gameId,
      operation: 'save',
      error_category: 'storage',
    });
    // Non-fatal: losing the ability to resume is worse than a crash only if we
    // let it become one.
  }
}

/**
 * Load progress for a session, or null.
 *
 * `validate` is required rather than optional: persisted JSON is untrusted
 * input — hand-editable, corruptible by a partial write, and written by older
 * app versions with different shapes. Anything that fails is discarded.
 */
export async function loadProgress<T>(
  gameId: string,
  session: string | number,
  validate: (value: unknown) => value is T,
): Promise<T | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key(gameId));
  } catch {
    captureRuntimeAnalytics('progress_persist_failed', {
      game_id: gameId,
      operation: 'load',
      error_category: 'storage',
    });
    return null;
  }

  if (!raw) return null;

  try {
    const envelope = JSON.parse(raw) as Partial<Envelope<unknown>>;
    // A different session means yesterday's puzzle or an abandoned run; not an
    // error, just nothing to resume.
    if (envelope?.session !== session) return null;
    if (validate(envelope.state)) return envelope.state;
    captureRuntimeAnalytics('progress_persist_failed', {
      game_id: gameId,
      operation: 'load',
      error_category: 'parse_or_validation',
    });
    return null;
  } catch {
    captureRuntimeAnalytics('progress_persist_failed', {
      game_id: gameId,
      operation: 'load',
      error_category: 'parse_or_validation',
    });
    return null;
  }
}

export async function clearProgress(gameId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(gameId));
  } catch {
    captureRuntimeAnalytics('progress_persist_failed', {
      game_id: gameId,
      operation: 'clear',
      error_category: 'storage',
    });
    /* ignore */
  }
}
