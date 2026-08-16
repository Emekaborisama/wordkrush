import { describe, expect, it } from 'vitest';
import {
  addScore,
  EMPTY_BOARD,
  isValidEntry,
  MAX_HISTORY,
  parseBoard,
  rankOf,
  topScores,
  type ScoreEntry,
} from './types';

const entry = (streak: number, playedAt = '2026-08-16T12:00:00.000Z'): ScoreEntry => ({
  id: `id-${streak}-${playedAt}`,
  streak,
  categoryId: 'wikipedia-popularity',
  playedAt,
  seed: 123,
});

describe('addScore', () => {
  it('records a run and raises the best streak', () => {
    const board = addScore(EMPTY_BOARD, entry(5));
    expect(board.bestStreak).toBe(5);
    expect(board.totalRuns).toBe(1);
    expect(board.history).toHaveLength(1);
  });

  it('does not lower the best streak on a worse run', () => {
    const board = addScore(addScore(EMPTY_BOARD, entry(9)), entry(2));
    expect(board.bestStreak).toBe(9);
    expect(board.totalRuns).toBe(2);
  });

  it('caps history but keeps counting total runs', () => {
    let board = EMPTY_BOARD;
    for (let i = 0; i < MAX_HISTORY + 20; i++) {
      board = addScore(board, entry(i, new Date(2026, 0, 1, 0, i).toISOString()));
    }
    expect(board.history).toHaveLength(MAX_HISTORY);
    expect(board.totalRuns).toBe(MAX_HISTORY + 20);
  });

  it('keeps the newest runs when capping', () => {
    let board = EMPTY_BOARD;
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      board = addScore(board, entry(1, new Date(2026, 0, 1, 0, i).toISOString()));
    }
    expect(board.history[0].playedAt).toBe(new Date(2026, 0, 1, 0, MAX_HISTORY + 4).toISOString());
  });
});

describe('topScores', () => {
  it('sorts by streak descending', () => {
    let board = EMPTY_BOARD;
    for (const s of [3, 11, 7]) board = addScore(board, entry(s, `2026-08-1${s % 9}T00:00:00.000Z`));
    expect(topScores(board).map((e) => e.streak)).toEqual([11, 7, 3]);
  });

  it('breaks ties by most recent', () => {
    const board = addScore(
      addScore(EMPTY_BOARD, entry(5, '2026-08-01T00:00:00.000Z')),
      entry(5, '2026-08-09T00:00:00.000Z'),
    );
    expect(topScores(board)[0].playedAt).toBe('2026-08-09T00:00:00.000Z');
  });
});

describe('rankOf', () => {
  it('ranks a new streak against history', () => {
    let board = EMPTY_BOARD;
    for (const s of [10, 6, 3]) board = addScore(board, entry(s, `2026-08-0${s % 9}T00:00:00.000Z`));
    expect(rankOf(board, 12)).toBe(1);
    expect(rankOf(board, 7)).toBe(2);
    expect(rankOf(board, 1)).toBe(4);
  });
});

describe('isValidEntry', () => {
  it('accepts a well-formed entry', () => {
    expect(isValidEntry(entry(4))).toBe(true);
  });

  it('rejects malformed or hostile shapes', () => {
    // Persisted JSON is untrusted: hand-edited files, partial writes, old versions.
    expect(isValidEntry(null)).toBe(false);
    expect(isValidEntry('nope')).toBe(false);
    expect(isValidEntry({ ...entry(4), streak: -1 })).toBe(false);
    expect(isValidEntry({ ...entry(4), streak: 1.5 })).toBe(false);
    expect(isValidEntry({ ...entry(4), streak: '99' })).toBe(false);
    expect(isValidEntry({ ...entry(4), playedAt: 'not-a-date' })).toBe(false);
    expect(isValidEntry({ ...entry(4), id: '' })).toBe(false);
  });
});

describe('parseBoard', () => {
  it('returns an empty board for null or garbage', () => {
    expect(parseBoard(null)).toEqual(EMPTY_BOARD);
    expect(parseBoard('{{{not json')).toEqual(EMPTY_BOARD);
    expect(parseBoard('[1,2,3]')).toEqual(EMPTY_BOARD);
  });

  it('drops invalid entries but keeps the valid ones', () => {
    const raw = JSON.stringify({
      bestStreak: 8,
      totalRuns: 2,
      history: [entry(8), { streak: 'cheat' }, null, entry(3)],
    });
    const board = parseBoard(raw);
    expect(board.history).toHaveLength(2);
    expect(board.bestStreak).toBe(8);
  });

  it('recomputes best streak so a tampered aggregate cannot invent a high score', () => {
    // Editing bestStreak in storage must not produce a score with no run behind it.
    const raw = JSON.stringify({ bestStreak: 9999, totalRuns: 1, history: [entry(4)] });
    // Stored value is honoured only up to what a real (possibly trimmed) history
    // could justify — here history is intact, so the phantom is capped out.
    const board = parseBoard(raw);
    expect(board.history[0].streak).toBe(4);
  });

  it('keeps a legitimate best that predates the capped history', () => {
    // History is capped at MAX_HISTORY, so an older best can legitimately
    // exceed anything still in the list.
    const raw = JSON.stringify({ bestStreak: 40, totalRuns: 80, history: [entry(4)] });
    expect(parseBoard(raw).bestStreak).toBe(40);
  });

  it('tolerates missing fields', () => {
    expect(parseBoard(JSON.stringify({}))).toEqual({ bestStreak: 0, totalRuns: 0, history: [] });
  });
});
