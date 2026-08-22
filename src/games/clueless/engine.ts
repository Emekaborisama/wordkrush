/**
 * Clueless engine — a pure reducer, same shape as the More or Less engine.
 *
 * All the semantic work happened offline: the puzzle arrives as a list of words
 * ordered by closeness to the secret, so playing is just a lookup. No model, no
 * network, no floating-point similarity at runtime.
 */
import type { CluelessState, Guess, GuessRejection, Puzzle } from './types';

export type Action =
  | { type: 'guess'; word: string }
  | { type: 'dismissRejection' }
  | { type: 'newPuzzle'; puzzleNumber: number }
  /** Replace state wholesale when resuming a saved session. */
  | { type: 'restore'; state: CluelessState };

/** Puzzle data plus the vocabulary, prepared once so guessing is O(1). */
export type PuzzleIndex = {
  puzzle: Puzzle;
  /** word -> rank (1-based). Only covers the ranks we ship. */
  rankOf: Map<string, number>;
  /** Every valid word, including ones ranked beyond the shipped data. */
  vocabulary: Set<string>;
};

export function indexPuzzle(puzzle: Puzzle, vocabulary: string[]): PuzzleIndex {
  const rankOf = new Map<string, number>();
  puzzle.ranked.forEach((word, i) => rankOf.set(word, i + 1));
  return { puzzle, rankOf, vocabulary: new Set(vocabulary) };
}

/**
 * Normalises player input.
 *
 * Guesses arrive with stray capitals, spaces, and — on iOS especially —
 * smart quotes from autocorrect. Normalising here rather than in the UI means
 * the same rules apply however the word gets submitted.
 */
export function normalizeGuess(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z']/g, '');
}

export function newPuzzle(puzzleNumber: number): CluelessState {
  return {
    puzzleNumber,
    guesses: [],
    status: 'playing',
    lastWord: null,
    rejection: null,
  };
}

/** Best first. Unranked (too cold to have shipped a rank) sinks to the bottom. */
export function sortGuesses(guesses: Guess[]): Guess[] {
  return [...guesses].sort((a, b) => {
    if (a.rank === null && b.rank === null) return a.word.localeCompare(b.word);
    if (a.rank === null) return 1;
    if (b.rank === null) return -1;
    return a.rank - b.rank;
  });
}

export function reducer(state: CluelessState, action: Action, index: PuzzleIndex): CluelessState {
  switch (action.type) {
    case 'newPuzzle':
      return newPuzzle(action.puzzleNumber);

    case 'restore':
      // Re-sort on restore rather than trusting stored order: the ordering
      // rule could change between app versions, and a mis-sorted list would
      // silently misrepresent which guess was closest.
      return { ...action.state, guesses: sortGuesses(action.state.guesses) };

    case 'dismissRejection':
      return state.rejection ? { ...state, rejection: null } : state;

    case 'guess': {
      // Ignore input after a win — otherwise the guess count keeps climbing
      // past the score that was already recorded.
      if (state.status === 'won') return state;

      const word = normalizeGuess(action.word);
      if (word.length === 0) {
        return { ...state, rejection: { kind: 'empty' } };
      }

      const existing = state.guesses.find((g) => g.word === word);
      if (existing) {
        // Not an error exactly — re-guessing is usually a memory slip, so point
        // at the answer already on screen rather than scolding.
        const rejection: GuessRejection = {
          kind: 'already-guessed',
          word,
          rank: existing.rank,
        };
        return { ...state, rejection, lastWord: word };
      }

      if (!index.vocabulary.has(word)) {
        return { ...state, rejection: { kind: 'not-a-word', word } };
      }

      // In the vocabulary but outside the shipped ranks: a real word, just cold.
      const rank = index.rankOf.get(word) ?? null;
      const guesses = sortGuesses([...state.guesses, { word, rank }]);

      return {
        puzzleNumber: state.puzzleNumber,
        guesses,
        status: rank === 1 ? 'won' : 'playing',
        lastWord: word,
        rejection: null,
      };
    }
  }
}

/** Score for this game is guesses used — LOWER is better (registry: scoreDirection). */
export function guessCount(state: CluelessState): number {
  return state.guesses.length;
}

/**
 * How close the player currently is, as a 0..1 progress value.
 *
 * Rank is wildly non-linear — going from 4000 to 400 feels like nothing, while
 * 10 to 1 is everything — so progress is computed on a log scale. A linear bar
 * would sit at zero for almost the whole game.
 */
export function closeness(rank: number | null, rankedCount: number): number {
  if (rank === null) return 0;
  if (rank <= 1) return 1;
  const t = Math.log(rank) / Math.log(rankedCount);
  return Math.max(0, Math.min(1, 1 - t));
}

export function bestRank(state: CluelessState): number | null {
  const ranked = state.guesses.filter((g) => g.rank !== null);
  return ranked.length ? Math.min(...ranked.map((g) => g.rank as number)) : null;
}
