/**
 * The game engine: a pure reducer.
 *
 * `(state, action, pool) => state` — no side effects, no I/O, no React. The UI
 * is a thin renderer over this, and an entire run can be replayed in a test in
 * microseconds.
 *
 * Mechanic (BRAINSTORM §2, carry-over chain):
 *   - LEFT card shows its value. RIGHT card is hidden.
 *   - Player answers whether RIGHT has MORE or LESS than LEFT.
 *   - Correct -> the right card slides into the left slot and a new challenger
 *     appears, so each round reveals exactly one new item.
 *   - Wrong -> the run ends.
 *
 * Both of those are config-shaped rather than hard-coded where it matters, so
 * the still-open framing questions stay cheap to change.
 */
import { isFairPair, ratio, targetBandForStreak, type RatioBand } from './pairing';
import { nextInt } from '../rng';
import type { Item } from './types';

export type Guess = 'more' | 'less';
export type GameStatus = 'playing' | 'revealed' | 'over';

export type GameState = {
  left: Item;
  right: Item;
  streak: number;
  bestStreak: number;
  status: GameStatus;
  /** Set the moment a guess is judged; drives the reveal UI. */
  lastGuessCorrect: boolean | null;
  /** Items used this run, newest last. Prevents immediate repeats. */
  seenIds: string[];
  seed: number;
  /** Rounds where no pair matched the target band, so it had to widen. */
  relaxedRounds: number;
  /**
   * When set, every round uses this band instead of the streak curve.
   * Campaign rows use it to start tighter than a fresh endless run.
   */
  bandOverride?: RatioBand;
};

export type Action =
  | { type: 'newRun'; seed: number }
  | { type: 'guess'; choice: Guess }
  | { type: 'next' }
  /** Replace state wholesale when resuming a saved run. */
  | { type: 'restore'; state: GameState };

/** How many recent items are excluded from being picked again. */
const RECENT_WINDOW = 12;

/**
 * Pick a challenger for `anchor`.
 *
 * Tries the streak's target ratio band first, then widens in stages. Widening
 * beats failing: a deadlocked engine is a crashed game, while a slightly
 * off-difficulty card is barely noticeable.
 */
export function selectChallenger(
  pool: Item[],
  anchor: Item,
  streak: number,
  seenIds: string[],
  seed: number,
  bandOverride?: RatioBand,
): { item: Item; seed: number; relaxed: boolean } {
  const band = bandOverride ?? targetBandForStreak(streak);
  const recent = new Set(seenIds.slice(-RECENT_WINDOW));

  const fair = pool.filter((item) => item.id !== anchor.id && isFairPair(anchor, item));
  if (fair.length === 0) {
    throw new Error(
      `No fair challenger for "${anchor.label}" in a pool of ${pool.length}. ` +
        `The dataset is too flat — see src/data/categories.test.ts.`,
    );
  }

  const unseen = fair.filter((item) => !recent.has(item.id));
  // Falling back to `fair` when everything is recent keeps long runs alive
  // rather than throwing once the pool is exhausted.
  const candidates = unseen.length > 0 ? unseen : fair;

  const inBand = candidates.filter((item) => {
    const r = ratio(anchor.value, item.value);
    return r >= band.min && r < band.max;
  });

  const finalPool = inBand.length > 0 ? inBand : candidates;
  const [index, nextSeed] = nextInt(seed, finalPool.length);
  return { item: finalPool[index], seed: nextSeed, relaxed: inBand.length === 0 };
}

export function newRun(
  pool: Item[],
  seed: number,
  bestStreak = 0,
  bandOverride?: RatioBand,
): GameState {
  if (pool.length < 2) throw new Error('newRun needs at least 2 items');

  const [firstIndex, s1] = nextInt(seed, pool.length);
  const left = pool[firstIndex];
  const { item: right, seed: s2 } = selectChallenger(
    pool,
    left,
    0,
    [left.id],
    s1,
    bandOverride,
  );

  return {
    left,
    right,
    streak: 0,
    bestStreak,
    status: 'playing',
    lastGuessCorrect: null,
    seenIds: [left.id, right.id],
    seed: s2,
    relaxedRounds: 0,
    ...(bandOverride ? { bandOverride } : {}),
  };
}

/** Did the player answer correctly? Exported so tests can assert it directly. */
export function isCorrect(left: Item, right: Item, choice: Guess): boolean {
  // Equal values would make both answers wrong; the fairness guard means such
  // a pair is never built, but be explicit rather than rely on it.
  return choice === 'more' ? right.value > left.value : right.value < left.value;
}

export function reducer(state: GameState, action: Action, pool: Item[]): GameState {
  switch (action.type) {
    case 'newRun':
      return newRun(pool, action.seed, state.bestStreak, state.bandOverride);

    case 'restore':
      // Land on 'playing': a run saved mid-reveal would otherwise resume with
      // a timer that already fired and never advance.
      return { ...action.state, status: 'playing', lastGuessCorrect: null };

    case 'guess': {
      // Ignore input while the reveal is on screen or the run is over —
      // otherwise a fast double-tap skips a round or scores twice.
      if (state.status !== 'playing') return state;

      const correct = isCorrect(state.left, state.right, action.choice);
      const streak = correct ? state.streak + 1 : state.streak;
      return {
        ...state,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        status: correct ? 'revealed' : 'over',
        lastGuessCorrect: correct,
      };
    }

    case 'next': {
      if (state.status !== 'revealed') return state;

      // Carry-over: the challenger becomes the new anchor.
      const left = state.right;
      const { item: right, seed, relaxed } = selectChallenger(
        pool,
        left,
        state.streak,
        state.seenIds,
        state.seed,
        state.bandOverride,
      );

      return {
        ...state,
        left,
        right,
        status: 'playing',
        lastGuessCorrect: null,
        seenIds: [...state.seenIds, right.id],
        seed,
        relaxedRounds: state.relaxedRounds + (relaxed ? 1 : 0),
      };
    }
  }
}
