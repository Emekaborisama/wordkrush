/**
 * The thin layer between the Expo app's pure reducer and this app's wire types.
 *
 * There is no second engine here, and there must never be one. `newRun` and
 * `reducer` are imported from `src/games/more-or-less/engine.ts` exactly as the
 * Expo app uses them, so a fairness or difficulty change made there lands on
 * Reddit without anyone remembering to port it.
 *
 * Pure: no Redis, no Hono, no React. That is what lets the root Vitest suite
 * cover it alongside the engine it wraps.
 */
import { newRun, reducer, type GameState, type Guess } from '../../../src/games/more-or-less/engine';
import type { Item } from '../../../src/games/more-or-less/types';
import type { Choice, RoundView } from './api';

/**
 * Hard stop on run length.
 *
 * A 50-streak is far beyond what the difficulty curve makes reachable, so this
 * is not a game-design limit — it stops `seenIds` growing without bound in a
 * stored run if the engine ever finds a loop it can sustain.
 */
export const MAX_ROUNDS = 50;

export type RunRecord = {
  v: 1;
  state: GameState;
  /** 0-based index of the round currently on screen. */
  round: number;
};

/** Start today's run. Same seed for every player on the post. */
export function startRun(pool: Item[], seed: number): RunRecord {
  return { v: 1, state: newRun(pool, seed), round: 0 };
}

/** What the player is allowed to see: the anchor's value, and no more. */
export function toRoundView(record: RunRecord): RoundView {
  const { left, right } = record.state;
  return {
    index: record.round,
    left: { label: left.label, value: left.value },
    right: { label: right.label },
  };
}

export type GuessOutcome = {
  correct: boolean;
  /** The challenger's value, safe to release once the guess is locked in. */
  revealed: number;
  streak: number;
  /** Null when the run ended — on a wrong answer or at `MAX_ROUNDS`. */
  next: RunRecord | null;
};

/**
 * Judge one guess and, if it survived, advance to the next question.
 *
 * Both steps happen here so the client gets the verdict and the following round
 * in a single response: the reveal animation covers the round-trip, and the
 * player never waits between reading a value and tapping again.
 */
export function applyGuess(record: RunRecord, choice: Choice, pool: Item[]): GuessOutcome {
  const revealed = record.state.right.value;
  const judged = reducer(record.state, { type: 'guess', choice: choice as Guess }, pool);
  const correct = judged.lastGuessCorrect === true;

  if (!correct) {
    return { correct: false, revealed, streak: judged.streak, next: null };
  }
  if (judged.streak >= MAX_ROUNDS) {
    return { correct: true, revealed, streak: judged.streak, next: null };
  }

  const advanced = reducer(judged, { type: 'next' }, pool);
  return {
    correct: true,
    revealed,
    streak: advanced.streak,
    next: { v: 1, state: advanced, round: record.round + 1 },
  };
}

/** True when the stored run is still answerable. Guards a double-submitted tap. */
export function isPlayable(record: RunRecord): boolean {
  return record.state.status === 'playing';
}
