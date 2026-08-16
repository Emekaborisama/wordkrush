/**
 * Dataset integrity tests. These run against the REAL bundled category files,
 * so a broken or degraded dataset fails CI before it can reach a player.
 *
 * This is the check that a schema alone cannot give you: the data can be
 * perfectly well-formed and still make an unplayable game.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isFairPair, ratio } from '../game/pairing';
import type { Category, Item } from '../game/types';

const DIR = fileURLToPath(new URL('./categories/', import.meta.url));
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));

it('has at least one category bundled', () => {
  expect(files.length).toBeGreaterThan(0);
});

describe.each(files)('%s', (file) => {
  const category: Category & { provisional?: boolean } = JSON.parse(
    readFileSync(DIR + file, 'utf8'),
  );
  const items: Item[] = category.items;

  it('has the required category metadata', () => {
    expect(category.id).toBeTruthy();
    expect(category.name).toBeTruthy();
    expect(category.metricLabel).toBeTruthy();
    expect(['count', 'currency', 'percent']).toContain(category.unit);
  });

  it('does not claim to measure Google searches', () => {
    // We ship Wikipedia pageviews. Labelling them as search volume would be a
    // factual claim the data cannot support (STACK D-012).
    expect(category.metricLabel.toLowerCase()).not.toContain('google');
  });

  it('has enough items to sustain a run', () => {
    expect(items.length).toBeGreaterThanOrEqual(20);
  });

  it('has unique ids and labels', () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(new Set(items.map((i) => i.label)).size).toBe(items.length);
  });

  it('has positive finite values on every item', () => {
    for (const item of items) {
      expect(Number.isFinite(item.value), `${item.label}`).toBe(true);
      expect(item.value, `${item.label}`).toBeGreaterThan(0);
    }
  });

  it('tags every item with its category and provenance', () => {
    for (const item of items) {
      expect(item.categoryId).toBe(category.id);
      expect(item.source, `${item.label} missing source`).toBeTruthy();
      expect(item.updatedAt, `${item.label} missing updatedAt`).toBeTruthy();
    }
  });

  it('ships no image without a licence and a credit', () => {
    // CC BY / CC BY-SA require attribution, and an unlicensed image must
    // never reach a build. Failing here is cheaper than a takedown notice.
    for (const item of items) {
      if (!item.imageUrl) continue;
      expect(item.imageLicense, `${item.label} has an image but no licence`).toBeTruthy();
      expect(item.imageAttribution, `${item.label} has an image but no credit`).toBeTruthy();
      expect(item.imageUrl.startsWith('https://'), `${item.label} image must be https`).toBe(true);
    }
  });

  it('ships only freely-licensed images', () => {
    const free = /^(cc0|cc[ -]by([ -]sa)?|public domain|pd|no restrictions)/i;
    for (const item of items) {
      if (!item.imageUrl) continue;
      expect(free.test(item.imageLicense!), `${item.label}: "${item.imageLicense}"`).toBe(true);
    }
  });

  it('spans a wide enough value range to support the difficulty curve', () => {
    // The hardest band needs pairs 1.15-1.5x apart; the easiest needs >=3x.
    // A flat dataset silently makes the difficulty curve a no-op.
    const values = items.map((i) => i.value);
    expect(ratio(Math.max(...values), Math.min(...values))).toBeGreaterThan(10);
  });

  it('can produce fair pairs at every difficulty band', () => {
    const bands: [string, number, number][] = [
      ['easy', 3.0, Infinity],
      ['medium', 2.0, 3.0],
      ['hard', 1.5, 2.0],
      ['expert', 1.15, 1.5],
    ];
    for (const [name, min, max] of bands) {
      let found = 0;
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          if (!isFairPair(items[i], items[j])) continue;
          const r = ratio(items[i].value, items[j].value);
          if (r >= min && r < max) found++;
        }
      }
      // Needs real headroom, not one lucky pair, or runs repeat themselves.
      expect(found, `band "${name}" has only ${found} usable pairs`).toBeGreaterThan(10);
    }
  });
});
