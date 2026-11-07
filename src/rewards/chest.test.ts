import { describe, expect, it } from 'vitest';
import { chestStatus, claimChest } from './chest';
import { CHEST_COINS_BY_DAY } from './config';
import { applyRun } from './progression';
import { EMPTY_REWARDS, type RewardsState, type RunSummary } from './types';

const today = '2026-10-18';

function finished(runId: string): RunSummary {
  return {
    gameId: 'wordfall',
    runId,
    levelNumber: 1,
    weekly: false,
    outcome: 'loss',
    movesLeft: 0,
    moves: 10,
    timeLeftMs: null,
    timeLimitMs: null,
    isNewBest: false,
    boosted: false,
  };
}

function played(): RewardsState {
  return applyRun(EMPTY_REWARDS, finished('run-1'), {
    today,
    dailyStreakAfter: 1,
  }).state;
}

describe('chestStatus', () => {
  it('stays locked until a run is finished today', () => {
    expect(chestStatus(EMPTY_REWARDS, today)).toBe('locked');
    expect(chestStatus(played(), today)).toBe('ready');
  });

  it('is claimed only after it is opened, and only for that local day', () => {
    const ready = played();
    const claimed = claimChest(ready, today).state;
    expect(chestStatus(claimed, today)).toBe('claimed');
    expect(chestStatus(claimed, '2026-10-19')).toBe('locked');
  });
});

describe('claimChest', () => {
  it('pays day 1 after the first finished run and ignores a second claim', () => {
    const ready = played();
    const first = claimChest(ready, today);
    expect(first.events).toEqual([{ kind: 'coins', amount: CHEST_COINS_BY_DAY[1], reason: 'chest' }]);
    expect(first.state.chest).toEqual({ lastClaimedDay: today, day: 1 });
    expect(first.state.coins).toBe(ready.coins + CHEST_COINS_BY_DAY[1]);

    const second = claimChest(first.state, today);
    expect(second.state).toBe(first.state);
    expect(second.events).toEqual([]);
  });

  it('advances one day when yesterday was claimed', () => {
    const state: RewardsState = {
      ...played(),
      chest: { lastClaimedDay: '2026-10-17', day: 4 },
    };
    const claimed = claimChest(state, today);
    expect(claimed.state.chest).toEqual({ lastClaimedDay: today, day: 5 });
    expect(claimed.state.coins).toBe(state.coins + CHEST_COINS_BY_DAY[5]);
  });

  it('returns to day 1 after day 7', () => {
    const state: RewardsState = {
      ...played(),
      chest: { lastClaimedDay: '2026-10-17', day: 7 },
    };
    expect(claimChest(state, today).state.chest.day).toBe(1);
    expect(claimChest(state, today).events[0]).toMatchObject({ amount: CHEST_COINS_BY_DAY[1] });
  });

  it('resets to day 1 when a local day was missed', () => {
    const state: RewardsState = {
      ...played(),
      chest: { lastClaimedDay: '2026-10-16', day: 6 },
    };
    const claimed = claimChest(state, today);
    expect(claimed.state.chest).toEqual({ lastClaimedDay: today, day: 1 });
    expect(claimed.state.coins).toBe(state.coins + 20);
  });

  it('does nothing when the clock moves backwards', () => {
    const state: RewardsState = {
      ...EMPTY_REWARDS,
      lastRunDay: '2026-10-18',
      chest: { lastClaimedDay: '2026-10-18', day: 3 },
      coins: 40,
    };
    const result = claimChest(state, '2026-10-17');
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
    expect(chestStatus(state, '2026-10-17')).toBe('claimed');
  });

  it('does not open a chest that no run has earned', () => {
    const result = claimChest(EMPTY_REWARDS, today);
    expect(result.state).toBe(EMPTY_REWARDS);
    expect(result.events).toEqual([]);
  });
});
