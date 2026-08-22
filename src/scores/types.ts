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
  /**
   * How long the run took, where the game measures it.
   *
   * Optional because it is not universal: More or Less is an untimed streak and
   * has nothing meaningful to report here. Entries written before this field
   * existed simply omit it, which is why nothing may require it.
   */
  durationMs?: number;
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

/**
 * Which way is better for a given game. More or Less scores a streak (higher
 * wins); Clueless scores guesses used (lower wins). Everything that compares
 * scores has to be told which, or one game's board comes out upside down.
 */
export type ScoreDirection = 'higher' | 'lower';

export function isBetter(a: number, b: number, direction: ScoreDirection): boolean {
  return direction === 'higher' ? a > b : a < b;
}

export function addScore(
  board: ScoreBoard,
  entry: ScoreEntry,
  direction: ScoreDirection = 'higher',
): ScoreBoard {
  // A fresh board stores 0, which for lower-is-better would be an unbeatable
  // phantom best. Treat the first run as the best regardless of direction.
  const best =
    board.totalRuns === 0 || isBetter(entry.streak, board.bestStreak, direction)
      ? entry.streak
      : board.bestStreak;

  return {
    bestStreak: best,
    totalRuns: board.totalRuns + 1,
    history: [entry, ...board.history].slice(0, MAX_HISTORY),
  };
}

/** Best first; ties broken by most recent. */
export function topScores(
  board: ScoreBoard,
  limit = 10,
  direction: ScoreDirection = 'higher',
): ScoreEntry[] {
  const bySkill = (a: ScoreEntry, b: ScoreEntry) =>
    direction === 'higher' ? b.streak - a.streak : a.streak - b.streak;
  return [...board.history]
    .sort((a, b) => bySkill(a, b) || Date.parse(b.playedAt) - Date.parse(a.playedAt))
    .slice(0, limit);
}

/** 1-based rank of a score against local history, for "you placed Nth" messaging. */
export function rankOf(
  board: ScoreBoard,
  streak: number,
  direction: ScoreDirection = 'higher',
): number {
  return board.history.filter((e) => isBetter(e.streak, streak, direction)).length + 1;
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
    typeof e.seed === 'number' &&
    // Optional, but not free-form: a present-and-nonsense duration would be
    // rendered as a completion time, so it is checked when it is there.
    (e.durationMs === undefined ||
      (typeof e.durationMs === 'number' && Number.isFinite(e.durationMs) && e.durationMs >= 0))
  );
}

export function parseBoard(raw: string | null, direction: ScoreDirection = 'higher'): ScoreBoard {
  if (!raw) return EMPTY_BOARD;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const history = Array.isArray(parsed.history) ? parsed.history.filter(isValidEntry) : [];
    const storedBest = typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0;
    const storedRuns = typeof parsed.totalRuns === 'number' ? parsed.totalRuns : 0;
    const validBest = Number.isInteger(storedBest) && storedBest >= 0 ? storedBest : 0;
    const validRuns = Number.isInteger(storedRuns) && storedRuns >= 0 ? storedRuns : history.length;

    // Recompute from history rather than trusting the stored aggregate, then
    // reconcile: history is capped, so a legitimate older best can sit outside
    // it, but a tampered aggregate must not invent a score with no run behind it.
    const fromHistory = history.reduce<number | null>(
      (best, e) => (best === null || isBetter(e.streak, best, direction) ? e.streak : best),
      null,
    );

    let bestStreak: number;
    if (fromHistory === null) bestStreak = validBest;
    else if (validBest === 0 && direction === 'lower') bestStreak = fromHistory;
    else bestStreak = isBetter(validBest, fromHistory, direction) ? validBest : fromHistory;

    return {
      bestStreak,
      totalRuns: validRuns,
      history: history.slice(0, MAX_HISTORY),
    };
  } catch {
    return EMPTY_BOARD;
  }
}
