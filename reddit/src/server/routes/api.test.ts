/**
 * End-to-end tests for the three routes the web view calls, against an
 * in-memory Devvit runtime (`../testing/devvit-fake.ts`).
 *
 * These exist because the routes are where the orchestration lives — the pure
 * layer is covered next door, but "does a second run overwrite the board" is
 * only answerable here.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from './api';
import { POOL } from '../../shared/pool';
import type { Choice, GuessResponse, InitResponse, RoundView } from '../../shared/api';
import { resetDevvitFake, signInAs } from '../testing/devvit-fake';

/** What a player who could see the hidden value would answer. */
function correctChoice(round: RoundView): Choice {
  const challenger = POOL.find((item) => item.label === round.right.label);
  if (!challenger) throw new Error(`No pool item labelled ${round.right.label}`);
  return challenger.value > round.left.value ? 'more' : 'less';
}

const init = async (): Promise<InitResponse> =>
  (await api.request('/init')).json() as Promise<InitResponse>;

const guess = async (choice: Choice): Promise<Response> =>
  api.request('/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choice }),
  });

const guessJson = async (choice: Choice): Promise<GuessResponse> =>
  (await guess(choice)).json() as Promise<GuessResponse>;

const restart = async (): Promise<InitResponse> =>
  (await api.request('/restart', { method: 'POST' })).json() as Promise<InitResponse>;

/** Answer correctly `count` times, then miss. Returns the final response. */
async function playRun(count: number): Promise<GuessResponse> {
  let round = (await init()).round;
  if (!round) throw new Error('no opening round');

  let last: GuessResponse | null = null;
  for (let i = 0; i < count; i += 1) {
    last = await guessJson(correctChoice(round));
    if (!last.next) return last;
    round = last.next;
  }

  const right = correctChoice(round);
  last = await guessJson(right === 'more' ? 'less' : 'more');
  return last;
}

beforeEach(() => {
  resetDevvitFake();
});

describe('GET /api/init', () => {
  it('hands back a round with the challenger’s value withheld', async () => {
    const response = await init();

    expect(response.status).toBe('playing');
    expect(response.round?.left.value).toBeGreaterThan(0);
    expect(response.round?.right).toEqual({ label: expect.any(String) });
    expect(response.round?.right).not.toHaveProperty('value');
  });

  it('resumes the same round instead of restarting it', async () => {
    const first = await init();
    const second = await init();
    expect(second.round).toEqual(first.round);
  });

  it('names the metric without calling it a search figure', async () => {
    const response = await init();
    expect(response.metricLabel).toContain('pageviews');
    expect(response.metricLabel.toLowerCase()).not.toContain('google');
  });

  it('reports the post as unidentified rather than guessing', async () => {
    signInAs('alice');
    const { context } = await import('../testing/devvit-fake');
    context.postId = undefined;

    const response = await api.request('/init');
    expect(response.status).toBe(400);
  });
});

describe('POST /api/guess', () => {
  it('releases the hidden value and the next question together', async () => {
    const round = (await init()).round as RoundView;
    const response = await guessJson(correctChoice(round));

    expect(response.correct).toBe(true);
    expect(response.streak).toBe(1);
    expect(response.revealed).toBeGreaterThan(0);
    expect(response.next?.index).toBe(1);
    // The reveal is what hides the round trip: the following question is
    // already in hand before the player finishes reading the number.
    expect(response.next?.left.label).toBe(round.right.label);
  });

  it('ends the run on a wrong answer', async () => {
    const round = (await init()).round as RoundView;
    const wrong = correctChoice(round) === 'more' ? 'less' : 'more';
    const response = await guessJson(wrong);

    expect(response.correct).toBe(false);
    expect(response.status).toBe('over');
    expect(response.next).toBeNull();
    expect(response.result?.streak).toBe(0);
  });

  it('refuses a guess once the run is over', async () => {
    await playRun(0);
    const late = await guess('more');
    expect(late.status).toBe(409);
  });

  it('rejects a body that is not a choice', async () => {
    await init();
    const response = await api.request('/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choice: 'maybe' }),
    });
    expect(response.status).toBe(400);
  });
});

describe('the board', () => {
  it('records a finished run and ranks it', async () => {
    const response = await playRun(3);

    expect(response.result?.streak).toBe(3);
    expect(response.result?.recorded).toBe(true);
    expect(response.result?.rank).toBe(1);
    expect(response.board.top).toEqual([{ username: 'alice', streak: 3 }]);
  });

  /**
   * The rule the whole board depends on. Everyone gets the same sequence, so a
   * replay is the same questions with the answers already known — if a second
   * run could overwrite the first, the board would rank persistence, not skill.
   */
  it('keeps the first run and ignores a better replay', async () => {
    await playRun(2);
    await restart();
    const replay = await playRun(6);

    expect(replay.result?.streak).toBe(6);
    expect(replay.result?.recorded).toBe(false);
    expect(replay.result?.share).toBe('');
    expect(replay.board.top).toEqual([{ username: 'alice', streak: 2 }]);
  });

  it('orders players by streak and gives each their own rank', async () => {
    await playRun(2);
    signInAs('bob');
    const bob = await playRun(5);

    expect(bob.result?.rank).toBe(1);
    expect(bob.board.players).toBe(2);
    expect(bob.board.top).toEqual([
      { username: 'bob', streak: 5 },
      { username: 'alice', streak: 2 },
    ]);
  });

  /**
   * `context.username` is experimental upstream and is the board's only
   * identity. If it ever stops being populated, scores must not silently stop
   * recording — the fallback to `reddit.getCurrentUsername()` covers that, and
   * nothing else would make the failure visible.
   */
  it('still records when the context omits the handle', async () => {
    const { context } = await import('../testing/devvit-fake');
    context.username = undefined;

    const response = await playRun(2);
    expect(response.result?.recorded).toBe(true);
    expect(response.board.top).toEqual([{ username: 'alice', streak: 2 }]);
  });

  it('lets a logged-out reader play but not be ranked', async () => {
    signInAs(null);
    const response = await playRun(4);

    expect(response.result?.streak).toBe(4);
    expect(response.result?.recorded).toBe(false);
    expect(response.result?.rank).toBeNull();
    expect(response.board.players).toBe(0);
  });

  it('shows a returning player the result they already set', async () => {
    await playRun(3);
    const reopened = await init();

    expect(reopened.status).toBe('over');
    expect(reopened.round).toBeNull();
    expect(reopened.result?.streak).toBe(3);
    expect(reopened.result?.recorded).toBe(true);
    expect(reopened.result?.share).toContain('Streak 3');
  });
});

describe('everyone on a post plays the same run', () => {
  it('deals the same opening pair to different players', async () => {
    const alice = await init();
    signInAs('bob');
    const bob = await init();

    expect(bob.round).toEqual(alice.round);
  });
});

describe('POST /api/restart', () => {
  it('starts the day over from round zero', async () => {
    const opening = (await init()).round as RoundView;
    const round = (await init()).round as RoundView;
    await guessJson(correctChoice(round));

    const replay = await restart();
    expect(replay.streak).toBe(0);
    expect(replay.round).toEqual(opening);
  });
});
