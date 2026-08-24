import { describe, expect, it } from 'vitest';
import { addScore, EMPTY_BOARD, type ScoreEntry } from '../../scores/types';
import {
  boardForCluelessDifficulty,
  normalizeCluelessScoreContext,
} from './scoring';

function score(id: string, guesses: number, context: string): ScoreEntry {
  return {
    id,
    streak: guesses,
    categoryId: context,
    playedAt: `2026-08-24T00:00:0${id.length}.000Z`,
    seed: 8,
  };
}

describe('Clueless score contexts', () => {
  it('keeps difficulty boards separate and folds legacy runs into Standard', () => {
    let board = EMPTY_BOARD;
    for (const entry of [
      score('easy', 4, 'easy'),
      score('standard', 12, 'standard'),
      score('legacy', 7, 'clueless'),
      score('expert', 20, 'expert'),
    ]) {
      board = addScore(board, entry, 'lower');
    }

    expect(boardForCluelessDifficulty(board, 'easy').history.map((entry) => entry.id)).toEqual([
      'easy',
    ]);
    expect(boardForCluelessDifficulty(board, 'standard').bestStreak).toBe(7);
    expect(boardForCluelessDifficulty(board, 'expert').bestStreak).toBe(20);
  });

  it('normalizes the pre-difficulty context only', () => {
    expect(normalizeCluelessScoreContext('clueless')).toBe('standard');
    expect(normalizeCluelessScoreContext('easy')).toBe('easy');
  });
});
