import { describe, expect, it } from 'vitest';
import { celebrationLabels, milestoneLabel } from './celebrations';
import { MILESTONE_IDS, type RewardEvent } from './types';

describe('celebrationLabels', () => {
  it('has nothing to say for a run with only coins, XP and stars', () => {
    const events: RewardEvent[] = [
      { kind: 'xp', amount: 35, reason: 'finished-run' },
      { kind: 'coins', amount: 15, reason: 'finished-run' },
      { kind: 'stars', stars: 2, newBest: true },
    ];
    expect(celebrationLabels(events)).toEqual([]);
  });

  it('calls an XP level-up a player level, never a bare level', () => {
    expect(celebrationLabels([{ kind: 'levelUp', from: 1, to: 2 }])).toEqual(['Player level 2']);
  });

  it('says a one-time streak milestone was the first, so a longer run still reads true', () => {
    expect(celebrationLabels([{ kind: 'milestone', id: 'mol-streak-5' }])).toEqual(['First streak of 5']);
  });

  it('keeps event order and shows a level-up once when its milestone fires too', () => {
    const events: RewardEvent[] = [
      { kind: 'milestone', id: 'flame-3' },
      { kind: 'levelUp', from: 4, to: 6 },
      { kind: 'milestone', id: 'level-5' },
    ];
    expect(celebrationLabels(events)).toEqual(['3-day flame', 'Player level 6']);
  });

  it('shows a player-level milestone on its own when no level-up came with it', () => {
    expect(celebrationLabels([{ kind: 'milestone', id: 'level-10' }])).toEqual(['Player level 10']);
  });

  it('labels every milestone, and any label about levels names the player', () => {
    for (const id of MILESTONE_IDS) {
      const label = milestoneLabel(id);
      expect(label.length, id).toBeGreaterThan(0);
      if (/level/i.test(label)) expect(label, id).toMatch(/^Player level /);
    }
  });
});
