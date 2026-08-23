/**
 * Today's leaderboard.
 *
 * One rule shapes everything here: **only a player's first completed run is
 * recorded.** Every player on a post gets the same sequence, so a second
 * attempt is not a second attempt — it is the same questions with the answers
 * already known. Letting replays overwrite a score would turn the board into a
 * ranking of who bothered to play twice.
 */
import { redis } from '@devvit/web/server';
import type { BoardEntry, BoardView } from '../../shared/api';
import { boardKeyFor } from './keys';

/** How many names the result screen shows. */
const TOP_N = 10;

export async function readBoard(postId: string): Promise<BoardView> {
  const key = boardKeyFor(postId);
  const [players, top] = await Promise.all([
    redis.zCard(key),
    redis.zRange(key, 0, TOP_N - 1, { by: 'rank', reverse: true }),
  ]);

  const entries: BoardEntry[] = top.map((row) => ({
    username: row.member,
    streak: row.score,
  }));

  return {
    players,
    best: entries[0]?.streak ?? 0,
    top: entries,
  };
}

/**
 * Position on the board, 1 being today's best.
 *
 * `zRank` counts from the bottom, so this flips it. Players tied on a streak
 * are separated by member order rather than sharing a place — good enough for
 * "you were #7 today", and it costs one call instead of scanning the set.
 */
export async function rankOf(postId: string, username: string | null): Promise<number | null> {
  if (username === null) return null;

  const key = boardKeyFor(postId);
  const [rank, players] = await Promise.all([redis.zRank(key, username), redis.zCard(key)]);
  if (rank === undefined) return null;
  return players - rank;
}

export type RecordOutcome = {
  /** False when this player already had a run on this post, or is logged out. */
  recorded: boolean;
  rank: number | null;
};

/**
 * Put a finished run on the board if it is this player's first one here.
 *
 * Logged-out players can play the whole run — they just cannot be ranked,
 * because there is no identity to rank. That is a deliberately soft failure:
 * blocking the game behind a login would cost far more plays than the board is
 * worth.
 */
export async function recordRun(
  postId: string,
  username: string | null,
  streak: number,
): Promise<RecordOutcome> {
  if (username === null) return { recorded: false, rank: null };

  const key = boardKeyFor(postId);
  const existing = await redis.zScore(key, username);
  if (existing !== undefined) {
    return { recorded: false, rank: await rankOf(postId, username) };
  }

  await redis.zAdd(key, { member: username, score: streak });
  return { recorded: true, rank: await rankOf(postId, username) };
}

/**
 * The streak this player already has on this post, or null if they have none.
 *
 * Doubles as the "have they played today" check and as the source for the
 * result screen when someone reopens a post they already finished.
 */
export async function recordedStreak(
  postId: string,
  username: string | null,
): Promise<number | null> {
  if (username === null) return null;
  return (await redis.zScore(boardKeyFor(postId), username)) ?? null;
}
