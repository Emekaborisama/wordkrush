import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { newRun, reducer, type GameState } from './engine';
import { isGameState, isResumable, matchesDataset } from './persistence';
import type { Item } from './types';

const category = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../data/categories/wikipedia-popularity.json', import.meta.url)),
    'utf8',
  ),
);
const pool: Item[] = category.items;

function midRun(): GameState {
  let state = newRun(pool, 5);
  for (let i = 0; i < 3; i++) {
    const choice = state.right.value > state.left.value ? 'more' : 'less';
    state = reducer(state, { type: 'guess', choice }, pool);
    state = reducer(state, { type: 'next' }, pool);
  }
  return state;
}

describe('isGameState', () => {
  it('accepts a real in-progress run', () => {
    expect(isGameState(midRun())).toBe(true);
  });

  it('rejects malformed shapes', () => {
    const state = midRun();
    expect(isGameState(null)).toBe(false);
    expect(isGameState({ ...state, left: null })).toBe(false);
    expect(isGameState({ ...state, streak: -1 })).toBe(false);
    expect(isGameState({ ...state, streak: 2.5 })).toBe(false);
    expect(isGameState({ ...state, status: 'nonsense' })).toBe(false);
    expect(isGameState({ ...state, seenIds: [1, 2] })).toBe(false);
    expect(isGameState({ ...state, left: { ...state.left, value: -5 } })).toBe(false);
  });
});

describe('matchesDataset', () => {
  it('accepts a run whose items still exist unchanged', () => {
    expect(matchesDataset(midRun(), pool)).toBe(true);
  });

  it('rejects a run referencing an item no longer in the pool', () => {
    const state = midRun();
    const without = pool.filter((i) => i.id !== state.left.id);
    expect(matchesDataset(state, without)).toBe(false);
  });

  it('rejects a run whose values have since changed', () => {
    // Content is regenerated between releases. Resuming against stale numbers
    // would let a player answer about figures the app no longer shows.
    const state = midRun();
    const shifted = pool.map((i) => (i.id === state.left.id ? { ...i, value: i.value * 2 } : i));
    expect(matchesDataset(state, shifted)).toBe(false);
  });
});

describe('isResumable', () => {
  it('resumes a live run with progress', () => {
    expect(isResumable(midRun())).toBe(true);
  });

  it('does not resume a finished run', () => {
    // It was already scored; reopening it would let the streak count twice.
    const state = midRun();
    expect(isResumable({ ...state, status: 'over' })).toBe(false);
  });

  it('does not resume a run with nothing achieved yet', () => {
    expect(isResumable(newRun(pool, 1))).toBe(false);
  });
});

describe('restore action', () => {
  it('lands on playing so a run saved mid-reveal is not stuck', () => {
    const state = midRun();
    const saved: GameState = { ...state, status: 'revealed', lastGuessCorrect: true };
    const restored = reducer(state, { type: 'restore', state: saved }, pool);
    expect(restored.status).toBe('playing');
    expect(restored.lastGuessCorrect).toBeNull();
  });

  it('preserves streak and pair', () => {
    const saved = midRun();
    const restored = reducer(newRun(pool, 1), { type: 'restore', state: saved }, pool);
    expect(restored.streak).toBe(saved.streak);
    expect(restored.left.id).toBe(saved.left.id);
    expect(restored.right.id).toBe(saved.right.id);
  });
});
