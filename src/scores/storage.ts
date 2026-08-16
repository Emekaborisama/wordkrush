/**
 * Local score persistence. Works offline, needs no account, and is the source
 * of truth for the player's own history — a global leaderboard syncs FROM this,
 * never the other way round (see docs/STACK.md D-016).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addScore, EMPTY_BOARD, parseBoard, type ScoreBoard, type ScoreEntry } from './types';

const KEY = 'bestgames.scores.v1';

export async function loadBoard(): Promise<ScoreBoard> {
  try {
    return parseBoard(await AsyncStorage.getItem(KEY));
  } catch {
    // Storage can fail (private browsing, quota, corrupted profile). A player
    // losing their history is bad; the game refusing to start is worse.
    return EMPTY_BOARD;
  }
}

export async function saveBoard(board: ScoreBoard): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(board));
  } catch {
    // Non-fatal by design — the run already happened.
  }
}

export async function recordScore(entry: ScoreEntry): Promise<ScoreBoard> {
  const next = addScore(await loadBoard(), entry);
  await saveBoard(next);
  return next;
}

export async function clearScores(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Ids only need to be unique on this device; crypto-grade randomness is unnecessary. */
export function makeEntryId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
