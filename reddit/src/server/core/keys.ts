/**
 * Every Redis key this app owns, in one place.
 *
 * Keys are installation-scoped by default, so these are already per-subreddit —
 * two communities running the app keep separate boards without any namespacing
 * of their own.
 */

const PREFIX = 'mol';

/** Per-post: the pinned seed and day. A hash so both are read in one call. */
export const dayKeyFor = (postId: string): string => `${PREFIX}:${postId}:day`;

/** Per-post: sorted set of username → best-and-only recorded streak. */
export const boardKeyFor = (postId: string): string => `${PREFIX}:${postId}:board`;

/** Per-post, per-player: the run in progress. */
export const runKeyFor = (postId: string, userId: string): string =>
  `${PREFIX}:${postId}:run:${userId}`;

/** Subreddit-wide: which post is a given calendar day's, so we post once. */
export const postForDayKey = (day: string): string => `${PREFIX}:daily:${day}`;

/**
 * How long an unfinished run is kept.
 *
 * Long enough that a player interrupted mid-run can come back the same evening,
 * short enough that abandoned runs do not accumulate. The board has no expiry —
 * it is the post's record and outlives the run.
 */
export const RUN_TTL_SECONDS = 48 * 60 * 60;
