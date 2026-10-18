import { describe, expect, it } from 'vitest';
import { DICTIONARY, levelByNumber } from '../../data/wordfall';
import { createContext, newGame } from './engine';
import { isWordfallSave, isWordfallState, persistableWordfallState, rehydrate, shouldReportOutcome } from './persistence';
import type { WordfallState } from './types';

const ctx = createContext(levelByNumber(1)!, DICTIONARY);
const valid = (): WordfallState => newGame(ctx, 4242);

describe('isWordfallState', () => {
  it('accepts a state the engine produced', () => {
    expect(isWordfallState(valid())).toBe(true);
  });

  it('survives a JSON round trip', () => {
    // The real path: state is written to AsyncStorage as JSON and read back.
    expect(isWordfallState(JSON.parse(JSON.stringify(valid())))).toBe(true);
  });

  it('rejects non-objects', () => {
    for (const value of [null, undefined, 42, 'state', []]) {
      expect(isWordfallState(value)).toBe(false);
    }
  });

  it('rejects a board whose tile count disagrees with its size', () => {
    // Left unchecked this indexes out of bounds on the first neighbour lookup.
    const state = valid();
    expect(
      isWordfallState({ ...state, board: { ...state.board, tiles: state.board.tiles.slice(0, 10) } }),
    ).toBe(false);
  });

  it('rejects a malformed tile', () => {
    const state = valid();
    const cases = [
      { id: 1, letter: 'AB', special: null, crate: false },
      { id: 1, letter: '1', special: null, crate: false },
      { id: 1, letter: 'a', special: 'meteor', crate: false },
      { id: 1, letter: 'a', special: null, crate: 'no' },
      { letter: 'a', special: null, crate: false },
    ];
    for (const bad of cases) {
      const tiles = state.board.tiles.slice();
      tiles[5] = bad as never;
      expect(isWordfallState({ ...state, board: { ...state.board, tiles } }), JSON.stringify(bad)).toBe(
        false,
      );
    }
  });

  it('rejects a selection pointing off the board', () => {
    // A hand-edited save could otherwise crash the screen on the next render.
    const state = valid();
    expect(isWordfallState({ ...state, selection: [9999] })).toBe(false);
    expect(isWordfallState({ ...state, selection: [-1] })).toBe(false);
  });

  it('rejects impossible counters', () => {
    const state = valid();
    expect(isWordfallState({ ...state, movesLeft: -1 })).toBe(false);
    expect(isWordfallState({ ...state, score: -5 })).toBe(false);
    expect(isWordfallState({ ...state, status: 'paused' })).toBe(false);
  });
});

describe('rehydrate', () => {
  it('drops the half-finished trace and stale feedback', () => {
    const state: WordfallState = {
      ...valid(),
      selection: [0, 1, 2],
      rejection: { kind: 'not-a-word', word: 'xyz' },
      lastPlay: {
        word: 'stone',
        points: 100,
        rarity: 0.2,
        created: null,
        triggered: [],
        cleared: [0],
        cratesBroken: 0,
        chain: 1,
      },
    };
    const restored = rehydrate(state);
    expect(restored.selection).toEqual([]);
    expect(restored.rejection).toBe(null);
    expect(restored.lastPlay).toBe(null);
  });

  it('keeps everything that represents progress', () => {
    const state = { ...valid(), score: 1234, movesLeft: 3, played: ['stone'], progress: [4] };
    const restored = rehydrate(state);
    expect(restored.score).toBe(1234);
    expect(restored.movesLeft).toBe(3);
    expect(restored.played).toEqual(['stone']);
    expect(restored.progress).toEqual([4]);
    expect(restored.board).toEqual(state.board);
  });
});

describe('terminal saves', () => {
  it('does not persist a won or lost board', () => {
    const playing = valid();
    expect(persistableWordfallState(playing)).toBe(playing);
    expect(persistableWordfallState({ ...playing, status: 'won' })).toBeNull();
    expect(persistableWordfallState({ ...playing, status: 'lost' })).toBeNull();
  });

  it('does not report a result that was already on screen when the save loaded', () => {
    expect(shouldReportOutcome('playing')).toBe(true);
    expect(shouldReportOutcome('won')).toBe(false);
    expect(shouldReportOutcome('lost')).toBe(false);
  });
});

describe('boost fields on old saves', () => {
  it('accepts a state and a save written before boosts', () => {
    const state = valid();
    expect(state.bonusMs).toBeUndefined();
    expect(state.extraMovesGranted).toBeUndefined();
    expect(isWordfallState(state)).toBe(true);
    expect(isWordfallSave({ unlocked: 1, state })).toBe(true);
    expect(isWordfallSave({ unlocked: 1, state: null })).toBe(true);
  });

  it('accepts a finite bonus and a boosted flag, and rejects nonsense', () => {
    const state = valid();
    expect(isWordfallState({ ...state, bonusMs: 0, extraMovesGranted: false })).toBe(true);
    expect(isWordfallState({ ...state, bonusMs: 10_000, extraMovesGranted: true })).toBe(true);
    expect(isWordfallState({ ...state, bonusMs: -1 })).toBe(false);
    expect(isWordfallState({ ...state, bonusMs: Number.POSITIVE_INFINITY })).toBe(false);
    expect(isWordfallState({ ...state, extraMovesGranted: 'yes' })).toBe(false);
    expect(isWordfallSave({ unlocked: 1, state, boosted: true })).toBe(true);
    expect(isWordfallSave({ unlocked: 1, state, boosted: false })).toBe(true);
    expect(isWordfallSave({ unlocked: 1, state: null, boosted: 'yes' })).toBe(false);
  });
});
