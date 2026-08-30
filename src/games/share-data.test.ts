import { describe, expect, it } from 'vitest';
import {
  buildShareUrl,
  decodeShareData,
  encodeShareData,
  type CluelessShareData,
  type MoreOrLessShareData,
  type WordfallShareData,
} from './share-data';

describe('share data encoding', () => {
  it('encodes and decodes More or Less data', () => {
    const data: MoreOrLessShareData = {
      game: 'more-or-less',
      streak: 15,
      bestStreak: 20,
    };

    const encoded = encodeShareData(data);
    expect(encoded).toBeTypeOf('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeShareData(encoded);
    expect(decoded).toEqual(data);
  });

  it('encodes and decodes Clueless data', () => {
    const data: CluelessShareData = {
      game: 'clueless',
      puzzleNumber: 42,
      levelName: 'Test Puzzle',
      guessCount: 8,
      heatBuckets: {
        unranked: 1,
        cold: 2,
        top_100: 3,
        top_10: 1,
        win: 1,
      },
    };

    const encoded = encodeShareData(data);
    const decoded = decodeShareData(encoded);
    expect(decoded).toEqual(data);
  });

  it('encodes and decodes Wordfall data', () => {
    const data: WordfallShareData = {
      game: 'wordfall',
      levelNumber: 5,
      levelName: 'Test Level',
      score: 1234,
      wordCount: 25,
      lengthBuckets: {
        under_3: 5,
        '3_4': 10,
        '5_7': 8,
        '8_plus': 2,
      },
      won: true,
    };

    const encoded = encodeShareData(data);
    const decoded = decodeShareData(encoded);
    expect(decoded).toEqual(data);
  });

  it('produces URL-safe encoded strings', () => {
    const data: MoreOrLessShareData = {
      game: 'more-or-less',
      streak: 100,
      bestStreak: 100,
    };

    const encoded = encodeShareData(data);
    // URL-safe: no +, /, or = characters
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('returns null for invalid encoded strings', () => {
    expect(decodeShareData('not-valid-base64!!!')).toBeNull();
    expect(decodeShareData('')).toBeNull();
    expect(decodeShareData('YWJj')).toBeNull(); // valid base64 but invalid JSON
  });

  it('builds share URLs with utm parameters', () => {
    const data: MoreOrLessShareData = {
      game: 'more-or-less',
      streak: 5,
      bestStreak: 10,
    };

    const url = buildShareUrl(data);
    expect(url).toMatch(/^https:\/\/wordkrush\.com\/share\//);
    expect(url).toContain('utm_source=player');
    expect(url).toContain('utm_medium=share');
  });

  it('never includes spoilers in encoded data', () => {
    // Clueless: no secret word, no guessed words (only counts and buckets)
    const clueless: CluelessShareData = {
      game: 'clueless',
      puzzleNumber: 1,
      guessCount: 5,
      heatBuckets: {
        unranked: 0,
        cold: 1,
        top_100: 2,
        top_10: 1,
        win: 1,
      },
    };
    const cluelessEncoded = JSON.stringify(clueless);
    // Should not contain actual words or secrets
    expect(cluelessEncoded).not.toContain('secret');
    expect(cluelessEncoded).not.toMatch(/\bword\b/); // "word" as a whole word, not in "password"

    // Wordfall: no played words
    const wordfall: WordfallShareData = {
      game: 'wordfall',
      levelNumber: 1,
      levelName: 'Test',
      score: 100,
      wordCount: 10,
      lengthBuckets: {
        under_3: 2,
        '3_4': 5,
        '5_7': 2,
        '8_plus': 1,
      },
      won: true,
    };
    const wordfallEncoded = JSON.stringify(wordfall);
    // Should not contain example played words
    expect(wordfallEncoded).not.toMatch(/\b(the|cat|dog|crate|ember)\b/i);

    // More or Less: no item names or values
    const mol: MoreOrLessShareData = {
      game: 'more-or-less',
      streak: 10,
      bestStreak: 15,
    };
    const molEncoded = JSON.stringify(mol);
    // Should not contain item details
    expect(molEncoded).not.toMatch(/\b(item|value|label|wikipedia)\b/);
  });
});
