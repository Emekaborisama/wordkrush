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

/**
 * When a level's reviewed thematic hint becomes visible. This is level content,
 * not a setting the player chooses.
 */
export const CLUELESS_HINT_POLICIES = ['opening', 'guess_threshold', 'none'] as const;
export type CluelessHintPolicy = (typeof CLUELESS_HINT_POLICIES)[number];

/**
 * Score contexts retained from the former difficulty picker. Assistance still
 * changes how comparable guess counts are, so completed runs stay partitioned
 * even though the path now selects the assistance policy.
 */
export const CLUELESS_ASSISTANCE_CONTEXTS = ['easy', 'standard', 'expert'] as const;
export type CluelessAssistanceContext = (typeof CLUELESS_ASSISTANCE_CONTEXTS)[number];

/** @deprecated Use `CluelessAssistanceContext` for persisted score context. */
export type CluelessDifficulty = CluelessAssistanceContext;

export function hintPolicyForAssistanceContext(
  context: CluelessAssistanceContext,
): CluelessHintPolicy {
  switch (context) {
    case 'easy':
      return 'opening';
    case 'standard':
      return 'guess_threshold';
    case 'expert':
      return 'none';
  }
}

export function assistanceContextForHintPolicy(
  policy: CluelessHintPolicy,
): CluelessAssistanceContext {
  switch (policy) {
    case 'opening':
      return 'easy';
    case 'guess_threshold':
      return 'standard';
    case 'none':
      return 'expert';
  }
}

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
  /** Set by the current level before play starts. */
  hintPolicy: CluelessHintPolicy;
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
