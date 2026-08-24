/**
 * Validation for resumed Clueless sessions.
 *
 * Kept separate from the engine so it stays pure and unit-testable, and so the
 * shape check lives next to the type it guards rather than inside a screen.
 */
import {
  CLUELESS_DIFFICULTIES,
  type CluelessDifficulty,
  type CluelessState,
  type Guess,
} from './types';

export type PersistedCluelessState = Omit<CluelessState, 'difficulty'> & {
  /** Missing on sessions saved before difficulty modes shipped. */
  difficulty?: CluelessDifficulty;
};

function isGuess(value: unknown): value is Guess {
  if (typeof value !== 'object' || value === null) return false;
  const g = value as Record<string, unknown>;
  if (typeof g.word !== 'string' || g.word.length === 0) return false;
  if (g.rank === null) return true;
  return typeof g.rank === 'number' && Number.isInteger(g.rank) && g.rank >= 1;
}

export function isCluelessState(value: unknown): value is PersistedCluelessState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  const validDifficulty =
    s.difficulty === undefined ||
    (typeof s.difficulty === 'string' &&
      CLUELESS_DIFFICULTIES.includes(s.difficulty as CluelessDifficulty));
  return (
    typeof s.puzzleNumber === 'number' &&
    validDifficulty &&
    Array.isArray(s.guesses) &&
    s.guesses.every(isGuess) &&
    (s.status === 'playing' || s.status === 'won') &&
    (s.lastWord === null || typeof s.lastWord === 'string')
  );
}

/**
 * Restore a saved session into a clean state.
 *
 * Two deliberate resets: any pending rejection is dropped (a stale "not a word"
 * error on resume is confusing), and `lastWord` is cleared so the resumed list
 * does not replay its entry animation on every visit.
 */
export function rehydrate(
  state: PersistedCluelessState,
  selectedDifficulty: CluelessDifficulty = 'standard',
): CluelessState {
  const difficulty =
    state.guesses.length > 0 ? state.difficulty ?? 'standard' : selectedDifficulty;
  return { ...state, difficulty, rejection: null, lastWord: null };
}
