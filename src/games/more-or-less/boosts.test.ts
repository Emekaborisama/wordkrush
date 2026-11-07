import { describe, expect, it } from 'vitest';
import { newRun, reducer, type GameState } from './engine';
import { secondChance, skipChallenger } from './boosts';
import type { Item } from './types';

function item(id: string, value: number): Item {
  return { id, categoryId: 'test', label: id, value };
}

const pool = [100, 500, 2500, 12_500, 60_000, 300_000].map((value, index) =>
  item(`n${index}`, value),
);

function lose(state: GameState): GameState {
  const choice = state.right.value > state.left.value ? 'less' : 'more';
  return reducer(state, { type: 'guess', choice }, pool);
}

describe('skipChallenger', () => {
  it('keeps the anchor and streak and counts the new card as seen', () => {
    const playing = newRun(pool, 7);
    const skipped = skipChallenger(playing, pool);
    expect(skipped.status).toBe('playing');
    expect(skipped.left).toEqual(playing.left);
    expect(skipped.streak).toBe(playing.streak);
    expect(skipped.right.id).not.toBe(playing.right.id);
    expect(skipped.seenIds).toEqual([...playing.seenIds, skipped.right.id]);
    expect(skipChallenger(playing, pool)).toEqual(skipChallenger(playing, pool));
  });

  it('does nothing unless a round is waiting for an answer', () => {
    const over = lose(newRun(pool, 3));
    expect(over.status).toBe('over');
    expect(skipChallenger(over, pool)).toBe(over);
  });
});

describe('secondChance', () => {
  it('returns to play with the same anchor and streak', () => {
    const over = lose(newRun(pool, 11));
    const revived = secondChance(over, pool);
    expect(revived.status).toBe('playing');
    expect(revived.left).toEqual(over.left);
    expect(revived.streak).toBe(over.streak);
    expect(revived.bestStreak).toBe(over.bestStreak);
    expect(revived.right.id).not.toBe(over.right.id);
    expect(revived.seenIds).toEqual([...over.seenIds, revived.right.id]);
    expect(revived.lastGuessCorrect).toBeNull();
  });

  it('does nothing while the run is still going', () => {
    const playing = newRun(pool, 5);
    expect(secondChance(playing, pool)).toBe(playing);
  });
});
