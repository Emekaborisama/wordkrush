import { describe, expect, it } from 'vitest';
import { labelCategory } from './labelCategories';
import { LAGOS_PATH, labelLevel, labelPath, WORLD_PATH } from './labelPaths';

describe.each([
  ['world', WORLD_PATH],
  ['lagos', LAGOS_PATH],
] as const)('%s path', (id, levels) => {
  it('numbers its levels 1..n in order', () => {
    expect(levels.map((level) => level.number)).toEqual(levels.map((_, index) => index + 1));
    expect(labelPath(id)).toBe(levels);
    expect(labelLevel(id, 1)).toBe(levels[0]);
    expect(labelLevel(id, levels.length + 1)).toBeUndefined();
  });

  it('plays a bundled, measured category on every level', () => {
    for (const level of levels) {
      const category = labelCategory(level.categoryId);
      expect(category, level.categoryId).toBeDefined();
      expect(category!.metricLabel).toBe('monthly Wikipedia pageviews');
      expect(category!.items.length, level.categoryId).toBeGreaterThanOrEqual(20);
    }
  });

  it('never repeats a label on one path', () => {
    expect(new Set(levels.map((level) => level.categoryId)).size).toBe(levels.length);
  });

  it('asks for a target the label can reach', () => {
    for (const level of levels) {
      expect(level.targetStreak).toBeGreaterThan(0);
      expect(level.targetStreak).toBeLessThan(labelCategory(level.categoryId)!.items.length);
    }
  });
});

describe('Lagos route', () => {
  it('names every level after a danfo stop, once', () => {
    const stops = LAGOS_PATH.map((level) => level.stop);
    expect(stops.every((stop) => typeof stop === 'string' && stop.length > 0)).toBe(true);
    expect(new Set(stops).size).toBe(stops.length);
  });

  it('only plays Lagos labels', () => {
    for (const level of LAGOS_PATH) expect(level.categoryId.startsWith('lagos-')).toBe(true);
  });
});
