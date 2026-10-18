/**
 * More or Less boosts. These compose `selectChallenger`; the shared engine
 * files stay untouched so the Reddit build keeps the same reducer.
 */
import { selectChallenger, type GameState } from './engine';
import type { Item } from './types';

/**
 * Replace the hidden card. Only while a round is waiting for an answer.
 * The anchor and the streak stay; the new id counts as seen.
 */
export function skipChallenger(
  state: GameState,
  pool: Item[],
  preferUnseenIds?: readonly string[],
): GameState {
  if (state.status !== 'playing') return state;
  return withFreshChallenger(state, pool, preferUnseenIds, 'playing');
}

/**
 * Continue a lost run. Same anchor, same streak, a new hidden card.
 * Only from `over` — a reveal in progress is not a loss yet.
 */
export function secondChance(
  state: GameState,
  pool: Item[],
  preferUnseenIds?: readonly string[],
): GameState {
  if (state.status !== 'over') return state;
  return withFreshChallenger(state, pool, preferUnseenIds, 'playing');
}

function withFreshChallenger(
  state: GameState,
  pool: Item[],
  preferUnseenIds: readonly string[] | undefined,
  status: 'playing',
): GameState {
  const picked = selectChallenger(
    pool,
    state.left,
    state.streak,
    state.seenIds,
    state.seed,
    state.bandOverride,
    preferUnseenIds,
  );
  return {
    ...state,
    right: picked.item,
    status,
    lastGuessCorrect: null,
    seenIds: [...state.seenIds, picked.item.id],
    seed: picked.seed,
    relaxedRounds: state.relaxedRounds + (picked.relaxed ? 1 : 0),
  };
}
