import { describe, expect, it } from 'vitest';
import {
  CENTER_STAR_SCALE,
  CONFETTI_CAP,
  OUTLINE_OFFSETS,
  RAY_COUNT,
  STAR_OUTLINE_OFFSETS,
  clampParticleCount,
  rayAngleDeg,
  starLabel,
  starScale,
  staggerDelay,
} from './motion';

describe('display outline', () => {
  it('draws a thick ring of offset copies and no zero offset', () => {
    expect(OUTLINE_OFFSETS).toHaveLength(12);
    expect(OUTLINE_OFFSETS).not.toContainEqual([0, 0]);
    expect(OUTLINE_OFFSETS).toContainEqual([0, 3]);
    expect(OUTLINE_OFFSETS).toContainEqual([-2, -2]);
  });

  it('keeps the star outline tighter than the title outline', () => {
    for (const [x, y] of STAR_OUTLINE_OFFSETS) {
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
    }
  });
});

describe('stars', () => {
  it('makes only the centre star larger', () => {
    expect(starScale(0)).toBe(1);
    expect(starScale(1)).toBe(CENTER_STAR_SCALE);
    expect(starScale(2)).toBe(1);
  });

  it('names how many of the three are earned', () => {
    expect(starLabel(0)).toBe('0 of 3 stars');
    expect(starLabel(2)).toBe('2 of 3 stars');
    expect(starLabel(3)).toBe('3 of 3 stars');
    expect(starLabel(9)).toBe('3 of 3 stars');
  });

  it('staggers each star by a fixed step', () => {
    expect(staggerDelay(0, 140)).toBe(0);
    expect(staggerDelay(1, 140)).toBe(140);
    expect(staggerDelay(2, 140)).toBe(280);
  });
});

describe('rays and confetti', () => {
  it('spaces twelve wedges evenly around the circle', () => {
    expect(rayAngleDeg(0)).toBe(0);
    expect(rayAngleDeg(1)).toBe(30);
    expect(rayAngleDeg(RAY_COUNT - 1)).toBe(330);
  });

  it('never builds more than 24 particles', () => {
    expect(clampParticleCount(14)).toBe(14);
    expect(clampParticleCount(24)).toBe(24);
    expect(clampParticleCount(80)).toBe(CONFETTI_CAP);
    expect(clampParticleCount(Number.NaN)).toBe(0);
    expect(clampParticleCount(-3)).toBe(0);
  });
});
