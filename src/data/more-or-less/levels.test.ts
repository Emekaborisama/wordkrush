import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { newRun, reducer, type GameState } from '../../games/more-or-less/engine';
import { FAIRNESS_MIN_RATIO } from '../../games/more-or-less/pairing';
import type { Item } from '../../games/more-or-less/types';
import { MORE_OR_LESS_LEVELS, moreOrLessLevelByNumber } from './levels';

const category = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../categories/wikipedia-popularity.json', import.meta.url)),
    'utf8',
  ),
);
const pool: Item[] = category.items;

function playPerfect(state: GameState, rounds: number): GameState {
  for (let i = 0; i < rounds; i++) {
    const choice = state.right.value > state.left.value ? 'more' : 'less';
    state = reducer(state, { type: 'guess', choice }, pool);
    if (state.status === 'over') break;
    state = reducer(state, { type: 'next' }, pool);
  }
  return state;
}

describe('More or Less campaign catalog', () => {
  it('is consecutive from 1 with rising or equal targets', () => {
    expect(MORE_OR_LESS_LEVELS.map((level) => level.number)).toEqual(
      MORE_OR_LESS_LEVELS.map((_, i) => i + 1),
    );
    expect(MORE_OR_LESS_LEVELS.length).toBeGreaterThanOrEqual(8);
    expect(MORE_OR_LESS_LEVELS.length).toBeLessThanOrEqual(12);
    for (let i = 1; i < MORE_OR_LESS_LEVELS.length; i++) {
      expect(MORE_OR_LESS_LEVELS[i].targetStreak).toBeGreaterThanOrEqual(
        MORE_OR_LESS_LEVELS[i - 1].targetStreak - 5,
      );
    }
  });

  it('never asks for a band below the fairness floor', () => {
    for (const level of MORE_OR_LESS_LEVELS) {
      if (!level.band) continue;
      expect(level.band.min).toBeGreaterThanOrEqual(FAIRNESS_MIN_RATIO);
      expect(level.band.max).toBeGreaterThan(level.band.min);
    }
  });

  it('looks up rows by number', () => {
    expect(moreOrLessLevelByNumber(1)?.name).toBe('Warm-up');
    expect(moreOrLessLevelByNumber(99)).toBeUndefined();
  });

  it('can be won on the shipped pool for every target', () => {
    for (const level of MORE_OR_LESS_LEVELS) {
      const finished = playPerfect(newRun(pool, 7, 0, level.band), level.targetStreak);
      expect(finished.status, `level ${level.number}`).not.toBe('over');
      expect(finished.streak, `level ${level.number}`).toBe(level.targetStreak);
    }
  });
});
