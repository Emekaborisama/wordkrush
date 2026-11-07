import { describe, expect, it } from 'vitest';
import { ghostAt, ghostPlan, ghostPlayer, ghostTarget } from './ghost';
import { DUEL_MS } from './rules';

describe('ghostPlayer', () => {
  it('is always marked a ghost, by name and by flag', () => {
    for (let seed = 1; seed < 50; seed += 1) {
      const ghost = ghostPlayer(seed);
      expect(ghost.ghost).toBe(true);
      expect(ghost.name.startsWith('Ghost ')).toBe(true);
    }
  });

  it('is the same ghost for the same seed', () => {
    expect(ghostPlayer(42)).toEqual(ghostPlayer(42));
  });
});

describe('ghostTarget', () => {
  it('stays near the player and within reason', () => {
    expect(ghostTarget(0)).toBe(3);
    expect(ghostTarget(10)).toBe(11);
    expect(ghostTarget(500)).toBe(14);
  });
});

describe('ghostPlan', () => {
  it('replays exactly from its seed', () => {
    expect(ghostPlan(7, 5)).toEqual(ghostPlan(7, 5));
  });

  it('climbs one at a time, inside the clock, and only ever ends on a miss', () => {
    for (let seed = 1; seed < 200; seed += 1) {
      const plan = ghostPlan(seed, 8);
      plan.forEach((step, index) => {
        expect(step.atMs).toBeLessThan(DUEL_MS);
        if (index < plan.length - 1) expect(step.done).toBe(false);
        if (index > 0 && !step.done) expect(step.streak).toBe(plan[index - 1].streak + 1);
      });
    }
  });

  it('wins sometimes and loses sometimes against a player at their best', () => {
    const best = 8;
    const finals = Array.from({ length: 300 }, (_, i) => ghostPlan(i + 1, best).at(-1)?.streak ?? 0);
    const beaten = finals.filter((streak) => streak < best).length;
    expect(beaten).toBeGreaterThan(30);
    expect(beaten).toBeLessThan(270);
  });
});

describe('ghostAt', () => {
  it('walks the plan as time passes', () => {
    const plan = [
      { streak: 1, done: false, atMs: 2_000 },
      { streak: 2, done: false, atMs: 5_000 },
      { streak: 2, done: true, atMs: 5_000 },
    ];
    expect(ghostAt(plan, 1_000).streak).toBe(0);
    expect(ghostAt(plan, 2_500).streak).toBe(1);
    expect(ghostAt(plan, 5_500)).toEqual({ streak: 2, done: false, atMs: 5_000 });
    expect(ghostAt(plan, 8_000).done).toBe(true);
  });
});
