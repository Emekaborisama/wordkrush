/**
 * Server-side run state — the reason a score on this board means anything.
 *
 * The client is never told the seed, never told the hidden value, and never
 * asked what it scored. It sends one word per round ("more" or "less"); the
 * server judges it against state the browser has never seen and counts the
 * streak itself. There is no number a player can assert.
 *
 * That is a direct answer to the problem `docs/security-and-anti-cheat/`
 * records for the Expo leaderboard (SEC-01), and it is cheap here only because
 * Devvit gives us a server next to the game for free.
 */
import { redis } from '@devvit/web/server';
import { dailySeed, dayKey as dayKeyOf, dayLabel } from '../../shared/daily';
import { POOL } from '../../shared/pool';
import { startRun, type RunRecord } from '../../shared/rounds';
import { RUN_TTL_SECONDS, dayKeyFor, runKeyFor } from './keys';

export type PostDay = {
  /** "2026-08-23" */
  key: string;
  /** "Sun 23 Aug" */
  label: string;
  seed: number;
};

/**
 * The seed and day pinned to a post.
 *
 * Written when the post is created. A post that predates that (or was made by
 * hand while testing) is healed on first read by pinning today's values — done
 * once, so the post keeps one sequence forever rather than silently changing
 * under players at midnight.
 */
export async function readPostDay(postId: string, now = new Date()): Promise<PostDay> {
  const key = dayKeyFor(postId);
  const stored = await redis.hGetAll(key);
  const seed = Number(stored.seed);

  if (stored.key && stored.label && Number.isFinite(seed)) {
    return { key: stored.key, label: stored.label, seed };
  }

  const fresh: PostDay = {
    key: dayKeyOf(now),
    label: dayLabel(now),
    seed: dailySeed(now),
  };
  await pinPostDay(postId, fresh);
  return fresh;
}

export async function pinPostDay(postId: string, day: PostDay): Promise<void> {
  await redis.hSet(dayKeyFor(postId), {
    key: day.key,
    label: day.label,
    seed: String(day.seed),
  });
}

/**
 * The player's run, started if they do not have one.
 *
 * A stored run is parsed rather than trusted: it may have been written by an
 * older release whose `GameState` had a different shape, and the honest
 * recovery is a fresh run rather than a crash mid-tap.
 */
export async function loadOrStartRun(
  postId: string,
  userId: string,
  seed: number,
): Promise<RunRecord> {
  const stored = await redis.get(runKeyFor(postId, userId));
  const parsed = parseRun(stored);
  if (parsed) return parsed;

  const fresh = startRun(POOL, seed);
  await saveRun(postId, userId, fresh);
  return fresh;
}

export async function loadRun(postId: string, userId: string): Promise<RunRecord | null> {
  return parseRun(await redis.get(runKeyFor(postId, userId)));
}

export async function saveRun(
  postId: string,
  userId: string,
  record: RunRecord,
): Promise<void> {
  const key = runKeyFor(postId, userId);
  await redis.set(key, JSON.stringify(record));
  await redis.expire(key, RUN_TTL_SECONDS);
}

export async function clearRun(postId: string, userId: string): Promise<void> {
  await redis.del(runKeyFor(postId, userId));
}

function parseRun(raw: string | undefined): RunRecord | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;

    const record = value as Partial<RunRecord>;
    if (record.v !== 1) return null;
    if (typeof record.round !== 'number' || !Number.isInteger(record.round)) return null;

    const state = record.state;
    if (!state || typeof state !== 'object') return null;
    if (!state.left?.id || !state.right?.id) return null;
    if (typeof state.streak !== 'number') return null;

    return record as RunRecord;
  } catch {
    return null;
  }
}
