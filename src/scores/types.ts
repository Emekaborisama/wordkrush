/**
 * Score types. Pure data — no storage, no network, no React.
 */

export type ScoreEntry = {
  /** Local uuid-ish id; also the idempotency key when syncing to a leaderboard. */
  id: string;
  streak: number;
  categoryId: string;
  /** ISO timestamp of when the run ended. */
  playedAt: string;
  /** The seed the run was generated from — makes the run replayable and verifiable. */
  seed: number;
  /** Whether this entry has been accepted by the global leaderboard. */
  synced?: boolean;
};

export type ScoreBoard = {
  bestStreak: number;
  totalRuns: number;
  /** Most recent first, capped — see MAX_HISTORY. */
  history: ScoreEntry[];
};

export const EMPTY_BOARD: ScoreBoard = { bestStreak: 0, totalRuns: 0, history: [] };

/** Keeping every run forever would grow storage without bound for no benefit. */
export const MAX_HISTORY = 50;

export function addScore(board: ScoreBoard, entry: ScoreEntry): ScoreBoard {
  return {
    bestStreak: Math.max(board.bestStreak, entry.streak),
    totalRuns: board.totalRuns + 1,
    history: [entry, ...board.history].slice(0, MAX_HISTORY),
  };
}

/** Highest streaks first; ties broken by most recent. */
export function topScores(board: ScoreBoard, limit = 10): ScoreEntry[] {
  return [...board.history]
    .sort((a, b) => b.streak - a.streak || Date.parse(b.playedAt) - Date.parse(a.playedAt))
    .slice(0, limit);
}

/** 1-based rank of a streak against local history, for "you placed Nth" messaging. */
export function rankOf(board: ScoreBoard, streak: number): number {
  return board.history.filter((e) => e.streak > streak).length + 1;
}

/**
 * Validates anything read back from storage or the network.
 *
 * Persisted JSON is untrusted input: it can be hand-edited on a rooted device,
 * corrupted by a partial write, or written by an older app version with a
 * different shape. Anything that fails validation is dropped rather than
 * crashing the app on launch.
 */
export function isValidEntry(value: unknown): value is ScoreEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    e.id.length > 0 &&
    typeof e.streak === 'number' &&
    Number.isInteger(e.streak) &&
    e.streak >= 0 &&
    typeof e.categoryId === 'string' &&
    typeof e.playedAt === 'string' &&
    !Number.isNaN(Date.parse(e.playedAt)) &&
    typeof e.seed === 'number'
  );
}

export function parseBoard(raw: string | null): ScoreBoard {
  if (!raw) return EMPTY_BOARD;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const history = Array.isArray(parsed.history) ? parsed.history.filter(isValidEntry) : [];
    // Recompute rather than trust stored aggregates: if history was trimmed or
    // partially corrupted, a stale bestStreak would be a phantom high score.
    const bestStreak = history.reduce((max, e) => Math.max(max, e.streak), 0);
    const storedBest = typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0;
    const storedRuns = typeof parsed.totalRuns === 'number' ? parsed.totalRuns : 0;
    return {
      // History is capped, so a legitimate older best can exceed anything in it.
      bestStreak: Math.max(bestStreak, Number.isInteger(storedBest) && storedBest >= 0 ? storedBest : 0),
      totalRuns: Number.isInteger(storedRuns) && storedRuns >= 0 ? storedRuns : history.length,
      history: history.slice(0, MAX_HISTORY),
    };
  } catch {
    return EMPTY_BOARD;
  }
}
