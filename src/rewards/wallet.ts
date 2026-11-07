/**
 * Coin spends. The balance is an integer and it cannot go below zero.
 */
import { BOOST_PRICES } from './config';
import type { BoostKind, RewardsState } from './types';

export type SpendResult =
  | { ok: true; state: RewardsState }
  | { ok: false; reason: 'insufficient' };

export function boostPrice(boost: BoostKind): number {
  return BOOST_PRICES[boost];
}

export function spend(state: RewardsState, boost: BoostKind): SpendResult {
  const price = BOOST_PRICES[boost];
  if (!Number.isInteger(price) || price < 0 || state.coins < price) {
    return { ok: false, reason: 'insufficient' };
  }
  return { ok: true, state: { ...state, coins: state.coins - price } };
}
