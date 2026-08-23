import { describe, expect, it } from 'vitest';
import { CATEGORY, METRIC_LABEL, POOL } from './pool';

describe('the bundled pool', () => {
  it('loads the same snapshot the Expo app plays on', () => {
    expect(CATEGORY.id).toBe('wikipedia-popularity');
    expect(POOL.length).toBeGreaterThanOrEqual(20);
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
