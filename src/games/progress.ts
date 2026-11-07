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

export type ProgressMeta = {
  boosted?: boolean;
};

type Envelope<T> = {
  /** Identifies WHICH session this is — a puzzle number, a seed, etc. */
  session: string | number;
  savedAt: string;
  state: T;
  meta?: ProgressMeta;
};

export type DecodedEnvelope<T> =
  | { ok: true; state: T; meta?: ProgressMeta }
  | { ok: false; reason: 'parse' | 'session' | 'validation' };

function isProgressMeta(value: unknown): value is ProgressMeta {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const meta = value as Record<string, unknown>;
  return meta.boosted === undefined || typeof meta.boosted === 'boolean';
}

/** Serializes one in-progress session. `savedAt` is passed in so this stays pure. */
export function encodeEnvelope<T>(envelope: Envelope<T>): string {
  const body: Envelope<T> = {
    session: envelope.session,
    savedAt: envelope.savedAt,
    state: envelope.state,
  };
  if (envelope.meta?.boosted !== undefined) {
    body.meta = { boosted: envelope.meta.boosted };
  }
  return JSON.stringify(body);
}

/**
 * Reads one session back. A different session is not an error — it is yesterday's
 * puzzle. Invalid JSON or a state that fails `validate` is.
 */
export function decodeEnvelope<T>(
  raw: string,
  session: string | number,
  validate: (value: unknown) => value is T,
): DecodedEnvelope<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'parse' };
  }
  if (typeof parsed !== 'object' || parsed === null) return { ok: false, reason: 'parse' };
  const envelope = parsed as Partial<Envelope<unknown>>;
  if (envelope.session !== session) return { ok: false, reason: 'session' };
  if (!validate(envelope.state)) return { ok: false, reason: 'validation' };
  if (envelope.meta !== undefined && !isProgressMeta(envelope.meta)) {
    return { ok: false, reason: 'validation' };
  }
  const boosted = envelope.meta?.boosted;
  return boosted === undefined
    ? { ok: true, state: envelope.state }
    : { ok: true, state: envelope.state, meta: { boosted } };
}

export async function saveProgress<T>(
  gameId: string,
  session: string | number,
  state: T,
  meta?: ProgressMeta,
): Promise<void> {
  try {
    const raw = encodeEnvelope({
      session,
      savedAt: new Date().toISOString(),
      state,
      ...(meta ? { meta } : {}),
    });
    await AsyncStorage.setItem(key(gameId), raw);
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

async function readEnvelope<T>(
  gameId: string,
  session: string | number,
  validate: (value: unknown) => value is T,
): Promise<{ state: T; meta?: ProgressMeta } | null> {
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

  const decoded = decodeEnvelope(raw, session, validate);
  if (!decoded.ok) {
    if (decoded.reason !== 'session') {
      captureRuntimeAnalytics('progress_persist_failed', {
        game_id: gameId,
        operation: 'load',
        error_category: 'parse_or_validation',
      });
    }
    return null;
  }
  return decoded.meta ? { state: decoded.state, meta: decoded.meta } : { state: decoded.state };
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
  const loaded = await readEnvelope(gameId, session, validate);
  return loaded ? loaded.state : null;
}

/** Same read as `loadProgress`, including the boosted flag when the save has one. */
export async function loadProgressEnvelope<T>(
  gameId: string,
  session: string | number,
  validate: (value: unknown) => value is T,
): Promise<{ state: T; meta?: ProgressMeta } | null> {
  return readEnvelope(gameId, session, validate);
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
