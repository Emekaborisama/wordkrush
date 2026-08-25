import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROGRESS,
  isRoundComplete,
  latestRoundItems,
  locateProgress,
  parseProgress,
  recordSeen,
  resolveRound,
  roundClearedCopy,
  roundLabel,
  roundMeta,
  snapshotRounds,
  soloCategory,
  type CategorySnapshot,
  type LabelRoundProgress,
} from './rounds';
import type { Item } from './types';

function item(id: string, value: number): Item {
  return { id, categoryId: 'wikipedia-popularity', label: id, value };
}

const items = [
  item('a', 100),
  item('b', 200),
  item('c', 400),
  item('d', 800),
];

const snapshot: CategorySnapshot = {
  id: 'wikipedia-popularity',
  name: 'Popularity',
  metricLabel: 'monthly Wikipedia pageviews',
  unit: 'count',
  items,
  rounds: [
    { id: 'round-1', itemIds: ['a', 'b'] },
    { id: 'round-2', itemIds: ['c', 'd'] },
  ],
};

describe('snapshotRounds / latestRoundItems', () => {
  it('synthesises round-1 from items when the JSON has no rounds yet', () => {
    const bare: CategorySnapshot = { ...snapshot, rounds: undefined };
    expect(snapshotRounds(bare)).toEqual([{ id: 'round-1', itemIds: ['a', 'b', 'c', 'd'] }]);
  });

  it('gives Reddit the newest published round', () => {
    expect(latestRoundItems(snapshot).map((row) => row.id)).toEqual(['c', 'd']);
  });
});

describe('isRoundComplete', () => {
  it('requires every id in the set, not merely most of them', () => {
    expect(isRoundComplete(['a'], ['a', 'b'])).toBe(false);
    expect(isRoundComplete(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(isRoundComplete(['a', 'b', 'extra'], ['a', 'b'])).toBe(true);
  });
});

describe('parseProgress', () => {
  it('falls back to the first round on null or garbage', () => {
    expect(parseProgress(null, 'round-1')).toEqual({
      currentRoundId: 'round-1',
      seenItemIds: [],
      roundsPassed: 0,
    });
    expect(parseProgress('{nope', 'round-1').currentRoundId).toBe('round-1');
  });
});

describe('locateProgress', () => {
  it('keeps a still-published current round', () => {
    const progress: LabelRoundProgress = {
      currentRoundId: 'round-2',
      seenItemIds: ['c'],
      roundsPassed: 1,
    };
    expect(locateProgress(progress, snapshot.rounds!).currentRoundId).toBe('round-2');
  });

  it('lands on the first uncleared round when the id disappeared', () => {
    const progress: LabelRoundProgress = {
      currentRoundId: 'round-gone',
      seenItemIds: [],
      roundsPassed: 0,
    };
    expect(locateProgress(progress, snapshot.rounds!).currentRoundId).toBe('round-1');
  });
});

describe('recordSeen', () => {
  it('holds the same set until every name has been shown', () => {
    const start = EMPTY_PROGRESS.currentRoundId
      ? EMPTY_PROGRESS
      : { currentRoundId: 'round-1', seenItemIds: [], roundsPassed: 0 };
    const once = recordSeen(snapshot, start, ['a']);
    expect(once.justPassed).toBe(false);
    expect(once.progress.currentRoundId).toBe('round-1');
    expect(once.resolved.seenCount).toBe(1);
    expect(once.resolved.remaining).toBe(1);

    const done = recordSeen(snapshot, once.progress, ['b']);
    expect(done.justPassed).toBe(true);
    expect(done.progress.currentRoundId).toBe('round-2');
    expect(done.progress.roundsPassed).toBe(1);
    expect(done.progress.seenItemIds).toEqual([]);
  });

  it('does not increment again after the last queued set is cleared', () => {
    const last: LabelRoundProgress = {
      currentRoundId: 'round-2',
      seenItemIds: ['c'],
      roundsPassed: 1,
    };
    const cleared = recordSeen(snapshot, last, ['d']);
    expect(cleared.justPassed).toBe(true);
    expect(cleared.resolved.caughtUp).toBe(true);
    expect(cleared.progress.roundsPassed).toBe(2);

    const again = recordSeen(snapshot, cleared.progress, ['c', 'd']);
    expect(again.justPassed).toBe(false);
    expect(again.progress.roundsPassed).toBe(2);
  });

  it('ignores ids that are not in the current set', () => {
    const start: LabelRoundProgress = {
      currentRoundId: 'round-1',
      seenItemIds: [],
      roundsPassed: 0,
    };
    const next = recordSeen(snapshot, start, ['c', 'a']);
    expect(next.progress.seenItemIds).toEqual(['a']);
    expect(next.justPassed).toBe(false);
  });

  it('can mark the set complete without unlocking until game over', () => {
    const start: LabelRoundProgress = {
      currentRoundId: 'round-1',
      seenItemIds: ['a'],
      roundsPassed: 0,
    };
    const mid = recordSeen(snapshot, start, ['b'], { allowAdvance: false });
    expect(mid.justPassed).toBe(false);
    expect(mid.progress.currentRoundId).toBe('round-1');
    expect(mid.resolved.complete).toBe(true);
  });
});

describe('soloCategory', () => {
  it('narrows the pool to the current round', () => {
    const progress: LabelRoundProgress = {
      currentRoundId: 'round-1',
      seenItemIds: [],
      roundsPassed: 0,
    };
    expect(soloCategory(snapshot, progress).items.map((row) => row.id)).toEqual(['a', 'b']);
  });
});

describe('copy', () => {
  it('explains the gate on the first set and numbers later rounds', () => {
    const first = resolveRound(snapshot, {
      currentRoundId: 'round-1',
      seenItemIds: ['a'],
      roundsPassed: 0,
    });
    expect(roundLabel(first)).toBe('THIS SET');
    expect(roundMeta(first)).toContain('will not change until you do');
    expect(roundClearedCopy(first, false)).toBe('1 name left in this set.');

    const second = resolveRound(snapshot, {
      currentRoundId: 'round-2',
      seenItemIds: [],
      roundsPassed: 1,
    });
    expect(roundLabel(second)).toBe('ROUND 2');
  });
});
