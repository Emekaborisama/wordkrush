import { describe, expect, it } from 'vitest';
import { bezierPoint, rideSamples } from './rideMath';

const from = { x: 100, y: 150 };
const c1 = { x: 160, y: 110 };
const c2 = { x: 240, y: 190 };
const to = { x: 300, y: 150 };

describe('the walk between levels', () => {
  it('starts on the cleared stone and ends on the next one', () => {
    expect(bezierPoint(from, c1, c2, to, 0)).toEqual(from);
    expect(bezierPoint(from, c1, c2, to, 1)).toEqual(to);
  });

  it('samples evenly in time, always moving forward along the path', () => {
    const samples = rideSamples(from, c1, c2, to, 12);
    expect(samples).toHaveLength(13);
    expect(samples[0].t).toBe(0);
    expect(samples.at(-1)?.t).toBe(1);
    for (let i = 1; i < samples.length; i += 1) expect(samples[i].x).toBeGreaterThan(samples[i - 1].x);
  });

  it('rises over the first bend and dips through the second, as the drawn path does', () => {
    expect(bezierPoint(from, c1, c2, to, 0.25).y).toBeLessThan(150);
    expect(bezierPoint(from, c1, c2, to, 0.75).y).toBeGreaterThan(150);
  });
});
