/**
 * All of the game's client state.
 *
 * The client is a renderer here, not a referee — it holds no pool, no seed and
 * no answers, and it never decides whether a guess was right. Every transition
 * below is triggered by something the server said.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BoardView,
  Choice,
  GuessResponse,
  InitResponse,
  ResultView,
  RoundView,
} from '../../shared/api';

/**
 * How long the revealed value stays on screen before the next question.
 *
 * A wrong answer gets longer: that is the moment the player wants to read the
 * number and decide whether to be annoyed at themselves or at the data.
 */
const REVEAL_MS = { correct: 850, wrong: 1500 } as const;

export type Phase =
  | { name: 'loading' }
  | { name: 'error'; message: string }
  | { name: 'playing'; round: RoundView; busy: boolean }
  | {
      name: 'reveal';
      round: RoundView;
      revealed: number;
      correct: boolean;
      next: RoundView | null;
      result: ResultView | null;
    }
  | { name: 'over'; result: ResultView };

export type GameView = {
  dayLabel: string;
  metricLabel: string;
  username: string | null;
  board: BoardView;
  streak: number;
  phase: Phase;
};

const EMPTY_BOARD: BoardView = { players: 0, best: 0, top: [] };

const INITIAL: GameView = {
  dayLabel: '',
  metricLabel: '',
  username: null,
  board: EMPTY_BOARD,
  streak: 0,
  phase: { name: 'loading' },
};

/** One place that knows how this server reports a failure. */
async function request<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : fallback;
    throw new Error(message);
  }
  return body as T;
}

const json = (payload: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

function fromInit(response: InitResponse): GameView {
  return {
    dayLabel: response.dayLabel,
    metricLabel: response.metricLabel,
    username: response.username,
    board: response.board,
    streak: response.streak,
    phase:
      response.status === 'over' && response.result
        ? { name: 'over', result: response.result }
        : response.round
          ? { name: 'playing', round: response.round, busy: false }
          : { name: 'error', message: 'No round to play. Try reopening the post.' },
  };
}

export function useDailyRun() {
  const [view, setView] = useState<GameView>(INITIAL);
  /**
   * Two taps inside one frame both see `busy: false`, because neither has
   * re-rendered yet. The server would reject the second with a 409, but that
   * surfaces as an error screen mid-run — so stop it here.
   */
  const inFlight = useRef(false);

  const fail = useCallback((error: unknown) => {
    setView((prev) => ({
      ...prev,
      phase: { name: 'error', message: (error as Error).message },
    }));
  }, []);

  const enter = useCallback(
    async (path: string, init: RequestInit) => {
      setView((prev) => ({ ...prev, phase: { name: 'loading' } }));
      try {
        setView(fromInit(await request<InitResponse>(path, init, 'Could not load today’s run.')));
      } catch (error) {
        fail(error);
      }
    },
    [fail],
  );

  const load = useCallback(() => enter('/api/init', { method: 'GET' }), [enter]);
  const restart = useCallback(() => enter('/api/restart', json({})), [enter]);

  useEffect(() => {
    void load();
  }, [load]);

  const guess = useCallback(
    async (choice: Choice) => {
      if (view.phase.name !== 'playing' || view.phase.busy) return;
      if (inFlight.current) return;

      inFlight.current = true;
      const round = view.phase.round;
      setView((prev) =>
        prev.phase.name === 'playing'
          ? { ...prev, phase: { ...prev.phase, busy: true } }
          : prev,
      );

      try {
        const response = await request<GuessResponse>(
          '/api/guess',
          json({ choice }),
          'Could not score that round.',
        );
        setView((prev) => ({
          ...prev,
          streak: response.streak,
          board: response.board,
          phase: {
            name: 'reveal',
            round,
            revealed: response.revealed,
            correct: response.correct,
            next: response.next,
            result: response.result,
          },
        }));
      } catch (error) {
        fail(error);
      } finally {
        inFlight.current = false;
      }
    },
    [view.phase, fail],
  );

  // Hold the reveal, then move on to whatever the server already handed us.
  useEffect(() => {
    if (view.phase.name !== 'reveal') return;
    const { correct, next, result } = view.phase;

    const timer = setTimeout(
      () => {
        setView((prev) => {
          if (prev.phase.name !== 'reveal') return prev;
          if (next) return { ...prev, phase: { name: 'playing', round: next, busy: false } };
          if (result) return { ...prev, phase: { name: 'over', result } };
          return { ...prev, phase: { name: 'error', message: 'The run ended unexpectedly.' } };
        });
      },
      correct ? REVEAL_MS.correct : REVEAL_MS.wrong,
    );

    return () => clearTimeout(timer);
  }, [view.phase]);

  return { view, guess, restart, reload: load } as const;
}
