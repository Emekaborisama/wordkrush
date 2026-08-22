/**
 * Local score persistence, namespaced PER GAME.
 *
 * Works offline, needs no account, and is the source of truth for the player's
 * own history — a global leaderboard syncs FROM this, never the other way
 * round (docs/STACK.md D-016).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addScore,
  EMPTY_BOARD,
  parseBoard,
  type ScoreBoard,
  type ScoreDirection,
  type ScoreEntry,
} from './types';

/**
 * Scores are keyed by game id. Without this a second game's runs would land in
 * the same bucket and inflate the first game's best streak — a streak of 8 in
 * one game is not comparable to a streak of 8 in another.
 */
export function storageKey(gameId: string): string {
  return `bestgames.scores.${gameId}.v1`;
}

/** The pre-multi-game key. Migrated once, then removed. */
const LEGACY_KEY = 'bestgames.scores.v1';
const LEGACY_GAME_ID = 'more-or-less';

/**
 * Moves scores saved before games were namespaced into the More or Less
 * bucket. Runs at most once — players should not lose history to a refactor.
 */
export async function migrateLegacyScores(): Promise<void> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacy) return;
    const target = storageKey(LEGACY_GAME_ID);
    const existing = await AsyncStorage.getItem(target);
    // Never clobber a newer namespaced board with the legacy one.
    if (!existing) await AsyncStorage.setItem(target, legacy);
    await AsyncStorage.removeItem(LEGACY_KEY);
  } catch {
    /* non-fatal: worst case the old scores are simply not carried over */
  }
}

export async function loadBoard(
  gameId: string,
  direction: ScoreDirection = 'higher',
): Promise<ScoreBoard> {
  try {
    return parseBoard(await AsyncStorage.getItem(storageKey(gameId)), direction);
  } catch {
    // Storage can fail (private browsing, quota, corrupted profile). A player
    // losing their history is bad; the game refusing to start is worse.
    return EMPTY_BOARD;
  }
}

export async function saveBoard(gameId: string, board: ScoreBoard): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(gameId), JSON.stringify(board));
  } catch {
    /* non-fatal by design — the run already happened */
  }
}

export async function recordScore(
  gameId: string,
  entry: ScoreEntry,
  direction: ScoreDirection = 'higher',
): Promise<ScoreBoard> {
  const next = addScore(await loadBoard(gameId), entry, direction);
  await saveBoard(gameId, next);
  return next;
}

/** Boards for several games at once, for the hub's per-card best scores. */
export async function loadBoards(
  games: { id: string; scoreDirection: ScoreDirection }[],
): Promise<Record<string, ScoreBoard>> {
  const entries = await Promise.all(
    games.map(async (g) => [g.id, await loadBoard(g.id, g.scoreDirection)] as const),
  );
  return Object.fromEntries(entries);
}

export async function clearScores(gameId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(gameId));
  } catch {
    /* ignore */
  }
}

/** Ids only need to be unique on this device; crypto-grade randomness is unnecessary. */
export function makeEntryId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
