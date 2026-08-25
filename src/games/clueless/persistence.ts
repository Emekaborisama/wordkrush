/**
 * Validation for resumed Clueless sessions.
 *
 * Kept separate from the engine so it stays pure and unit-testable, and so the
 * shape check lives next to the type it guards rather than inside a screen.
 */
import {
  CLUELESS_ASSISTANCE_CONTEXTS,
  CLUELESS_HINT_POLICIES,
  hintPolicyForAssistanceContext,
  type CluelessHintPolicy,
  type CluelessDifficulty,
  type CluelessState,
  type Guess,
} from './types';

export type PersistedCluelessState = Omit<CluelessState, 'hintPolicy'> & {
  /** Present on saves written after the daily path shipped. */
  hintPolicy?: CluelessHintPolicy;
  /** Legacy daily-mode value. Kept so an in-flight historic puzzle can restore safely. */
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
  const validHintPolicy =
    s.hintPolicy === undefined ||
    (typeof s.hintPolicy === 'string' &&
      CLUELESS_HINT_POLICIES.includes(s.hintPolicy as CluelessHintPolicy));
  const validLegacyDifficulty =
    s.difficulty === undefined ||
    (typeof s.difficulty === 'string' &&
      CLUELESS_ASSISTANCE_CONTEXTS.includes(s.difficulty as CluelessDifficulty));
  return (
    typeof s.puzzleNumber === 'number' &&
    validHintPolicy &&
    validLegacyDifficulty &&
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
  fallbackHintPolicy: CluelessHintPolicy = 'guess_threshold',
): CluelessState {
  const {
    difficulty: legacyDifficulty,
    hintPolicy: savedHintPolicy,
    ...rest
  } = state;
  const hintPolicy =
    savedHintPolicy ??
    (legacyDifficulty ? hintPolicyForAssistanceContext(legacyDifficulty) : fallbackHintPolicy);
  return { ...rest, hintPolicy, rejection: null, lastWord: null };
}
