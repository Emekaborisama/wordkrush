import { describe, expect, it } from 'vitest';
import { isCluelessState, rehydrate } from './persistence';
import type { CluelessState } from './types';

const valid: CluelessState = {
  puzzleNumber: 3,
  guesses: [
    { word: 'blue', rank: 1 },
    { word: 'ocean', rank: 528 },
    { word: 'frozen', rank: null },
  ],
  status: 'won',
  lastWord: 'blue',
  rejection: null,
};

describe('isCluelessState', () => {
  it('accepts a well-formed saved session', () => {
    expect(isCluelessState(valid)).toBe(true);
  });

  it('accepts an unranked (cold) guess', () => {
    expect(isCluelessState({ ...valid, guesses: [{ word: 'x', rank: null }] })).toBe(true);
  });

  it('rejects malformed or hostile shapes', () => {
    // Persisted JSON is untrusted: hand-edited files, partial writes, old versions.
    expect(isCluelessState(null)).toBe(false);
    expect(isCluelessState('nope')).toBe(false);
    expect(isCluelessState({ ...valid, status: 'cheating' })).toBe(false);
    expect(isCluelessState({ ...valid, guesses: 'not-an-array' })).toBe(false);
    expect(isCluelessState({ ...valid, guesses: [{ word: '', rank: 1 }] })).toBe(false);
    expect(isCluelessState({ ...valid, guesses: [{ word: 'x', rank: 0 }] })).toBe(false);
    expect(isCluelessState({ ...valid, guesses: [{ word: 'x', rank: -3 }] })).toBe(false);
    expect(isCluelessState({ ...valid, guesses: [{ word: 'x', rank: 1.5 }] })).toBe(false);
    expect(isCluelessState({ ...valid, puzzleNumber: 'three' })).toBe(false);
  });
});

describe('rehydrate', () => {
  it('drops a stale rejection', () => {
    // A "not a word" error surfacing on resume would be baffling.
    const withError: CluelessState = {
      ...valid,
      rejection: { kind: 'not-a-word', word: 'zzz' },
    };
    expect(rehydrate(withError).rejection).toBeNull();
  });

  it('clears lastWord so the list does not replay its animation', () => {
    expect(rehydrate(valid).lastWord).toBeNull();
  });

  it('preserves the guesses and status', () => {
    const out = rehydrate(valid);
    expect(out.guesses).toEqual(valid.guesses);
    expect(out.status).toBe('won');
    expect(out.puzzleNumber).toBe(3);
  });
});
