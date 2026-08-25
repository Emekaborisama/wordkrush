import { describe, expect, it } from 'vitest';
import categoryJson from '../../../src/data/categories/wikipedia-popularity.json';
import { CATEGORY, METRIC_LABEL, POOL } from './pool';

describe('the bundled pool', () => {
  it('plays the newest published round so every player on the post sees the same names', () => {
    expect(CATEGORY.id).toBe('wikipedia-popularity');
    expect(POOL.length).toBeGreaterThanOrEqual(20);
    const latest = categoryJson.rounds?.at(-1);
    expect(latest).toBeDefined();
    expect(POOL.map((item) => item.id).sort()).toEqual([...(latest?.itemIds ?? [])].sort());
  });

  it('gives every item a positive, finite, comparable value', () => {
    for (const item of POOL) {
      expect(Number.isFinite(item.value)).toBe(true);
      expect(item.value).toBeGreaterThan(0);
    }
  });

  it('keeps every item in one category, so no pair can cross metrics', () => {
    for (const item of POOL) {
      expect(item.categoryId).toBe(CATEGORY.id);
    }
  });

  it('has no duplicate ids', () => {
    expect(new Set(POOL.map((item) => item.id)).size).toBe(POOL.length);
  });

  /**
   * D-012's honesty rule, enforced on this surface too: the metric is measured
   * Wikipedia pageviews and must never be presented as search volume.
   */
  it('does not claim to be a search metric', () => {
    expect(METRIC_LABEL.toLowerCase()).not.toContain('google');
    expect(METRIC_LABEL.toLowerCase()).not.toContain('search');
    expect(METRIC_LABEL).toContain('pageviews');
  });
});
