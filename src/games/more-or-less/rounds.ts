/**
 * Solo More or Less label rounds.
 *
 * A round is one queued set of Wikipedia names. The player stays on that set
 * until every name has been shown (across runs). The calendar does not advance
 * them — only exhausting the set does. Pure data; persistence lives next door.
 */
import type { Category, Item } from './types';

export type LabelRoundDef = {
  id: string;
  itemIds: string[];
};

export type CategorySnapshot = Category & {
  provisional?: boolean;
  rounds?: LabelRoundDef[];
};

export type LabelRoundProgress = {
  currentRoundId: string;
  seenItemIds: string[];
  roundsPassed: number;
};

export type ResolvedRound = {
  round: LabelRoundDef;
  items: Item[];
  index: number;
  total: number;
  seenCount: number;
  remaining: number;
  complete: boolean;
  caughtUp: boolean;
  preferUnseenIds: string[];
};

export const EMPTY_PROGRESS: LabelRoundProgress = {
  currentRoundId: '',
  seenItemIds: [],
  roundsPassed: 0,
};

export function snapshotRounds(snapshot: CategorySnapshot): LabelRoundDef[] {
  if (snapshot.rounds && snapshot.rounds.length > 0) return snapshot.rounds;
  return [{ id: 'round-1', itemIds: snapshot.items.map((item) => item.id) }];
}

export function itemsForRound(snapshot: CategorySnapshot, round: LabelRoundDef): Item[] {
  const byId = new Map(snapshot.items.map((item) => [item.id, item]));
  return round.itemIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

/** Reddit and team races share one pool: the newest published round. */
export function latestRoundItems(snapshot: CategorySnapshot): Item[] {
  const rounds = snapshotRounds(snapshot);
  const last = rounds[rounds.length - 1];
  if (!last) return snapshot.items;
  const items = itemsForRound(snapshot, last);
  return items.length >= 2 ? items : snapshot.items;
}

export function isRoundComplete(seenItemIds: readonly string[], roundItemIds: readonly string[]): boolean {
  if (roundItemIds.length === 0) return false;
  const seen = new Set(seenItemIds);
  return roundItemIds.every((id) => seen.has(id));
}

export function emptyProgress(firstRoundId: string): LabelRoundProgress {
  return { currentRoundId: firstRoundId, seenItemIds: [], roundsPassed: 0 };
}

export function isValidProgress(value: unknown): value is LabelRoundProgress {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.currentRoundId === 'string' &&
    row.currentRoundId.length > 0 &&
    Array.isArray(row.seenItemIds) &&
    row.seenItemIds.every((id) => typeof id === 'string') &&
    typeof row.roundsPassed === 'number' &&
    Number.isInteger(row.roundsPassed) &&
    row.roundsPassed >= 0
  );
}

export function parseProgress(raw: string | null, firstRoundId: string): LabelRoundProgress {
  if (!raw) return emptyProgress(firstRoundId);
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidProgress(parsed) ? parsed : emptyProgress(firstRoundId);
  } catch {
    return emptyProgress(firstRoundId);
  }
}

function roundIndex(rounds: LabelRoundDef[], id: string): number {
  return rounds.findIndex((round) => round.id === id);
}

/**
 * If the current id vanished from the snapshot (a content rewrite), land on
 * the first round the player has not yet cleared, or the last one.
 */
export function locateProgress(
  progress: LabelRoundProgress,
  rounds: LabelRoundDef[],
): LabelRoundProgress {
  if (rounds.length === 0) return progress;
  if (roundIndex(rounds, progress.currentRoundId) >= 0) return progress;
  const next = rounds.find((round) => !isRoundComplete(progress.seenItemIds, round.itemIds));
  return {
    ...progress,
    currentRoundId: (next ?? rounds[rounds.length - 1]).id,
    seenItemIds: next ? [] : [...(rounds[rounds.length - 1]?.itemIds ?? [])],
  };
}

export function resolveRound(
  snapshot: CategorySnapshot,
  progress: LabelRoundProgress,
): ResolvedRound {
  const rounds = snapshotRounds(snapshot);
  const located = locateProgress(progress, rounds);
  const index = Math.max(0, roundIndex(rounds, located.currentRoundId));
  const round = rounds[index] ?? { id: 'round-1', itemIds: snapshot.items.map((item) => item.id) };
  const items = itemsForRound(snapshot, round);
  const seen = new Set(located.seenItemIds);
  const seenCount = round.itemIds.filter((id) => seen.has(id)).length;
  const complete = isRoundComplete(located.seenItemIds, round.itemIds);
  const last = index >= rounds.length - 1;
  return {
    round,
    items: items.length >= 2 ? items : snapshot.items,
    index,
    total: rounds.length,
    seenCount,
    remaining: Math.max(0, round.itemIds.length - seenCount),
    complete,
    caughtUp: complete && last,
    preferUnseenIds: round.itemIds.filter((id) => !seen.has(id)),
  };
}

export type RecordSeenResult = {
  progress: LabelRoundProgress;
  justPassed: boolean;
  resolved: ResolvedRound;
};

/**
 * Union newly shown item ids into this round. Passing unlocks the next queued
 * set; already-cleared last rounds do not increment again.
 *
 * `allowAdvance` is false while a run is still on screen so the pool cannot
 * swap under the player mid-guess. Game over is the moment it may unlock.
 */
export function recordSeen(
  snapshot: CategorySnapshot,
  progress: LabelRoundProgress,
  shownIds: readonly string[],
  options?: { allowAdvance?: boolean },
): RecordSeenResult {
  const allowAdvance = options?.allowAdvance !== false;
  const rounds = snapshotRounds(snapshot);
  const located = locateProgress(progress, rounds);
  const before = resolveRound(snapshot, located);
  if (before.caughtUp) {
    return { progress: located, justPassed: false, resolved: before };
  }

  const allowed = new Set(before.round.itemIds);
  const seen = new Set(located.seenItemIds);
  for (const id of shownIds) {
    if (allowed.has(id)) seen.add(id);
  }
  const merged: LabelRoundProgress = {
    ...located,
    seenItemIds: [...seen],
  };

  if (!isRoundComplete(merged.seenItemIds, before.round.itemIds)) {
    return { progress: merged, justPassed: false, resolved: resolveRound(snapshot, merged) };
  }

  if (!allowAdvance) {
    return { progress: merged, justPassed: false, resolved: resolveRound(snapshot, merged) };
  }

  const next = rounds[before.index + 1];
  if (!next) {
    const done: LabelRoundProgress = {
      ...merged,
      roundsPassed: located.roundsPassed + 1,
    };
    return { progress: done, justPassed: true, resolved: resolveRound(snapshot, done) };
  }

  const advanced: LabelRoundProgress = {
    currentRoundId: next.id,
    seenItemIds: [],
    roundsPassed: located.roundsPassed + 1,
  };
  return {
    progress: advanced,
    justPassed: true,
    resolved: resolveRound(snapshot, advanced),
  };
}

export function soloCategory(snapshot: CategorySnapshot, progress: LabelRoundProgress): CategorySnapshot {
  const resolved = resolveRound(snapshot, progress);
  return {
    ...snapshot,
    items: resolved.items,
  };
}

/** Round 1 is "this set"; later rounds are numbered from the player's view. */
export function roundLabel(resolved: ResolvedRound): string {
  return resolved.index === 0 ? 'THIS SET' : `ROUND ${resolved.index + 1}`;
}

export function roundMeta(resolved: ResolvedRound): string {
  if (resolved.caughtUp) {
    return 'You have cleared every set we have. New names drop next week.';
  }
  return 'See every name to unlock the next set. It will not change until you do. New sets are added each week.';
}

export function roundClearedCopy(resolved: ResolvedRound, justPassed: boolean): string {
  if (justPassed && resolved.caughtUp) {
    return 'Set cleared — new names drop next week.';
  }
  if (justPassed) return 'Set cleared — new names unlocked.';
  if (resolved.remaining === 1) return '1 name left in this set.';
  return `${resolved.remaining} names left in this set.`;
}
