import { describe, expect, it } from 'vitest';
import type { EntityFacts } from './sources/wikidata';
import type { ImageInfo } from './sources/wikipedia-images';
import { UNIT } from './wikidata-metrics';
import {
  buildItems,
  formatBuildReport,
  imageArticle,
  isPlayable,
  listEntityCategories,
  loadEntityFile,
  parseEntityFile,
  wikidataItemId,
  type EntityFile,
} from './wikidata-snapshot';

const base = {
  category: { id: 'countries-population', name: 'Population', metricLabel: 'population', display: { compact: true } },
  metric: 'population',
  items: [
    { label: 'China', qid: 'Q148' },
    { label: 'Malta', qid: 'Q233' },
  ],
};

describe('parseEntityFile', () => {
  it('accepts a well-formed file and keeps its display', () => {
    const file = parseEntityFile(base);
    expect(file.metric).toBe('population');
    expect(file.category.display).toEqual({ compact: true });
    expect(file.items).toHaveLength(2);
  });

  it.each([
    ['an unknown metric', { ...base, metric: 'weight' }, /unknown metric/],
    ['a bad id', { ...base, category: { ...base.category, id: 'Countries Pop' } }, /kebab-case/],
    ['a Google claim', { ...base, category: { ...base.category, metricLabel: 'Google searches' } }, /Google/],
    ['a bad qid', { ...base, items: [{ label: 'X', qid: 'Q0' }] }, /valid qid/],
    ['an empty label', { ...base, items: [{ label: ' ', qid: 'Q1' }] }, /no label/],
    ['a repeated item', { ...base, items: [{ label: 'A', qid: 'Q1' }, { label: 'B', qid: 'Q1' }] }, /listed twice/],
    ['a repeated label', { ...base, items: [{ label: 'A', qid: 'Q1' }, { label: 'a', qid: 'Q2' }] }, /used twice/],
    ['a misspelt display key', { ...base, category: { ...base.category, display: { compcat: true } } }, /unknown keys/],
    ['silly decimals', { ...base, category: { ...base.category, display: { decimals: 9 } } }, /0–4/],
  ])('refuses %s', (_name, raw, message) => {
    expect(() => parseEntityFile(raw)).toThrow(message);
  });
});

const facts = (qid: string, amount: number | null, title?: string): EntityFacts => ({
  qid,
  ...(title ? { enwikiTitle: title } : {}),
  statements: amount === null ? [] : [{ id: `${qid}-s`, amount, unit: UNIT.one, rank: 'normal', parts: [] }],
});

const image = (url: string): ImageInfo => ({
  url,
  attribution: 'Someone',
  license: 'CC BY-SA 4.0',
  filePage: 'https://commons.wikimedia.org/wiki/File:X',
  restrictions: '',
});

describe('buildItems', () => {
  const file = parseEntityFile({
    ...base,
    items: [
      { label: 'China', qid: 'Q148' },
      { label: 'Malta', qid: 'Q233' },
      { label: 'Nowhere', qid: 'Q999' },
      { label: 'Ireland', qid: 'Q27', imageTerm: 'Dublin' },
    ],
  }) as EntityFile;
  const factMap = new Map([
    ['Q148', facts('Q148', 1_404_890_000, 'China')],
    ['Q233', facts('Q233', 553_214, 'Malta')],
    ['Q999', facts('Q999', null)],
    ['Q27', facts('Q27', 5_149_139, 'Republic of Ireland')],
  ]);
  const images = new Map([
    ['China', image('https://upload.wikimedia.org/china.png')],
    ['Dublin', image('https://upload.wikimedia.org/dublin.jpg')],
  ]);

  it('ships the selected value, the curated label, a stable id and provenance', () => {
    const { items, excluded } = buildItems(file, factMap, images, 'wikidata:20261107', '2026-11-07');
    expect(items.map((item) => item.label)).toEqual(['China', 'Ireland', 'Malta']);
    expect(items[0]).toEqual({
      id: 'countries-population.q148',
      categoryId: 'countries-population',
      label: 'China',
      value: 1_404_890_000,
      imageUrl: 'https://upload.wikimedia.org/china.png',
      imageAttribution: 'Someone',
      imageLicense: 'CC BY-SA 4.0',
      source: 'wikidata:20261107',
      updatedAt: '2026-11-07',
    });
    // imageTerm takes the photo from another article; no free photo ships none.
    expect(items[1].imageUrl).toBe('https://upload.wikimedia.org/dublin.jpg');
    expect(items[2].imageUrl).toBeUndefined();
    expect(excluded).toEqual([{ label: 'Nowhere', qid: 'Q999', reason: 'missing', values: [] }]);
  });

  it('names the article a photo comes from', () => {
    expect(imageArticle({ label: 'A', qid: 'Q1', imageTerm: 'B' }, facts('Q1', 1, 'A'))).toBe('B');
    expect(imageArticle({ label: 'A', qid: 'Q1' }, facts('Q1', 1, 'A'))).toBe('A');
    expect(imageArticle({ label: 'A', qid: 'Q1' }, undefined)).toBeUndefined();
  });

  it('keys items by qid, so a renamed label is the same item', () => {
    expect(wikidataItemId('islands-area', 'Q40')).toBe('islands-area.q40');
  });
});

describe('the report', () => {
  it('says what was left out and refuses an unplayable category', () => {
    const snapshot = {
      id: 'tiny',
      name: 'Tiny',
      metricLabel: 'area',
      unit: 'area',
      provisional: true as const,
      items: [
        { id: 'tiny.q1', categoryId: 'tiny', label: 'One', value: 10, source: 's', updatedAt: 'd' },
        { id: 'tiny.q2', categoryId: 'tiny', label: 'Two', value: 1, source: 's', updatedAt: 'd' },
      ],
    };
    expect(isPlayable(snapshot)).toBe(false);
    const report = formatBuildReport({
      snapshot,
      excluded: [{ label: 'Three', qid: 'Q3', reason: 'disputed', values: [447, 553] }],
      diff: { materialChange: true, added: [], removed: [], valueChanges: [], swings: [], sourceChanged: false, previousSource: null, nextSource: null, imageChanges: [] },
      failedImages: [],
    });
    expect(report).toContain('tiny: 2 items, 0/2 with a free photo, spread 10.0×');
    expect(report).toContain('NOT WRITTEN');
    expect(report).toContain('left out Three Q3: disputed (447 / 553)');
    expect(report).toContain('no photo: One');
  });
});

describe('the shipped entity files', () => {
  it('all parse, and each names its own file', () => {
    const ids = listEntityCategories();
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const file = loadEntityFile(id);
      expect(file.category.id).toBe(id);
      expect(file.items.length, id).toBeGreaterThanOrEqual(20);
    }
  });
});
