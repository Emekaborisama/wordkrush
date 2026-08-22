/**
 * Validation for resumed Clueless sessions.
 *
 * Kept separate from the engine so it stays pure and unit-testable, and so the
 * shape check lives next to the type it guards rather than inside a screen.
 */
import type { CluelessState, Guess } from './types';

function isGuess(value: unknown): value is Guess {
  if (typeof value !== 'object' || value === null) return false;
  const g = value as Record<string, unknown>;
  if (typeof g.word !== 'string' || g.word.length === 0) return false;
  if (g.rank === null) return true;
  return typeof g.rank === 'number' && Number.isInteger(g.rank) && g.rank >= 1;
}

export function isCluelessState(value: unknown): value is CluelessState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.puzzleNumber === 'number' &&
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
export function rehydrate(state: CluelessState): CluelessState {
  return { ...state, rejection: null, lastWord: null };
}
