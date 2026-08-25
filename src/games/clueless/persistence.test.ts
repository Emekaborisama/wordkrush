import { describe, expect, it } from 'vitest';
import { isCluelessState, rehydrate } from './persistence';
import type { CluelessState } from './types';

const valid: CluelessState = {
  puzzleNumber: 3,
  hintPolicy: 'opening',
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
    expect(isCluelessState({ ...valid, hintPolicy: 'impossible' })).toBe(false);
    expect(isCluelessState({ ...valid, difficulty: 'impossible' })).toBe(false);
  });

  it('accepts sessions from before level-owned hint policies', () => {
    const { hintPolicy: _hintPolicy, ...legacy } = valid;
    expect(isCluelessState(legacy)).toBe(true);
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
    expect(out.hintPolicy).toBe('opening');
  });

  it('maps an old selected difficulty to its equivalent hint policy', () => {
    const { hintPolicy: _hintPolicy, ...legacy } = valid;
    expect(rehydrate({ ...legacy, difficulty: 'easy' }).hintPolicy).toBe('opening');
  });

  it('uses the caller fallback for an older session without assistance data', () => {
    const { hintPolicy: _hintPolicy, ...legacy } = valid;
    const empty = { ...legacy, guesses: [], status: 'playing' as const };
    expect(rehydrate(empty, 'none').hintPolicy).toBe('none');
  });
});
