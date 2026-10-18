/**
 * XP, stars, coins, and one-time milestones for a finished run.
 *
 * Dates and run ids are arguments. A run id that was already applied returns
 * the same state and no events.
 */
import { chestStatus } from './chest';
import {
  APPLIED_RUN_CAP,
  CLUELESS_STAR_GUESSES,
  COINS_FINISHED_RUN,
  COINS_FIRST_RUN,
  COINS_LEVEL_UP,
  COINS_NEW_BEST,
  COINS_PER_STAR,
  COINS_WIN,
  FLAME_MILESTONES,
  MILESTONE_REWARDS,
  MOL_STAR_STREAKS,
  MOL_STREAK_MILESTONES,
  WORDFALL_MOVE_STAR_FRACTIONS,
  WORDFALL_TIME_STAR_FRACTIONS,
  XP_CLUELESS_SOLVE,
  XP_CORRECT_CAP,
  XP_FINISHED_RUN,
  XP_FIRST_OF_DAY,
  XP_NEW_BEST,
  XP_PER_CORRECT,
  XP_PER_STAR,
  XP_WORDFALL_CLEAR,
  xpToNextLevel,
} from './config';
import {
  dayGap,
  type ApplyRunContext,
  type ApplyRunResult,
  type CoinReason,
  type MilestoneId,
  type RewardEvent,
  type RewardsState,
  type RunSummary,
  type StarCount,
  type StoredStars,
  type XpReason,
} from './types';

/** Lifetime XP required to already be `level` (level 1 is 0). */
export function cumulativeXpForLevel(level: number): number {
  if (!Number.isInteger(level) || level <= 1) return 0;
  return 10 * (level - 1) * (level + 4);
}

export function levelProgress(xp: number): {
  level: number;
  into: number;
  needed: number;
  fraction: number;
} {
  const safe = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  const disc = 25 + 0.4 * safe;
  let level = Math.floor((-3 + Math.sqrt(disc)) / 2);
  if (!Number.isFinite(level) || level < 1) level = 1;
  while (cumulativeXpForLevel(level + 1) <= safe) level += 1;
  while (level > 1 && cumulativeXpForLevel(level) > safe) level -= 1;
  const into = safe - cumulativeXpForLevel(level);
  const needed = xpToNextLevel(level);
  return { level, into, needed, fraction: needed === 0 ? 0 : into / needed };
}

/** Lookup key for the best stars kept for this run. */
export function starsKey(run: RunSummary): string {
  switch (run.gameId) {
    case 'more-or-less':
      return 'more-or-less:best';
    case 'clueless':
      return `clueless:${run.levelNumber}`;
    case 'wordfall':
      return `wordfall:${run.levelNumber}`;
  }
}

export function starsFor(run: RunSummary): StarCount {
  switch (run.gameId) {
    case 'more-or-less':
      if (run.streak >= MOL_STAR_STREAKS.three) return 3;
      if (run.streak >= MOL_STAR_STREAKS.two) return 2;
      if (run.streak >= MOL_STAR_STREAKS.one) return 1;
      return 0;
    case 'clueless':
      if (run.guesses <= CLUELESS_STAR_GUESSES.three) return 3;
      if (run.guesses <= CLUELESS_STAR_GUESSES.two) return 2;
      return 1;
    case 'wordfall':
      return wordfallStars(run);
  }
}

function wordfallStars(run: Extract<RunSummary, { gameId: 'wordfall' }>): StarCount {
  if (run.outcome !== 'win') return 0;
  if (run.timeLimitMs !== null && run.timeLimitMs > 0) {
    const left = run.timeLeftMs ?? 0;
    const fraction = left / run.timeLimitMs;
    if (fraction >= WORDFALL_TIME_STAR_FRACTIONS.three) return 3;
    if (fraction >= WORDFALL_TIME_STAR_FRACTIONS.two) return 2;
    return 1;
  }
  if (run.moves <= 0) return 1;
  const fraction = run.movesLeft / run.moves;
  if (fraction >= WORDFALL_MOVE_STAR_FRACTIONS.three) return 3;
  if (fraction >= WORDFALL_MOVE_STAR_FRACTIONS.two) return 2;
  return 1;
}

function cleared(run: RunSummary): boolean {
  if (run.gameId === 'clueless') return true;
  if (run.gameId === 'wordfall') return run.outcome === 'win';
  return false;
}

function nextLastRunDay(previous: string, today: string): string {
  if (!previous) return today;
  const gap = dayGap(previous, today);
  if (gap === null || gap < 0) return previous;
  return today;
}

function unseen(owned: readonly string[], ids: readonly MilestoneId[]): MilestoneId[] {
  return ids.filter((id) => !owned.includes(id));
}

function gameMilestones(
  state: RewardsState,
  run: RunSummary,
  ctx: ApplyRunContext,
): MilestoneId[] {
  const hits: MilestoneId[] = [];
  for (const flame of FLAME_MILESTONES) {
    if (ctx.dailyStreakAfter >= flame.days) hits.push(flame.id);
  }
  if (run.gameId === 'more-or-less') {
    for (const row of MOL_STREAK_MILESTONES) {
      if (run.streak >= row.streak) hits.push(row.id);
    }
    if (run.setCleared) hits.push('mol-set-1');
  }
  if (ctx.clueless?.tutorialCleared) hits.push('clueless-sparks');
  const vaults = ctx.clueless?.vaultsSolved ?? 0;
  if (vaults >= 1) hits.push('clueless-vault-1');
  if (vaults >= 7) hits.push('clueless-vault-7');
  if (ctx.wordfall?.campaignCleared) hits.push('wordfall-campaign');
  if (run.gameId === 'wordfall' && run.weekly && run.outcome === 'win') {
    hits.push('wordfall-weekly-1');
  }
  return unseen(state.milestones, hits);
}

function levelMilestones(owned: readonly string[], level: number): MilestoneId[] {
  const hits: MilestoneId[] = [];
  if (level >= 5) hits.push('level-5');
  if (level >= 10) hits.push('level-10');
  return unseen(owned, hits);
}

function asStored(stars: StarCount): StoredStars | null {
  if (stars === 1 || stars === 2 || stars === 3) return stars;
  return null;
}

export function applyRun(
  state: RewardsState,
  run: RunSummary,
  ctx: ApplyRunContext,
): ApplyRunResult {
  if (run.runId.length === 0 || state.appliedRunIds.includes(run.runId)) {
    return { state, events: [] };
  }

  const xpEvents: RewardEvent[] = [];
  const coinEvents: RewardEvent[] = [];
  let xp = 0;
  let coins = state.coins;

  const addXp = (amount: number, reason: XpReason) => {
    if (amount <= 0) return;
    xp += amount;
    xpEvents.push({ kind: 'xp', amount, reason });
  };
  const addCoins = (amount: number, reason: CoinReason) => {
    if (amount <= 0) return;
    coins += amount;
    coinEvents.push({ kind: 'coins', amount, reason });
  };

  const stars = starsFor(run);
  const key = starsKey(run);
  const previousStars = state.bestStars[key] ?? 0;
  const stored = asStored(stars);
  const starsAreNewBest = stored !== null && stored > previousStars;
  const lastRunDay = nextLastRunDay(state.lastRunDay, ctx.today);
  const firstOfDay = lastRunDay === ctx.today && state.lastRunDay !== ctx.today;

  addXp(XP_FINISHED_RUN, 'finished-run');
  if (run.gameId === 'more-or-less' && run.streak > 0) {
    addXp(Math.min(XP_CORRECT_CAP, run.streak * XP_PER_CORRECT), 'correct-answers');
  }
  if (run.gameId === 'clueless') addXp(XP_CLUELESS_SOLVE, 'solve');
  if (run.gameId === 'wordfall' && run.outcome === 'win') addXp(XP_WORDFALL_CLEAR, 'level-cleared');
  if (stars > 0) addXp(stars * XP_PER_STAR, 'stars');
  if (run.isNewBest) addXp(XP_NEW_BEST, 'new-best');
  if (firstOfDay) addXp(XP_FIRST_OF_DAY, 'first-of-day');

  if (!state.firstRunBonusGranted) addCoins(COINS_FIRST_RUN, 'first-run-bonus');
  addCoins(COINS_FINISHED_RUN, 'finished-run');
  if (cleared(run)) addCoins(COINS_WIN, 'win');
  if (stars > 0) addCoins(stars * COINS_PER_STAR, 'stars');
  if (run.isNewBest) addCoins(COINS_NEW_BEST, 'new-best');

  const earned = gameMilestones(state, run, ctx);
  for (const id of earned) addXp(MILESTONE_REWARDS[id].xp, 'milestone');

  const fromLevel = levelProgress(state.xp).level;
  const toLevel = levelProgress(state.xp + xp).level;
  const reached = [...earned, ...levelMilestones(state.milestones, toLevel)];
  const milestoneEvents: RewardEvent[] = [];
  for (const id of reached) {
    addCoins(MILESTONE_REWARDS[id].coins, 'milestone');
    milestoneEvents.push({ kind: 'milestone', id });
  }

  const levelEvents: RewardEvent[] = [];
  if (toLevel > fromLevel) {
    levelEvents.push({ kind: 'levelUp', from: fromLevel, to: toLevel });
    addCoins((toLevel - fromLevel) * COINS_LEVEL_UP, 'level-up');
  }

  const next: RewardsState = {
    ...state,
    xp: state.xp + xp,
    coins,
    firstRunBonusGranted: true,
    bestStars:
      starsAreNewBest && stored !== null
        ? { ...state.bestStars, [key]: stored }
        : state.bestStars,
    milestones: reached.length > 0 ? [...state.milestones, ...reached] : state.milestones,
    lastRunDay,
    appliedRunIds: [...state.appliedRunIds, run.runId].slice(-APPLIED_RUN_CAP),
  };

  const events: RewardEvent[] = [
    ...xpEvents,
    ...coinEvents,
    { kind: 'stars', stars, newBest: starsAreNewBest },
    ...milestoneEvents,
    ...levelEvents,
  ];
  if (chestStatus(state, ctx.today) !== 'ready' && chestStatus(next, ctx.today) === 'ready') {
    events.push({ kind: 'chestReady' });
  }

  return { state: next, events };
}
