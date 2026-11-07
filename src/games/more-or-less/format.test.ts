import { describe, expect, it } from 'vitest';
import { formatMetric, sourceName } from './format';

describe('formatMetric', () => {
  it('writes a pageview count exactly as the cards always have', () => {
    expect(formatMetric(381_811)).toBe('381,811');
    expect(formatMetric(12.6)).toBe('13');
    expect(formatMetric(1_234_567_890)).toBe('1,234,567,890');
  });

  it('writes big populations compactly, to three significant figures', () => {
    const people = { compact: true };
    expect(formatMetric(1_404_890_000, people)).toBe('1.4B');
    expect(formatMetric(211_400_708, people)).toBe('211M');
    expect(formatMetric(69_281_437, people)).toBe('69.3M');
    expect(formatMetric(376_248, people)).toBe('376K');
    // Under the compact threshold every digit stays.
    expect(formatMetric(11_204, people)).toBe('11,204');
  });

  it('adds units and keeps small areas readable', () => {
    const area = { compact: true, suffix: ' km²', decimals: 2 };
    expect(formatMetric(17_075_400, area)).toBe('17.1M km²');
    expect(formatMetric(242_495, area)).toBe('242K km²');
    expect(formatMetric(76_363, area)).toBe('76,363 km²');
    expect(formatMetric(0.44, area)).toBe('0.44 km²');
    expect(formatMetric(2.08, area)).toBe('2.08 km²');
  });

  it('writes heights and lengths with their unit, no compacting', () => {
    expect(formatMetric(8849, { suffix: ' m' })).toBe('8,849 m');
    expect(formatMetric(6650, { suffix: ' km' })).toBe('6,650 km');
  });

  it('writes money with its prefix', () => {
    expect(formatMetric(2_923_706_026, { prefix: '$', compact: true })).toBe('$2.92B');
    expect(formatMetric(27_720_709_000_000, { prefix: '$', compact: true })).toBe('$27.7T');
  });

  it('counts up cleanly from zero', () => {
    // The reveal animates from 0 to the value; every frame must be readable.
    const people = { compact: true };
    expect(formatMetric(0, people)).toBe('0');
    expect(formatMetric(99_999.4, people)).toBe('99,999');
    expect(formatMetric(100_000, people)).toBe('100K');
  });

  it('never shows NaN', () => {
    expect(formatMetric(Number.NaN)).toBe('—');
    expect(formatMetric(Number.POSITIVE_INFINITY, { compact: true })).toBe('—');
  });
});

describe('sourceName', () => {
  it('names the source a player can look up', () => {
    expect(sourceName('wikipedia-pageviews:20260401-20260930')).toBe('Wikipedia');
    expect(sourceName('wikidata:20261107')).toBe('Wikidata');
    expect(sourceName('mock')).toBe('mock');
    expect(sourceName(undefined)).toBe('');
  });
});
