import { describe, expect, it } from 'vitest';
import { POOL } from './pool';
import { MAX_ROUNDS, applyGuess, isPlayable, startRun, toRoundView, type RunRecord } from './rounds';
import type { Choice } from './api';

/** What a player who could see both values would answer. */
function perfectChoice(record: RunRecord): Choice {
  return record.state.right.value > record.state.left.value ? 'more' : 'less';
}

describe('starting a run', () => {
  it('gives the same opening pair to everyone on the same seed', () => {
    const a = startRun(POOL, 918956712);
    const b = startRun(POOL, 918956712);
    expect(b.state.left.id).toBe(a.state.left.id);
    expect(b.state.right.id).toBe(a.state.right.id);
  });

  it('opens differently on different seeds', () => {
    const openings = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => {
        const run = startRun(POOL, seed);
        return `${run.state.left.id}|${run.state.right.id}`;
      }),
    );
    expect(openings.size).toBeGreaterThan(1);
  });

  it('starts at round zero and is answerable', () => {
    const run = startRun(POOL, 42);
    expect(run.round).toBe(0);
    expect(isPlayable(run)).toBe(true);
  });
});

describe('what the player is allowed to see', () => {
  /**
   * The single most important assertion in this app. If the challenger's value
   * ever rides along on the round, the server stops being the authority on the
   * score and the leaderboard becomes a list of whoever read the network tab.
   */
  it('never carries the hidden item’s value', () => {
    const view = toRoundView(startRun(POOL, 42));
    expect(view.right).toEqual({ label: expect.any(String) });
    expect('value' in view.right).toBe(false);
    expect(JSON.stringify(view)).not.toContain(String(startRun(POOL, 42).state.right.value));
  });

  it('shows the anchor’s value', () => {
    const run = startRun(POOL, 42);
    const view = toRoundView(run);
    expect(view.left).toEqual({ label: run.state.left.label, value: run.state.left.value });
  });
});

describe('judging a guess', () => {
  it('releases the hidden value with the verdict', () => {
    const run = startRun(POOL, 42);
    const outcome = applyGuess(run, perfectChoice(run), POOL);
    expect(outcome.revealed).toBe(run.state.right.value);
  });

  it('advances and counts the streak on a correct answer', () => {
    const run = startRun(POOL, 42);
    const outcome = applyGuess(run, perfectChoice(run), POOL);

    expect(outcome.correct).toBe(true);
    expect(outcome.streak).toBe(1);
    expect(outcome.next).not.toBeNull();
    expect(outcome.next?.round).toBe(1);
  });

  it('carries the challenger over as the next anchor', () => {
    const run = startRun(POOL, 42);
    const outcome = applyGuess(run, perfectChoice(run), POOL);
    // Each round reveals exactly one new item, so the item just guessed becomes
    // the one whose value is on screen.
    expect(outcome.next?.state.left.id).toBe(run.state.right.id);
  });

  it('ends the run on a wrong answer', () => {
    const run = startRun(POOL, 42);
    const wrong: Choice = perfectChoice(run) === 'more' ? 'less' : 'more';
    const outcome = applyGuess(run, wrong, POOL);

    expect(outcome.correct).toBe(false);
    expect(outcome.streak).toBe(0);
    expect(outcome.next).toBeNull();
  });

  it('keeps the streak earned before the miss', () => {
    let run = startRun(POOL, 42);
    const first = applyGuess(run, perfectChoice(run), POOL);
    run = first.next as RunRecord;

    const wrong: Choice = perfectChoice(run) === 'more' ? 'less' : 'more';
    expect(applyGuess(run, wrong, POOL).streak).toBe(1);
  });
});

describe('a perfect run', () => {
  it('survives to the cap without the pool deadlocking', () => {
    let run = startRun(POOL, 918956712);
    let rounds = 0;

    for (;;) {
      const outcome = applyGuess(run, perfectChoice(run), POOL);
      expect(outcome.correct).toBe(true);
      rounds += 1;
      if (outcome.next === null) break;
      run = outcome.next;
      // Guard the test itself against an engine change that removes the cap.
      expect(rounds).toBeLessThanOrEqual(MAX_ROUNDS);
    }

    expect(rounds).toBe(MAX_ROUNDS);
  });
});
