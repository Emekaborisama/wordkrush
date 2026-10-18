import { describe, expect, it } from 'vitest';
import { levelProgress, starsFor, starsKey, applyRun } from './progression';
import {
  EMPTY_REWARDS,
  type ApplyRunContext,
  type RewardEvent,
  type RewardsState,
  type RunSummary,
} from './types';

const today = '2026-10-18';

const ctx = (over: Partial<ApplyRunContext> = {}): ApplyRunContext => ({
  today,
  dailyStreakAfter: 1,
  ...over,
});

function mol(over: Partial<Extract<RunSummary, { gameId: 'more-or-less' }>> = {}): RunSummary {
  return {
    gameId: 'more-or-less',
    runId: 'mol-1',
    streak: 0,
    isNewBest: false,
    setCleared: false,
    boosted: false,
    ...over,
  };
}

function clueless(over: Partial<Extract<RunSummary, { gameId: 'clueless' }>> = {}): RunSummary {
  return {
    gameId: 'clueless',
    runId: 'clue-1',
    levelNumber: 4,
    phase: 'daily',
    guesses: 40,
    isNewBest: false,
    boosted: false,
    ...over,
  };
}

function wordfall(over: Partial<Extract<RunSummary, { gameId: 'wordfall' }>> = {}): RunSummary {
  return {
    gameId: 'wordfall',
    runId: 'wf-1',
    levelNumber: 12,
    weekly: false,
    outcome: 'win',
    movesLeft: 2,
    moves: 20,
    timeLeftMs: null,
    timeLimitMs: null,
    isNewBest: false,
    boosted: false,
    ...over,
  };
}

function ofKind(events: RewardEvent[], kind: RewardEvent['kind']): RewardEvent[] {
  return events.filter((event) => event.kind === kind);
}

describe('levelProgress', () => {
  it('follows the documented curve', () => {
    expect(levelProgress(0)).toEqual({ level: 1, into: 0, needed: 60, fraction: 0 });
    expect(levelProgress(60)).toEqual({ level: 2, into: 0, needed: 80, fraction: 0 });
    expect(levelProgress(70)).toEqual({ level: 2, into: 10, needed: 80, fraction: 10 / 80 });
    expect(levelProgress(140)).toEqual({ level: 3, into: 0, needed: 100, fraction: 0 });
    expect(levelProgress(360).level).toBe(5);
    expect(levelProgress(360).into).toBe(0);
    expect(levelProgress(1260).level).toBe(10);
    expect(levelProgress(1260).into).toBe(0);
  });
});

describe('starsFor', () => {
  it('scores each game on its own thresholds', () => {
    expect(starsFor(mol({ streak: 2 }))).toBe(0);
    expect(starsFor(mol({ streak: 3 }))).toBe(1);
    expect(starsFor(mol({ streak: 7 }))).toBe(2);
    expect(starsFor(mol({ streak: 12 }))).toBe(3);

    expect(starsFor(clueless({ guesses: 31 }))).toBe(1);
    expect(starsFor(clueless({ guesses: 30 }))).toBe(2);
    expect(starsFor(clueless({ guesses: 12 }))).toBe(3);

    expect(starsFor(wordfall({ outcome: 'loss' }))).toBe(0);
    expect(starsFor(wordfall({ moves: 20, movesLeft: 2 }))).toBe(1);
    expect(starsFor(wordfall({ moves: 20, movesLeft: 3 }))).toBe(2);
    expect(starsFor(wordfall({ moves: 20, movesLeft: 7 }))).toBe(3);
    expect(
      starsFor(wordfall({ timeLimitMs: 10_000, timeLeftMs: 1_999, movesLeft: 0 })),
    ).toBe(1);
    expect(
      starsFor(wordfall({ timeLimitMs: 10_000, timeLeftMs: 2_000, movesLeft: 0 })),
    ).toBe(2);
    expect(
      starsFor(wordfall({ timeLimitMs: 10_000, timeLeftMs: 4_000, movesLeft: 0 })),
    ).toBe(3);
  });

  it('keeps one best per level and one More or Less best', () => {
    expect(starsKey(mol())).toBe('more-or-less:best');
    expect(starsKey(clueless({ levelNumber: 4 }))).toBe('clueless:4');
    expect(starsKey(wordfall({ levelNumber: 12 }))).toBe('wordfall:12');
  });
});

describe('applyRun', () => {
  it('pays the first finished run once, including the first run of the day', () => {
    const first = applyRun(EMPTY_REWARDS, mol({ runId: 'a' }), ctx());
    expect(first.events).toEqual([
      { kind: 'xp', amount: 10, reason: 'finished-run' },
      { kind: 'xp', amount: 10, reason: 'first-of-day' },
      { kind: 'coins', amount: 100, reason: 'first-run-bonus' },
      { kind: 'coins', amount: 5, reason: 'finished-run' },
      { kind: 'stars', stars: 0, newBest: false },
      { kind: 'chestReady' },
    ]);
    expect(first.state.firstRunBonusGranted).toBe(true);
    expect(first.state.lastRunDay).toBe(today);
    expect(first.state.coins).toBe(105);
    expect(first.state.xp).toBe(20);

    const second = applyRun(first.state, mol({ runId: 'b' }), ctx());
    expect(second.events.some((event) => event.kind === 'coins' && event.reason === 'first-run-bonus')).toBe(
      false,
    );
    expect(second.events.some((event) => event.kind === 'xp' && event.reason === 'first-of-day')).toBe(
      false,
    );
    expect(second.events.some((event) => event.kind === 'chestReady')).toBe(false);
  });

  it('is a no-op when the run id was already applied', () => {
    const once = applyRun(EMPTY_REWARDS, mol({ runId: 'same' }), ctx());
    const twice = applyRun(once.state, mol({ runId: 'same', streak: 20, isNewBest: true }), ctx());
    expect(twice.state).toBe(once.state);
    expect(twice.events).toEqual([]);
  });

  it('forgets run ids past 100 so the list cannot grow without bound', () => {
    let state = EMPTY_REWARDS;
    for (let i = 0; i < 101; i++) {
      state = applyRun(state, mol({ runId: `r${i}` }), ctx()).state;
    }
    expect(state.appliedRunIds).toHaveLength(100);
    expect(state.appliedRunIds.includes('r0')).toBe(false);
    const again = applyRun(state, mol({ runId: 'r0' }), ctx());
    expect(again.state).not.toBe(state);
    expect(again.state.xp).toBeGreaterThan(state.xp);
  });

  it('caps More or Less correct-answer XP and still pays stars on a repeat', () => {
    const first = applyRun(
      EMPTY_REWARDS,
      mol({ runId: 'hot', streak: 100, isNewBest: true }),
      ctx(),
    );
    const correct = first.events.find(
      (event) => event.kind === 'xp' && event.reason === 'correct-answers',
    );
    expect(correct).toEqual({ kind: 'xp', amount: 40, reason: 'correct-answers' });
    expect(first.state.bestStars['more-or-less:best']).toBe(3);

    const repeat = applyRun(
      { ...first.state, lastRunDay: today },
      mol({ runId: 'hot-2', streak: 12, isNewBest: false }),
      ctx(),
    );
    expect(repeat.state.bestStars['more-or-less:best']).toBe(3);
    expect(repeat.events).toContainEqual({ kind: 'stars', stars: 3, newBest: false });
    expect(repeat.events).toContainEqual({ kind: 'xp', amount: 15, reason: 'stars' });
  });

  it('does not replace a better star total with a worse one', () => {
    const best = applyRun(EMPTY_REWARDS, mol({ runId: 'three', streak: 12 }), ctx());
    const worse = applyRun(best.state, mol({ runId: 'one', streak: 3 }), ctx());
    expect(worse.state.bestStars['more-or-less:best']).toBe(3);
    expect(worse.events).toContainEqual({ kind: 'stars', stars: 1, newBest: false });
  });

  it('rewards a Wordfall loss without a clear bonus', () => {
    const result = applyRun(EMPTY_REWARDS, wordfall({ outcome: 'loss', runId: 'lost' }), ctx());
    expect(result.events).toContainEqual({ kind: 'xp', amount: 10, reason: 'finished-run' });
    expect(result.events.some((event) => event.kind === 'xp' && event.reason === 'level-cleared')).toBe(
      false,
    );
    expect(result.events.some((event) => event.kind === 'coins' && event.reason === 'win')).toBe(false);
    expect(result.events).toContainEqual({ kind: 'stars', stars: 0, newBest: false });
    expect(result.state.coins).toBeGreaterThanOrEqual(0);
  });

  it('pays a Clueless solve and a Wordfall clear', () => {
    const solved = applyRun(EMPTY_REWARDS, clueless({ guesses: 12, runId: 'solved' }), ctx());
    expect(solved.events).toContainEqual({ kind: 'xp', amount: 30, reason: 'solve' });
    expect(solved.events).toContainEqual({ kind: 'coins', amount: 10, reason: 'win' });
    expect(solved.state.bestStars['clueless:4']).toBe(3);

    const cleared = applyRun(
      { ...EMPTY_REWARDS, firstRunBonusGranted: true },
      wordfall({ runId: 'cleared', moves: 20, movesLeft: 7 }),
      ctx(),
    );
    expect(cleared.events).toContainEqual({ kind: 'xp', amount: 25, reason: 'level-cleared' });
    expect(cleared.state.bestStars['wordfall:12']).toBe(3);
  });

  it('fires each milestone once', () => {
    const first = applyRun(
      EMPTY_REWARDS,
      mol({ runId: 'streak', streak: 20, setCleared: true }),
      ctx({ dailyStreakAfter: 30, clueless: { tutorialCleared: true, vaultsSolved: 7 } }),
    );
    const ids = ofKind(first.events, 'milestone').map((event) =>
      event.kind === 'milestone' ? event.id : '',
    );
    expect(ids).toEqual([
      'flame-3',
      'flame-7',
      'flame-14',
      'flame-30',
      'mol-streak-5',
      'mol-streak-10',
      'mol-streak-20',
      'mol-set-1',
      'clueless-sparks',
      'clueless-vault-1',
      'clueless-vault-7',
      // The milestone XP itself crosses level 5, so that grant lands in the same run.
      'level-5',
    ]);

    const second = applyRun(
      first.state,
      mol({ runId: 'again', streak: 20, setCleared: true }),
      ctx({ dailyStreakAfter: 30, clueless: { tutorialCleared: true, vaultsSolved: 7 } }),
    );
    expect(ofKind(second.events, 'milestone')).toEqual([]);
  });

  it('grants a weekly Wordfall clear once and not a weekly loss', () => {
    const won = applyRun(
      EMPTY_REWARDS,
      wordfall({ runId: 'weekly', weekly: true, outcome: 'win' }),
      ctx({ wordfall: { campaignCleared: true } }),
    );
    const ids = ofKind(won.events, 'milestone').map((event) =>
      event.kind === 'milestone' ? event.id : '',
    );
    expect(ids).toEqual(['wordfall-campaign', 'wordfall-weekly-1']);

    const lost = applyRun(
      EMPTY_REWARDS,
      wordfall({ runId: 'weekly-loss', weekly: true, outcome: 'loss' }),
      ctx(),
    );
    expect(ofKind(lost.events, 'milestone')).toEqual([]);
  });

  it('levels up from the XP just earned and pays the level milestone', () => {
    const state: RewardsState = {
      ...EMPTY_REWARDS,
      xp: 350,
      firstRunBonusGranted: true,
      lastRunDay: today,
    };
    const result = applyRun(state, mol({ runId: 'level' }), ctx());
    expect(result.state.xp).toBe(360);
    expect(levelProgress(result.state.xp).level).toBe(5);
    expect(result.events).toContainEqual({ kind: 'levelUp', from: 4, to: 5 });
    expect(result.events).toContainEqual({ kind: 'milestone', id: 'level-5' });
    expect(result.events).toContainEqual({ kind: 'coins', amount: 25, reason: 'level-up' });
    expect(result.events).toContainEqual({ kind: 'coins', amount: 50, reason: 'milestone' });
    expect(result.state.coins).toBeGreaterThanOrEqual(0);
  });

  it('ignores a clock that moved backwards', () => {
    const state: RewardsState = {
      ...EMPTY_REWARDS,
      firstRunBonusGranted: true,
      lastRunDay: '2026-10-18',
      coins: 5,
      xp: 10,
    };
    const result = applyRun(state, mol({ runId: 'back' }), ctx({ today: '2026-10-17' }));
    expect(result.state.lastRunDay).toBe('2026-10-18');
    expect(result.events.some((event) => event.kind === 'xp' && event.reason === 'first-of-day')).toBe(
      false,
    );
    expect(result.events.some((event) => event.kind === 'chestReady')).toBe(false);
    expect(result.state.xp).toBeGreaterThan(state.xp);
    expect(result.state.coins).toBeGreaterThanOrEqual(state.coins);
  });
});
