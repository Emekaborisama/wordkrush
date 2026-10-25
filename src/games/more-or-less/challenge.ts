/**
 * Challenge a friend: a shared Higher or Lower result carries the run's seed
 * and level, and whoever opens the link plays the same pairs in the same
 * order against that streak. Pure; the share payload and the app supply the
 * data.
 */
import type { ShareData } from '../share-data';

export type ChallengePath = 'world' | 'lagos';

/** What a shared run carries so a friend can replay it. */
export type ChallengeRun = { seed: number; path: ChallengePath; level: number };

/** A challenge someone received: the run to replay and the streak to beat. */
export type Challenge = ChallengeRun & { target: number };

export type ChallengeVerdict = 'won' | 'tied' | 'lost';

const isCount = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;

/** Reads a challenge out of a decoded share; `null` for any other share or a malformed one. */
export function challengeFromShare(data: ShareData | null): Challenge | null {
  if (!data || data.game !== 'more-or-less' || !data.challenge) return null;
  const { seed, path, level } = data.challenge;
  if (!isCount(seed, 0xffffffff) || !isCount(level, 99) || level < 1) return null;
  if (path !== 'world' && path !== 'lagos') return null;
  if (!isCount(data.streak, 10_000)) return null;
  return { seed, path, level, target: data.streak };
}

/** The share token in a `/share/<token>` address, if the page is one. */
export function shareTokenFromPath(pathname: string): string | null {
  const match = /^\/share\/([A-Za-z0-9_~=%-]+)\/?$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

export function challengeVerdict(target: number, streak: number): ChallengeVerdict {
  if (streak > target) return 'won';
  if (streak === target) return 'tied';
  return 'lost';
}
