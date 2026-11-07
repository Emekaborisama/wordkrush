import { describe, expect, it } from 'vitest';
import { EMPTY_REWARDS, isValidRewards, parseRewards, type RewardsState } from './types';

const saved = (over: Partial<RewardsState> = {}): RewardsState => ({
  ...EMPTY_REWARDS,
  xp: 60,
  coins: 15,
  firstRunBonusGranted: true,
  bestStars: { 'wordfall:1': 3 },
  milestones: ['flame-3'],
  chest: { lastClaimedDay: '2026-10-17', day: 2 },
  lastRunDay: '2026-10-18',
  appliedRunIds: ['run-1'],
  ...over,
});

describe('parseRewards', () => {
  it('round-trips a wallet storage wrote', () => {
    const state = saved();
    expect(parseRewards(JSON.stringify(state))).toEqual(state);
    expect(isValidRewards(state)).toBe(true);
  });

  it('starts empty when nothing is stored', () => {
    expect(parseRewards(null)).toEqual(EMPTY_REWARDS);
    expect(parseRewards('')).toEqual(EMPTY_REWARDS);
  });

  it.each([
    ['malformed JSON', '{oops'],
    ['JSON null', 'null'],
    ['a partial object', '{"version":1,"xp":10}'],
    ['the wrong version', JSON.stringify(saved({ version: 2 as 1 }))],
    ['a negative balance', JSON.stringify({ ...saved(), coins: -1 })],
    ['a fractional xp total', JSON.stringify({ ...saved(), xp: 1.5 })],
    ['a star outside 1–3', JSON.stringify({ ...saved(), bestStars: { 'wordfall:1': 4 } })],
    ['a chest day past 7', JSON.stringify({ ...saved(), chest: { lastClaimedDay: '', day: 8 } })],
    ['a nonsense day', JSON.stringify({ ...saved(), lastRunDay: 'tomorrow' })],
    ['an empty run id', JSON.stringify({ ...saved(), appliedRunIds: [''] })],
  ])('falls back to empty for %s', (_label, raw) => {
    expect(parseRewards(raw)).toEqual(EMPTY_REWARDS);
  });

  it('keeps the newest 100 run ids when a blob is longer', () => {
    const appliedRunIds = Array.from({ length: 150 }, (_, i) => `run-${i}`);
    const parsed = parseRewards(JSON.stringify(saved({ appliedRunIds })));
    expect(parsed.appliedRunIds).toHaveLength(100);
    expect(parsed.appliedRunIds[0]).toBe('run-50');
    expect(parsed.appliedRunIds.at(-1)).toBe('run-149');
  });
});
