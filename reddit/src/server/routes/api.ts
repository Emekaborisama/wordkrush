/**
 * The three calls the web view makes.
 *
 * `GET /api/init`     — what should be on screen right now.
 * `POST /api/guess`   — judge one answer and hand back the next question.
 * `POST /api/restart` — replay the day for fun; does not touch the board.
 *
 * The guess route is the one that matters. It is the only place a streak is
 * counted, and it counts from state the client has never been shown.
 */
import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  Choice,
  ErrorResponse,
  GuessResponse,
  InitResponse,
  ResultView,
} from '../../shared/api';
import { METRIC_LABEL, POOL } from '../../shared/pool';
import { applyGuess, isPlayable, startRun, toRoundView } from '../../shared/rounds';
import { buildShareText } from '../../shared/result';
import { rankOf, readBoard, recordRun, recordedStreak } from '../core/board';
import { clearRun, loadRun, readPostDay, saveRun } from '../core/run';

export const api = new Hono();

/**
 * Who is asking.
 *
 * `userId` is the signed-in account. `loid` is the token Reddit assigns on
 * first visit, which is what lets a logged-out reader still play a whole run —
 * they simply cannot be ranked, because there is no account to put on a board.
 *
 * `context.username` is marked experimental upstream, and it is the board's
 * only identity. Rather than trust it, a signed-in caller without a handle
 * falls back to the stable `reddit.getCurrentUsername()`; if that ever stopped
 * being populated, every score would silently stop recording and nothing would
 * look broken.
 */
async function caller(): Promise<{
  postId: string;
  playerKey: string;
  username: string | null;
} | null> {
  const { postId, userId, loid, username } = context;
  const playerKey = userId ?? loid;
  if (!postId || !playerKey) return null;

  const handle = username ?? (userId ? ((await reddit.getCurrentUsername()) ?? null) : null);
  return { postId, playerKey, username: handle };
}

function readChoice(body: unknown): Choice | null {
  if (typeof body !== 'object' || body === null) return null;
  const choice = (body as Record<string, unknown>).choice;
  return choice === 'more' || choice === 'less' ? choice : null;
}

function buildResult(input: {
  streak: number;
  recorded: boolean;
  rank: number | null;
  dayLabel: string;
  players: number;
}): ResultView {
  const { streak, recorded, rank, dayLabel, players } = input;
  return {
    streak,
    rank,
    players,
    recorded,
    // A replay already knows the answers, so there is nothing honest to post
    // about it. The UI hides the share button when this is empty.
    share: recorded ? buildShareText({ dayLabel, streak, rank, players }) : '',
  };
}

api.get('/init', async (c) => {
  const who = await caller();
  if (!who) {
    return c.json<ErrorResponse>(
      { type: 'error', message: 'This post could not be identified. Try opening it directly.' },
      400,
    );
  }

  const { postId, playerKey, username } = who;

  try {
    const [day, board, stored] = await Promise.all([
      readPostDay(postId),
      readBoard(postId),
      loadRun(postId, playerKey),
    ]);

    const base = {
      type: 'init' as const,
      dayLabel: day.label,
      metricLabel: METRIC_LABEL,
      username,
      board,
    };

    if (stored && isPlayable(stored)) {
      return c.json<InitResponse>({
        ...base,
        status: 'playing',
        round: toRoundView(stored),
        streak: stored.state.streak,
        result: null,
      });
    }

    // No run in progress. If they already finished one here, show them that
    // result again rather than quietly restarting the day underneath them.
    const finished = await recordedStreak(postId, username);
    if (finished !== null) {
      const rank = await rankOf(postId, username);
      return c.json<InitResponse>({
        ...base,
        status: 'over',
        round: null,
        streak: finished,
        result: buildResult({
          streak: finished,
          recorded: true,
          rank,
          dayLabel: day.label,
          players: board.players,
        }),
      });
    }

    const fresh = startRun(POOL, day.seed);
    await saveRun(postId, playerKey, fresh);

    return c.json<InitResponse>({
      ...base,
      status: 'playing',
      round: toRoundView(fresh),
      streak: 0,
      result: null,
    });
  } catch (error) {
    console.error(`init failed for ${postId}:`, error);
    return c.json<ErrorResponse>(
      { type: 'error', message: 'Could not load today’s round.' },
      500,
    );
  }
});

api.post('/guess', async (c) => {
  const who = await caller();
  if (!who) {
    return c.json<ErrorResponse>({ type: 'error', message: 'Not in a post.' }, 400);
  }

  const { postId, playerKey, username } = who;

  let choice: Choice | null = null;
  try {
    choice = readChoice(await c.req.json());
  } catch {
    choice = null;
  }
  if (!choice) {
    return c.json<ErrorResponse>({ type: 'error', message: 'Expected "more" or "less".' }, 400);
  }

  try {
    const stored = await loadRun(postId, playerKey);
    // A double-tapped button, or a guess sent after the run ended. Rejecting is
    // right: the reducer would ignore it anyway, and answering "correct" from a
    // stale flag would score a round the player never played.
    if (!stored || !isPlayable(stored)) {
      return c.json<ErrorResponse>({ type: 'error', message: 'That round is already over.' }, 409);
    }

    const day = await readPostDay(postId);
    const outcome = applyGuess(stored, choice, POOL);

    if (outcome.next) {
      await saveRun(postId, playerKey, outcome.next);
      return c.json<GuessResponse>({
        type: 'guess',
        correct: outcome.correct,
        revealed: outcome.revealed,
        streak: outcome.streak,
        status: 'playing',
        next: toRoundView(outcome.next),
        result: null,
        board: await readBoard(postId),
      });
    }

    await clearRun(postId, playerKey);
    const { recorded, rank } = await recordRun(postId, username, outcome.streak);
    const board = await readBoard(postId);

    return c.json<GuessResponse>({
      type: 'guess',
      correct: outcome.correct,
      revealed: outcome.revealed,
      streak: outcome.streak,
      status: 'over',
      next: null,
      result: buildResult({
        streak: outcome.streak,
        recorded,
        rank,
        dayLabel: day.label,
        players: board.players,
      }),
      board,
    });
  } catch (error) {
    console.error(`guess failed for ${postId}:`, error);
    return c.json<ErrorResponse>({ type: 'error', message: 'Could not score that round.' }, 500);
  }
});

api.post('/restart', async (c) => {
  const who = await caller();
  if (!who) {
    return c.json<ErrorResponse>({ type: 'error', message: 'Not in a post.' }, 400);
  }

  const { postId, playerKey, username } = who;

  try {
    const day = await readPostDay(postId);
    const fresh = startRun(POOL, day.seed);
    await saveRun(postId, playerKey, fresh);

    return c.json<InitResponse>({
      type: 'init',
      dayLabel: day.label,
      metricLabel: METRIC_LABEL,
      username,
      status: 'playing',
      round: toRoundView(fresh),
      streak: 0,
      result: null,
      board: await readBoard(postId),
    });
  } catch (error) {
    console.error(`restart failed for ${postId}:`, error);
    return c.json<ErrorResponse>({ type: 'error', message: 'Could not restart.' }, 500);
  }
});
