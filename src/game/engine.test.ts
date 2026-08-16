import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isCorrect, newRun, reducer, selectChallenger, type GameState } from './engine';
import { isFairPair } from './pairing';
import { nextRandom, seedFromDate } from './rng';
import type { Item } from './types';

// Run against the REAL shipped dataset, not fixtures: a synthetic pool can
// hide the exact flatness problems the engine has to survive.
const category = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/categories/wikipedia-popularity.json', import.meta.url)),
    'utf8',
  ),
);
const pool: Item[] = category.items;

const play = (state: GameState, choice: 'more' | 'less') => reducer(state, { type: 'guess', choice }, pool);
const advance = (state: GameState) => reducer(state, { type: 'next' }, pool);

/** Play optimally — always guess correctly — for n rounds. */
function playPerfect(state: GameState, rounds: number): GameState {
  for (let i = 0; i < rounds; i++) {
    const choice = state.right.value > state.left.value ? 'more' : 'less';
    state = play(state, choice);
    if (state.status === 'over') break;
    state = advance(state);
  }
  return state;
}

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    expect(nextRandom(123)).toEqual(nextRandom(123));
  });

  it('produces values in [0, 1)', () => {
    let seed = 42;
    for (let i = 0; i < 500; i++) {
      const [value, next] = nextRandom(seed);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      seed = next;
    }
  });

  it('gives the same seed for the same calendar day', () => {
    const a = seedFromDate(new Date('2026-08-16T01:00:00Z'));
    const b = seedFromDate(new Date('2026-08-16T23:00:00Z'));
    expect(a).toBe(b);
    expect(a).not.toBe(seedFromDate(new Date('2026-08-17T01:00:00Z')));
  });
});

describe('newRun', () => {
  it('starts with a fair pair and zero streak', () => {
    const state = newRun(pool, 1);
    expect(state.streak).toBe(0);
    expect(state.status).toBe('playing');
    expect(isFairPair(state.left, state.right)).toBe(true);
  });

  it('is fully reproducible from its seed', () => {
    expect(newRun(pool, 99)).toEqual(newRun(pool, 99));
  });

  it('carries the previous best streak forward', () => {
    expect(newRun(pool, 1, 7).bestStreak).toBe(7);
  });
});

describe('isCorrect', () => {
  const left = { value: 100 } as Item;
  it('judges MORE', () => {
    expect(isCorrect(left, { value: 200 } as Item, 'more')).toBe(true);
    expect(isCorrect(left, { value: 50 } as Item, 'more')).toBe(false);
  });
  it('judges LESS', () => {
    expect(isCorrect(left, { value: 50 } as Item, 'less')).toBe(true);
    expect(isCorrect(left, { value: 200 } as Item, 'less')).toBe(false);
  });
});

describe('reducer', () => {
  it('increments the streak on a correct guess and pauses for the reveal', () => {
    const state = newRun(pool, 5);
    const correct = state.right.value > state.left.value ? 'more' : 'less';
    const after = play(state, correct);
    expect(after.streak).toBe(1);
    expect(after.status).toBe('revealed');
    expect(after.lastGuessCorrect).toBe(true);
  });

  it('ends the run on a wrong guess without incrementing', () => {
    const state = newRun(pool, 5);
    const wrong = state.right.value > state.left.value ? 'less' : 'more';
    const after = play(state, wrong);
    expect(after.streak).toBe(0);
    expect(after.status).toBe('over');
    expect(after.lastGuessCorrect).toBe(false);
  });

  it('ignores a second guess during the reveal', () => {
    // Without this guard a fast double-tap scores twice off one card.
    const state = newRun(pool, 5);
    const correct = state.right.value > state.left.value ? 'more' : 'less';
    const once = play(state, correct);
    expect(play(once, correct)).toEqual(once);
  });

  it('ignores guesses once the run is over', () => {
    const state = newRun(pool, 5);
    const wrong = state.right.value > state.left.value ? 'less' : 'more';
    const over = play(state, wrong);
    expect(play(over, 'more')).toEqual(over);
  });

  it('ignores `next` unless a reveal is showing', () => {
    const state = newRun(pool, 5);
    expect(advance(state)).toEqual(state);
  });

  it('carries the winner into the left slot', () => {
    const state = newRun(pool, 5);
    const correct = state.right.value > state.left.value ? 'more' : 'less';
    const next = advance(play(state, correct));
    expect(next.left.id).toBe(state.right.id);
    expect(next.right.id).not.toBe(state.right.id);
    expect(next.status).toBe('playing');
  });

  it('tracks best streak across a losing run', () => {
    let state = playPerfect(newRun(pool, 7), 5);
    expect(state.bestStreak).toBe(5);
    const wrong = state.right.value > state.left.value ? 'less' : 'more';
    state = play(state, wrong);
    expect(state.status).toBe('over');
    expect(state.bestStreak).toBe(5);
  });

  it('preserves best streak into the next run', () => {
    const finished = playPerfect(newRun(pool, 7), 4);
    const fresh = reducer(finished, { type: 'newRun', seed: 8 }, pool);
    expect(fresh.bestStreak).toBe(4);
    expect(fresh.streak).toBe(0);
  });
});

describe('long runs', () => {
  it('survives 200 perfect rounds without deadlocking', () => {
    // The real failure mode: the pool runs dry, or no candidate fits the
    // narrowing band, and selection throws mid-game.
    const state = playPerfect(newRun(pool, 3), 200);
    expect(state.streak).toBe(200);
    // playPerfect advances past each reveal, so it ends mid-round.
    expect(state.status).toBe('playing');
  });

  it('always presents a fair pair, every round', () => {
    let state = newRun(pool, 11);
    for (let i = 0; i < 150; i++) {
      expect(isFairPair(state.left, state.right), `round ${i}`).toBe(true);
      const choice = state.right.value > state.left.value ? 'more' : 'less';
      state = advance(play(state, choice));
    }
  });

  it('never immediately repeats an item', () => {
    let state = newRun(pool, 13);
    for (let i = 0; i < 100; i++) {
      expect(state.left.id).not.toBe(state.right.id);
      const choice = state.right.value > state.left.value ? 'more' : 'less';
      state = advance(play(state, choice));
    }
  });

  it('replays identically from the same seed', () => {
    expect(playPerfect(newRun(pool, 77), 40)).toEqual(playPerfect(newRun(pool, 77), 40));
  });

  it('produces different runs from different seeds', () => {
    const a = newRun(pool, 1);
    const b = newRun(pool, 2);
    expect([a.left.id, a.right.id]).not.toEqual([b.left.id, b.right.id]);
  });
});

describe('selectChallenger', () => {
  it('respects the difficulty band at low streaks', () => {
    // At streak 0 the band is >=3x, and this dataset is wide enough to serve it.
    const anchor = pool.find((i) => i.label === 'Pizza')!;
    const { item } = selectChallenger(pool, anchor, 0, [anchor.id], 1);
    expect(isFairPair(anchor, item)).toBe(true);
  });

  it('throws a diagnostic error when no fair challenger exists', () => {
    const flat: Item[] = [
      { id: 'a', categoryId: 'x', label: 'A', value: 100 },
      { id: 'b', categoryId: 'x', label: 'B', value: 101 },
    ];
    expect(() => selectChallenger(flat, flat[0], 0, [], 1)).toThrow(/too flat/);
  });
});
