/**
 * The rules of a 1v1. Pure, so a match can be asserted without a network.
 *
 * Two players get the same Higher or Lower pairs at the same moment and a
 * minute on the clock. A miss ends your run; the other player plays on. The
 * longer streak wins, and a tie goes to whoever reached it first.
 *
 * Everything a stranger's device sends arrives through the parsers here: the
 * channel is public, so nothing on it is trusted until it has been checked.
 */
import { validateUsername } from '../auth/validation';
import { normalizeCountry } from './country';

export const DUEL_MS = 60_000;
export const COUNTDOWN_MS = 3_000;
/** How long to look for a person before offering a ghost. */
export const GHOST_AFTER_MS = 10_000;
export const HEARTBEAT_MS = 2_500;
/** No word from the other player for this long and they have left. */
export const SILENCE_FORFEIT_MS = 9_000;
/** Far past any real streak in a minute; a bigger claim is a forged message. */
const MAX_STREAK = 200;

export type DuelPlayer = {
  id: string;
  name: string;
  /** ISO code, or `null` when the player hides their flag. */
  country: string | null;
  /** A ghost, not a person. Always shown as one. */
  ghost?: boolean;
};

/** Where one player stands. `atMs` is when they last got one right, into the match. */
export type Progress = { streak: number; done: boolean; atMs: number };

export const START_PROGRESS: Progress = { streak: 0, done: false, atMs: 0 };

export type Verdict = 'won' | 'lost' | 'tied';

/**
 * The result once it is certain, else `null`. It can be certain before the
 * clock: a player who has missed loses the moment the other passes them.
 */
export function settle(me: Progress, them: Progress, clockUp = false): Verdict | null {
  const meDone = me.done || clockUp;
  const themDone = them.done || clockUp;
  if (meDone && themDone) {
    if (me.streak !== them.streak) return me.streak > them.streak ? 'won' : 'lost';
    if (me.streak === 0 || me.atMs === them.atMs) return 'tied';
    return me.atMs < them.atMs ? 'won' : 'lost';
  }
  if (meDone && them.streak > me.streak) return 'lost';
  if (themDone && me.streak > them.streak) return 'won';
  return null;
}

export type Searcher = { key: string; playerId: string; joinedAt: number };

/**
 * Who to pair with, from everyone in the queue: longest-waiting first, in
 * twos, so two devices looking at the same queue reach the same answer. The
 * earlier of a pair hosts. Views can differ for a moment, which is why a pick
 * is confirmed by a handshake rather than assumed.
 */
export function partnerFor(searchers: readonly Searcher[], selfKey: string): { partner: Searcher; host: boolean } | null {
  const self = searchers.find((searcher) => searcher.key === selfKey);
  if (!self) return null;
  const queue = searchers
    .filter((searcher) => searcher.key === selfKey || searcher.playerId !== self.playerId)
    .slice()
    .sort((a, b) => a.joinedAt - b.joinedAt || a.key.localeCompare(b.key));
  const index = queue.findIndex((searcher) => searcher.key === selfKey);
  const partner = queue[index % 2 === 0 ? index + 1 : index - 1];
  return partner ? { partner, host: index % 2 === 0 } : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

/** A player from the wire: a real id, a name that passes the username rules, a real country or none. */
export function parsePlayer(value: unknown): DuelPlayer | null {
  const row = record(value);
  if (!row) return null;
  const { id, name, country } = row;
  if (typeof id !== 'string' || id.length === 0 || id.length > 64) return null;
  if (typeof name !== 'string' || validateUsername(name) !== null) return null;
  return { id, name: name.trim(), country: normalizeCountry(country) };
}

export function parseProgress(value: unknown): Progress | null {
  const row = record(value);
  if (!row) return null;
  const { streak, done, atMs } = row;
  if (typeof streak !== 'number' || !Number.isInteger(streak) || streak < 0 || streak > MAX_STREAK) return null;
  if (typeof done !== 'boolean') return null;
  if (typeof atMs !== 'number' || !Number.isFinite(atMs) || atMs < 0 || atMs > DUEL_MS * 2) return null;
  return { streak, done, atMs };
}

/** A room seed from the wire. */
export function parseSeed(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffffff ? value : null;
}

/** A room code: letters and digits only, since it becomes a channel name and a link. */
export function isRoomCode(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]{6,32}$/.test(value);
}

/** The room in a `/duel/<code>` address, if the page is one. */
export function roomFromPath(pathname: string): string | null {
  const match = /^\/duel\/([a-z0-9]{6,32})\/?$/.exec(pathname);
  return match ? match[1] : null;
}
