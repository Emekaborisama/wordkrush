import { describe, expect, it } from 'vitest';
import { meadowLayout, trailPathD, trailWindow, type Stone } from './levelTrail';

const stones = (n: number, current: number): Stone[] =>
  Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    state: i + 1 < current ? 'cleared' : i + 1 === current ? 'current' : 'locked',
  }));

describe('trailWindow', () => {
  it('centres the current level', () => {
    expect(trailWindow(stones(12, 6), 6).map((s) => s.number)).toEqual([4, 5, 6, 7, 8]);
  });

  it('pins to the ends instead of leaving gaps', () => {
    expect(trailWindow(stones(12, 1), 1).map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
    expect(trailWindow(stones(12, 12), 12).map((s) => s.number)).toEqual([8, 9, 10, 11, 12]);
    expect(trailWindow(stones(3, 2), 2).map((s) => s.number)).toEqual([1, 2, 3]);
  });
});

describe('meadowLayout', () => {
  it('puts level 1 at the bottom and climbs one spacing per level', () => {
    const { height, points } = meadowLayout(4, 360, 100);
    expect(height).toBe(550);
    expect(points[0].y).toBeGreaterThan(points[1].y);
    expect(points[0].y - points[1].y).toBe(100);
    for (const p of points) expect(p.x).toBeGreaterThanOrEqual(0);
    for (const p of points) expect(p.x).toBeLessThanOrEqual(360);
  });
});

describe('trailPathD', () => {
  it('starts at the first stone and ends at the last', () => {
    const d = trailPathD([
      { x: 10, y: 100 },
      { x: 50, y: 50 },
      { x: 20, y: 0 },
    ]);
    expect(d.startsWith('M10 100')).toBe(true);
    expect(d.endsWith(' 20 0')).toBe(true);
    expect(trailPathD([])).toBe('');
  });
});
