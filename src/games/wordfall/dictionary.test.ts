import { describe, expect, it } from 'vitest';
import { DICTIONARY } from '../../data/wordfall';
import { normalizeWord } from './dictionary';

// Runs against the REAL shipped dictionary. A fixture would prove the lookup
// code works and tell us nothing about whether the data players actually meet
// is any good — which is the part that decides if the game feels fair.

describe('shipped dictionary', () => {
  it('ships a usable word list and rarity ranking', () => {
    expect(DICTIONARY.commonWords.length).toBeGreaterThan(4000);
    expect(DICTIONARY.minLength).toBe(3);
    expect(DICTIONARY.maxLength).toBe(8);
  });

  it('weights every letter of the alphabet', () => {
    // A missing letter would be one the board can never deal, silently making
    // some words unformable.
    const letters = DICTIONARY.letterWeights.map(([l]) => l);
    expect(letters).toHaveLength(26);
    expect(letters.join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    for (const [, weight] of DICTIONARY.letterWeights) expect(weight).toBeGreaterThan(0);
  });

  it('weights vowels heavily enough to build words from', () => {
    const weights = new Map(DICTIONARY.letterWeights);
    const vowels = ['a', 'e', 'i', 'o', 'u'].reduce((n, v) => n + (weights.get(v) ?? 0), 0);
    const total = DICTIONARY.letterWeights.reduce((n, [, w]) => n + w, 0);
    // Below roughly a third and boards fill with unusable consonant clusters.
    expect(vowels / total).toBeGreaterThan(0.3);
  });
});

describe('isWord', () => {
  it('accepts everyday words', () => {
    for (const word of ['cat', 'stone', 'brave', 'light', 'shine', 'water', 'quiz', 'jazz']) {
      expect(DICTIONARY.isWord(word), word).toBe(true);
    }
  });

  it('accepts inflections that are not stored, only derived', () => {
    // The whole point of computing morphology at lookup time. Every one of
    // these is absent from the packed list.
    const inflections = [
      'cats',
      'zebras',
      'boxes',
      'cities',
      'running',
      'baked',
      'baking',
      'stopped',
      'tried',
      'died',
      'walked',
      'plays',
      'bigger',
      'biggest',
    ];
    for (const word of inflections) expect(DICTIONARY.isWord(word), word).toBe(true);
  });

  it('rejects the web junk the source vocabulary carried', () => {
    // These are in the bundled frequency list; they must not survive into a
    // word game.
    for (const word of ['www', 'http', 'href', 'ctrl', 'mediawiki']) {
      expect(DICTIONARY.isWord(word), word).toBe(false);
    }
  });

  it('rejects non-words', () => {
    for (const word of ['xyzzq', 'qqq', 'asdf', 'zzzz']) {
      expect(DICTIONARY.isWord(word), word).toBe(false);
    }
  });

  it('enforces the length bounds', () => {
    expect(DICTIONARY.isWord('at')).toBe(false);
    expect(DICTIONARY.isWord('elephants')).toBe(false);
  });

  it('normalises case and stray characters', () => {
    expect(DICTIONARY.isWord('  STONE ')).toBe(true);
    expect(normalizeWord(' Stone! ')).toBe('stone');
  });

  it('does not accept a bare suffix as a word', () => {
    // "ss" strips to nothing; a naive rule would accept it.
    expect(DICTIONARY.isWord('sss')).toBe(false);
  });
});

describe('rarityOf', () => {
  it('ranks the commonest words at the bottom of the scale', () => {
    expect(DICTIONARY.rarityOf('the')).toBeLessThan(0.05);
    expect(DICTIONARY.rarityOf('time')).toBeLessThan(0.1);
  });

  it('treats valid but uncommon words as maximally rare', () => {
    expect(DICTIONARY.rarityOf('quartz')).toBe(1);
  });

  it('falls back to the lemma when an inflection has no rank of its own', () => {
    // "braves" is not in the frequency list; "brave" is. Without the fallback
    // it would be scored as an exotic word, and pluralising everything would
    // become the optimal strategy.
    expect(DICTIONARY.rarityOf('braves')).toBeCloseTo(DICTIONARY.rarityOf('brave'), 5);
    expect(DICTIONARY.rarityOf('happier')).toBeCloseTo(DICTIONARY.rarityOf('happy'), 5);
  });

  it('prefers an inflection’s own rank when the data has one', () => {
    // Plurals really are less frequent than their singulars, so measured data
    // beats the fallback where it exists.
    expect(DICTIONARY.rarityOf('cats')).toBeGreaterThan(DICTIONARY.rarityOf('cat'));
  });

  it('stays within 0..1', () => {
    for (const word of ['the', 'cat', 'quartz', 'aalii', 'stone']) {
      const r = DICTIONARY.rarityOf(word);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});
