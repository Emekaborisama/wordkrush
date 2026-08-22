/**
 * Clueless domain types. Pure data — no React, no I/O.
 */

export type Puzzle = {
  number: number;
  secret: string;
  vocabSize: number;
  rankedCount: number;
  /** Index + 1 = the rank shown to the player. ranked[0] is always the secret. */
  ranked: string[];
};

/** A word the player submitted, with how close it turned out to be. */
export type Guess = {
  word: string;
  /**
   * 1 = the secret word. Larger = further away in meaning.
   * `null` means the word is in the vocabulary but ranked beyond the data we
   * ship — a real word, just very cold.
   */
  rank: number | null;
};

export type GuessRejection =
  | { kind: 'empty' }
  | { kind: 'not-a-word'; word: string }
  | { kind: 'already-guessed'; word: string; rank: number | null };

export type CluelessState = {
  puzzleNumber: number;
  /** Sorted best (rank 1) first. Unranked words sink to the bottom. */
  guesses: Guess[];
  status: 'playing' | 'won';
  /** The word just submitted, so the UI can flash it in the list. */
  lastWord: string | null;
  /** Why the last submission bounced, if it did. Cleared on the next valid guess. */
  rejection: GuessRejection | null;
};

/** Everything past this is shown as "cold" rather than an exact number. */
export const BEYOND_RANKS = null;
