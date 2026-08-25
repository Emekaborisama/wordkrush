import { describe, expect, it } from 'vitest';
import {
  RESERVOIR_TARGET,
  decodeArticleTitle,
  isPlayableReservoirTerm,
  isoWeekRoundId,
  loadReservoir,
  rankReservoir,
  sampleRound,
  seedFromRoundId,
  toReservoirTerm,
  uniqueTerms,
  unusedTerms,
} from './reservoir';

describe('isPlayableReservoirTerm', () => {
  it('keeps ordinary encyclopedic titles', () => {
    expect(isPlayableReservoirTerm('Pizza')).toBe(true);
    expect(isPlayableReservoirTerm('Taylor_Swift')).toBe(true);
    expect(isPlayableReservoirTerm('Spider-Man: No Way Home')).toBe(true);
  });

  it('rejects Wikimedia chrome, namespaces, lists, years, and adult titles', () => {
    expect(isPlayableReservoirTerm('Main_Page')).toBe(false);
    expect(isPlayableReservoirTerm('Special:Search')).toBe(false);
    expect(isPlayableReservoirTerm('Wikipedia:About')).toBe(false);
    expect(isPlayableReservoirTerm('File:Example.jpg')).toBe(false);
    expect(isPlayableReservoirTerm('Deaths in 2026')).toBe(false);
    expect(isPlayableReservoirTerm('List of countries')).toBe(false);
    expect(isPlayableReservoirTerm('Mercury (disambiguation)')).toBe(false);
    expect(isPlayableReservoirTerm('2024')).toBe(false);
    expect(isPlayableReservoirTerm('Pornhub')).toBe(false);
    expect(isPlayableReservoirTerm('XVideos')).toBe(false);
    expect(isPlayableReservoirTerm('-')).toBe(false);
  });
});

describe('decodeArticleTitle / toReservoirTerm', () => {
  it('turns underscores into a display title', () => {
    expect(decodeArticleTitle('New_York_City')).toBe('New York City');
    expect(toReservoirTerm('New_York_City')).toEqual({
      label: 'New York City',
      term: 'New York City',
    });
    expect(toReservoirTerm('Main_Page')).toBeNull();
  });
});

describe('rankReservoir', () => {
  it('puts curated extras first and ranks the rest by appearance count', () => {
    const appearances = new Map([
      ['Sushi', 1],
      ['Pizza', 5],
      ['Main_Page', 99],
    ]);
    const ranked = rankReservoir(appearances, [{ label: 'Avocado', term: 'Avocado' }]);
    expect(ranked.map((item) => item.term)).toEqual(['Avocado', 'Pizza', 'Sushi']);
  });
});

describe('uniqueTerms / unusedTerms / sampleRound', () => {
  it('drops duplicate terms case-insensitively', () => {
    expect(
      uniqueTerms([
        { label: 'Pizza', term: 'Pizza' },
        { label: 'pizza', term: 'pizza' },
      ]),
    ).toEqual([{ label: 'Pizza', term: 'Pizza' }]);
  });

  it('omits terms whose item id is already in the snapshot', () => {
    const unused = unusedTerms(
      [
        { label: 'Pizza', term: 'Pizza' },
        { label: 'Sushi', term: 'Sushi' },
      ],
      new Set(['cat.pizza']),
      (term) => `cat.${term.toLowerCase()}`,
    );
    expect(unused.map((item) => item.term)).toEqual(['Sushi']);
  });

  it('is deterministic for a seed and does not mutate the input', () => {
    const unused = [
      { label: 'A', term: 'A' },
      { label: 'B', term: 'B' },
      { label: 'C', term: 'C' },
      { label: 'D', term: 'D' },
    ];
    expect(sampleRound(unused, 7, 2)).toEqual(sampleRound(unused, 7, 2));
    expect(sampleRound(unused, 7, 2)).not.toEqual(sampleRound(unused, 8, 2));
    expect(unused).toHaveLength(4);
  });
});

describe('isoWeekRoundId', () => {
  it('names a Monday by its ISO week', () => {
    expect(isoWeekRoundId(new Date('2026-08-24T09:00:00Z'))).toBe('round-2026-W35');
  });

  it('hashes a round id to a stable seed', () => {
    expect(seedFromRoundId('round-2026-W35')).toBe(seedFromRoundId('round-2026-W35'));
    expect(seedFromRoundId('round-2026-W35')).not.toBe(seedFromRoundId('round-2026-W36'));
  });
});

describe('shipped reservoir', () => {
  it('is a large filtered list and contains none of the banned titles', () => {
    const file = loadReservoir();
    expect(file.items.length).toBeGreaterThan(1000);
    expect(file.items.length).toBeLessThanOrEqual(RESERVOIR_TARGET);
    for (const item of file.items) {
      expect(isPlayableReservoirTerm(item.term), item.term).toBe(true);
    }
  });
});
