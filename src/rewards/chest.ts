/**
 * Daily chest. One per local day, and only after a finished run that day.
 *
 * Missing a local day resets the cycle to day 1. A clock that moves backwards
 * is ignored, the same guard as `recordPlay`.
 */
import { CHEST_COINS_BY_DAY } from './config';
import { dayGap, type ApplyRunResult, type ChestDay, type RewardsState } from './types';

export type ChestStatus = 'locked' | 'ready' | 'claimed';

export function chestStatus(state: RewardsState, today: string): ChestStatus {
  if (state.chest.lastClaimedDay) {
    const gap = dayGap(state.chest.lastClaimedDay, today);
    // Same day, or the device clock jumped backwards past the claim.
    if (gap !== null && gap <= 0) return 'claimed';
  }
  if (state.lastRunDay === today) return 'ready';
  return 'locked';
}

/** The day `claimChest` would grant, or null when today cannot open a chest. */
export function nextChestDay(state: RewardsState, today: string): ChestDay | null {
  return dayToClaim(state, today);
}

function dayToClaim(state: RewardsState, today: string): ChestDay | null {
  if (!state.chest.lastClaimedDay) return 1;
  const gap = dayGap(state.chest.lastClaimedDay, today);
  if (gap === null || gap <= 0) return null;
  if (gap >= 2 || state.chest.day < 1 || state.chest.day >= 7) return 1;
  return (state.chest.day + 1) as ChestDay;
}

export function claimChest(state: RewardsState, today: string): ApplyRunResult {
  if (chestStatus(state, today) !== 'ready') return { state, events: [] };
  const day = dayToClaim(state, today);
  if (day === null) return { state, events: [] };
  const amount = CHEST_COINS_BY_DAY[day];
  return {
    state: {
      ...state,
      coins: state.coins + amount,
      chest: { lastClaimedDay: today, day },
    },
    events: [{ kind: 'coins', amount, reason: 'chest' }],
  };
}
