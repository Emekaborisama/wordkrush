/**
 * Clueless warmer-word boost.
 *
 * Picks a vocabulary word for the UI to submit as a normal guess. It does not
 * change engine state. Rank never goes below 10, and the word never shares a
 * 4-letter prefix with the secret or contains it — puzzle 31's top ranks are
 * `library`, `libraries`, and `lib`.
 */
import { WARMER_MIN_RANK, WARMER_NO_GUESS_TARGET, WARMER_PREFIX_LENGTH } from '../../rewards/config';
import { bestRank, type PuzzleIndex } from './engine';
import type { CluelessState } from './types';

export function warmerWord(state: CluelessState, index: PuzzleIndex): string | null {
  if (state.status !== 'playing') return null;
  const best = bestRank(state);
  if (best !== null && best <= WARMER_MIN_RANK) return null;

  const secret = index.puzzle.secret;
  const guessed = new Set(state.guesses.map((guess) => guess.word));
  const target = best === null ? WARMER_NO_GUESS_TARGET : Math.max(WARMER_MIN_RANK, Math.floor(best / 3));
  const secretPrefix =
    secret.length >= WARMER_PREFIX_LENGTH ? secret.slice(0, WARMER_PREFIX_LENGTH) : null;

  let chosen: { word: string; rank: number; distance: number } | null = null;
  for (let position = 0; position < index.puzzle.ranked.length; position++) {
    const word = index.puzzle.ranked[position];
    if (word === undefined) continue;
    const rank = position + 1;
    if (rank < WARMER_MIN_RANK) continue;
    if (best !== null && rank >= best) continue;
    if (word === secret || guessed.has(word)) continue;
    if (!index.vocabulary.has(word)) continue;
    if (
      secretPrefix !== null &&
      word.length >= WARMER_PREFIX_LENGTH &&
      word.slice(0, WARMER_PREFIX_LENGTH) === secretPrefix
    ) {
      continue;
    }
    if (word.includes(secret)) continue;

    const distance = Math.abs(rank - target);
    // A tie prefers the colder of the two so the hint does not overshoot.
    if (
      chosen === null ||
      distance < chosen.distance ||
      (distance === chosen.distance && rank > chosen.rank)
    ) {
      chosen = { word, rank, distance };
    }
  }

  return chosen === null ? null : chosen.word;
}
