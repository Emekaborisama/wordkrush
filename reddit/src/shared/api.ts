/**
 * The wire contract between the Devvit web view (an iframe on reddit.com) and
 * the Devvit server.
 *
 * The shape here encodes the central design decision of this app: **the server
 * owns the run.** A round never carries the hidden item's value, and a score is
 * never asserted by the client — it is whatever the server counted while it was
 * judging the guesses. See `reddit/README.md` and STACK D-042.
 *
 * Types only. This module must stay importable from the splash bundle without
 * dragging the engine or the category data in behind it.
 */

export type Choice = 'more' | 'less';

/**
 * One question as the player sees it: the anchor with its value showing, and
 * the challenger with its value deliberately absent. `right.value` does not
 * exist on this type because it must never cross the wire before the guess.
 */
export type RoundView = {
  /** 0-based position in the run. Round 0 is the pair shown on the splash. */
  index: number;
  left: { label: string; value: number };
  right: { label: string };
};

export type BoardEntry = { username: string; streak: number };

export type BoardView = {
  /** How many players have a recorded first run on this post. */
  players: number;
  /** Today's leading streak, 0 when nobody has finished a run yet. */
  best: number;
  top: BoardEntry[];
};

export type ResultView = {
  streak: number;
  /** 1-based position on today's board; null for a run that was not recorded. */
  rank: number | null;
  players: number;
  /**
   * False when this run did not count — a replay, or a logged-out player.
   * Only a player's first completed run goes on the board, because everyone
   * gets the same sequence and a second attempt already knows the answers.
   */
  recorded: boolean;
  /** Spoiler-free block for the comments. Empty when the run was not recorded. */
  share: string;
};

export type RunStatus = 'playing' | 'over';

export type InitResponse = {
  type: 'init';
  /** Human day for the header, e.g. "Sat 23 Aug". */
  dayLabel: string;
  /** What the numbers mean, e.g. "monthly Wikipedia pageviews". */
  metricLabel: string;
  /** null when the viewer is logged out; they can play but cannot be ranked. */
  username: string | null;
  status: RunStatus;
  round: RoundView | null;
  streak: number;
  result: ResultView | null;
  board: BoardView;
};

export type GuessResponse = {
  type: 'guess';
  correct: boolean;
  /** The challenger's value, released now that the guess is locked in. */
  revealed: number;
  streak: number;
  status: RunStatus;
  /** The next question, delivered with the verdict so the reveal hides the trip. */
  next: RoundView | null;
  result: ResultView | null;
  board: BoardView;
};

export type ErrorResponse = { type: 'error'; message: string };

/**
 * The slice of the day baked into the post at creation time via `postData`.
 *
 * The splash renders from this alone, so the feed view costs zero network
 * round-trips. It is written by the server and is safe to display, but it is
 * still parsed rather than trusted: an old post created by an earlier version
 * of this app will hand us whatever shape that version wrote.
 */
export type SplashData = {
  v: 1;
  /** "Sat 23 Aug" */
  day: string;
  /** Round 0's anchor label. */
  left: string;
  /** Round 0's challenger label. */
  right: string;
  metric: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Narrow untrusted `postData` to `SplashData`, or null so the caller can fetch. */
export function parseSplashData(raw: unknown): SplashData | null {
  if (!isRecord(raw) || raw.v !== 1) return null;
  const day = str(raw.day);
  const left = str(raw.left);
  const right = str(raw.right);
  const metric = str(raw.metric);
  if (!day || !left || !right || !metric) return null;
  return { v: 1, day, left, right, metric };
}
