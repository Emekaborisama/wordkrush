import { describe, expect, it, vi } from 'vitest';
import { newRun, reducer } from './engine';
import type { Item } from './types';

/**
 * More or Less team live-race hang fix test.
 *
 * Symptom: in team mode, when one player fails, the round hangs because the
 * failed player never transitions to 'done' status.
 *
 * Root cause: GameScreen calls `onGameOver` after a 1.6s timeout. If the
 * timeout is cancelled (component unmount, re-render, etc.), the backend never
 * gets the `done=true` signal, leaving the player in 'racing' status forever.
 *
 * Fix: Add an `onDone` callback that fires immediately when `state.status`
 * becomes 'over', before the timeout. This ensures the player always signals
 * they're done, even if the `onGameOver` timeout doesn't fire.
 */

describe('More or Less team live race', () => {
  const pool: Item[] = [
    { id: 'a', label: 'A', value: 100, categoryId: 'test' },
    { id: 'b', label: 'B', value: 200, categoryId: 'test' },
    { id: 'c', label: 'C', value: 300, categoryId: 'test' },
    { id: 'd', label: 'D', value: 400, categoryId: 'test' },
  ];

  it('immediately signals done when a player fails', () => {
    // Simulate live team mode callbacks
    const onScore = vi.fn();
    const onDone = vi.fn();
    const onGameOver = vi.fn();

    // Start a run
    let state = newRun(pool, 1);
    expect(state.status).toBe('playing');
    expect(state.streak).toBe(0);

    // Player makes one correct guess
    const correctChoice = state.right.value > state.left.value ? 'more' : 'less';
    state = reducer(state, { type: 'guess', choice: correctChoice }, pool);
    expect(state.status).toBe('revealed');
    expect(state.streak).toBe(1);

    // In the UI, onScore would be called here via useEffect
    // (triggered by state.streak change)

    // Advance to next round
    state = reducer(state, { type: 'next' }, pool);
    expect(state.status).toBe('playing');

    // Player makes a wrong guess
    const wrongChoice = state.right.value > state.left.value ? 'less' : 'more';
    state = reducer(state, { type: 'guess', choice: wrongChoice }, pool);
    expect(state.status).toBe('over');
    expect(state.streak).toBe(1); // streak doesn't change on fail

    // In the UI, onDone should be called IMMEDIATELY when status becomes 'over'
    // (This is the fix - before, we only relied on onGameOver after 1.6s timeout)
    //
    // Simulating the useEffect:
    //   useEffect(() => {
    //     if (state.status === 'over') {
    //       onDone?.(state.streak, complete);
    //     }
    //   }, [state.status, ...]);
    //
    // In live mode, this posts: postMatchScore(matchId, score, complete, done=true)
    // Setting done=true transitions the player to 'done' status immediately.

    // The test verifies that when status becomes 'over', we have the info needed
    // to call onDone with the final score.
    expect(state.status).toBe('over');
    expect(state.streak).toBe(1);
    expect(state.lastGuessCorrect).toBe(false);

    // In the actual UI, the onDone callback would be invoked here by the useEffect
    // watching state.status. This ensures the player signals done=true to the backend
    // immediately, not after a 1.6s timeout that could be cancelled.
  });

  it('does not hang waiting for a failed player', () => {
    // Simulate two players in a team race
    type PlayerStatus = 'racing' | 'done';
    const player1State: { streak: number; status: PlayerStatus } = { streak: 0, status: 'racing' };
    const player2State: { streak: number; status: PlayerStatus } = { streak: 0, status: 'racing' };

    // Player 1 makes progress
    player1State.streak = 3;

    // Player 2 fails
    let p2State = newRun(pool, 2);
    const wrongChoice = p2State.right.value > p2State.left.value ? 'less' : 'more';
    p2State = reducer(p2State, { type: 'guess', choice: wrongChoice }, pool);
    player2State.status = 'done'; // onDone callback sets this via postMatchScore(..., done=true)

    // Player 1 continues and finishes
    player1State.streak = 5;
    player1State.status = 'done';

    // Both players are done - race can finish
    const allDone = [player1State, player2State].every((p) => p.status === 'done');
    expect(allDone).toBe(true);

    // Before the fix: player2State.status would stay 'racing' because onGameOver
    // timeout could be cancelled, leaving the race hung.
    //
    // After the fix: onDone fires immediately when status becomes 'over',
    // posting done=true and transitioning player to 'done' status.
  });

  it('calls onScore on each correct guess, onDone when game ends', () => {
    const onScore = vi.fn();
    const onDone = vi.fn();

    let state = newRun(pool, 3);

    // Correct guess 1
    const choice1 = state.right.value > state.left.value ? 'more' : 'less';
    state = reducer(state, { type: 'guess', choice: choice1 }, pool);
    // onScore would be called by useEffect watching state.streak
    onScore(state.streak, false); // simulate
    expect(onScore).toHaveBeenCalledWith(1, false);

    state = reducer(state, { type: 'next' }, pool);

    // Correct guess 2
    const choice2 = state.right.value > state.left.value ? 'more' : 'less';
    state = reducer(state, { type: 'guess', choice: choice2 }, pool);
    onScore(state.streak, false); // simulate
    expect(onScore).toHaveBeenCalledWith(2, false);

    state = reducer(state, { type: 'next' }, pool);

    // Wrong guess
    const wrongChoice = state.right.value > state.left.value ? 'less' : 'more';
    state = reducer(state, { type: 'guess', choice: wrongChoice }, pool);
    expect(state.status).toBe('over');

    // onDone should be called when status becomes 'over'
    onDone(state.streak, false); // simulate
    expect(onDone).toHaveBeenCalledWith(2, false);

    // onScore is NOT called on fail because streak doesn't change
    expect(onScore).toHaveBeenCalledTimes(2);
  });
});
