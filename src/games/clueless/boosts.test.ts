import { describe, expect, it } from 'vitest';
import { indexPuzzle, newPuzzle, type PuzzleIndex } from './engine';
import { warmerWord } from './boosts';
import type { CluelessState, Puzzle } from './types';

function puzzleIndex(): PuzzleIndex {
  const ranked = Array.from({ length: 400 }, (_, index) => {
    if (index === 0) return 'library';
    if (index === 1) return 'libraries';
    if (index === 2) return 'lib';
    if (index === 9) return 'libraria';
    if (index === 11) return 'mylibrary';
    return `word${index + 1}`;
  });
  const puzzle: Puzzle = {
    number: 31,
    secret: 'library',
    vocabSize: ranked.length,
    rankedCount: ranked.length,
    ranked,
  };
  return indexPuzzle(puzzle, ranked);
}

function playing(index: PuzzleIndex, guesses: CluelessState['guesses'] = []): CluelessState {
  return { ...newPuzzle(31), guesses };
}

describe('warmerWord', () => {
  it('aims near rank 300 when nothing has been guessed', () => {
    const index = puzzleIndex();
    const word = warmerWord(playing(index), index);
    expect(word).toBe('word300');
    expect(index.puzzle.ranked.indexOf(word!) + 1).toBe(300);
  });

  it('aims at max(10, floor(best / 3)) and stays warmer than the best guess', () => {
    const index = puzzleIndex();
    const state = playing(index, [{ word: 'word30', rank: 30 }]);
    // Rank 10 is `libraria`, which shares the secret's first four letters.
    expect(warmerWord(state, index)).toBe('word11');
    const rank = index.puzzle.ranked.indexOf('word11') + 1;
    expect(rank).toBeGreaterThanOrEqual(10);
    expect(rank).toBeLessThan(30);
  });

  it('never returns the secret, a rank under 10, a shared prefix, or a container', () => {
    const index = puzzleIndex();
    const word = warmerWord(playing(index, [{ word: 'word40', rank: 40 }]), index);
    expect(word).not.toBeNull();
    expect(word).not.toBe('library');
    expect(word!.slice(0, 4)).not.toBe('libr');
    expect(word!.includes('library')).toBe(false);
    expect(index.puzzle.ranked.indexOf(word!) + 1).toBeGreaterThanOrEqual(10);
    expect(['libraries', 'lib', 'libraria', 'mylibrary']).not.toContain(word);
  });

  it('returns null when nothing warmer than rank 10 is legal', () => {
    const index = puzzleIndex();
    const state = playing(index, [{ word: 'word9', rank: 9 }]);
    expect(warmerWord(state, index)).toBeNull();
  });

  it('skips a word that is already guessed or missing from the vocabulary', () => {
    const index = puzzleIndex();
    index.vocabulary.delete('word300');
    const word = warmerWord(playing(index), index);
    expect(word).toBe('word301');
    const guessed = playing(index, [{ word: 'word301', rank: 301 }]);
    expect(warmerWord(guessed, index)).not.toBe('word301');
  });

  it('does not change state and does nothing after a solve', () => {
    const index = puzzleIndex();
    const state = playing(index);
    warmerWord(state, index);
    expect(state.guesses).toEqual([]);
    expect(warmerWord({ ...state, status: 'won' }, index)).toBeNull();
    expect(warmerWord(state, index)).toBe(warmerWord(state, index));
  });
});
